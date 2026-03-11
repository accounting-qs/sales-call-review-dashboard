import { fetchTranscripts, getTranscriptDetails, formatTranscript } from "./fireflies";
import { analyzeSalesCall } from "./gemini";
import { sendClickUpNotification, formatClickUpMessage } from "./clickup";
import { db } from "../firebase";
import { collection, query, where, getDocs, getDoc, doc, setDoc, Timestamp } from "firebase/firestore";
import { Analysis, Call } from "@/types";

export async function processLatestCalls() {
    console.log("[Orchestrator] Starting poll for new transcripts...");

    try {
        // Fetch Pipeline Settings
        const settingsRef = doc(db, "settings", "fireflies_pipeline");
        const settingsSnap = await getDocs(query(collection(db, "settings"))); // Fallback check or direct getDoc

        // Actually safer to just use doc() and check exists
        const actualSettingsSnap = await getDoc(settingsRef);
        const settings = actualSettingsSnap.exists() ? actualSettingsSnap.data() : {
            autoAnalysis: false,
            evaluationKeywords: "Evaluation Call, Business Evaluation",
            followupKeywords: "Follow-up",
            excludedKeywords: "Test, Internal",
            defaultAgent: "none"
        };

        if (!settings.autoAnalysis) {
            console.log("[Orchestrator] Auto-Analysis is disabled in settings. Skipping.");
            return;
        }

        const transcripts = await fetchTranscripts(20);
        console.log(`[Orchestrator] Found ${transcripts.length} potential transcripts.`);

        const evalKeywords = settings.evaluationKeywords.split(',').map((s: string) => s.trim().toLowerCase()).filter((s: string) => s);
        const followupKeywords = settings.followupKeywords.split(',').map((s: string) => s.trim().toLowerCase()).filter((s: string) => s);
        const excludedKeywords = settings.excludedKeywords.split(',').map((s: string) => s.trim().toLowerCase()).filter((s: string) => s);

        for (const t of transcripts) {
            const title = (t.title || "").toLowerCase();

            // 1. Exclusion check
            if (excludedKeywords.some((k: string) => title.includes(k))) {
                console.log(`[Orchestrator] Skipping "${t.title}" (Excluded keyword match)`);
                continue;
            }

            // 2. Routing
            let callType: 'evaluation' | 'followup' | null = null;

            if (evalKeywords.some((k: string) => title.includes(k))) {
                callType = 'evaluation';
            } else if (followupKeywords.some((k: string) => title.includes(k))) {
                callType = 'followup';
            } else if (settings.defaultAgent !== 'none') {
                callType = settings.defaultAgent as 'evaluation' | 'followup';
            }

            if (!callType) {
                console.log(`[Orchestrator] Skipping "${t.title}" (No direct match and no default agent)`);
                continue;
            }

            // 3. Deduplication check (Fireflies ID)
            const alreadyProcessed = await checkIfExists(t.id);
            if (alreadyProcessed) {
                console.log(`[Orchestrator] Skipping "${t.title}" (Already processed)`);
                continue;
            }

            console.log(`[Orchestrator] Auto-Processing ${callType.toUpperCase()}: "${t.title}"`);
            await processSingleCall(t, callType);
        }
    } catch (error) {
        console.error("[Orchestrator] Fatal error in pipeline:", error);
    }
}

/**
 * Manually trigger analysis for a specific Fireflies transcript
 */
export async function processSingleCallById(firefliesId: string, forcedCallType: 'evaluation' | 'followup') {
    const fullTranscript = await getTranscriptDetails(firefliesId);
    if (!fullTranscript) throw new Error("Transcript not found in Fireflies");

    // Convert Fireflies transcript to our basic format
    const t = {
        id: firefliesId,
        title: fullTranscript.title || "Untitled Call",
        date: fullTranscript.date,
        duration: fullTranscript.duration,
        host_email: fullTranscript.host_email || "unknown@quantum-scaling.com",
        organizer_email: fullTranscript.organizer_email || "prospect@unknown.com",
        transcript_url: fullTranscript.transcript_url || ""
    };

    return await processSingleCall(t, forcedCallType);
}

export async function processSingleCall(t: any, callType: 'evaluation' | 'followup') {
    // 3. Get Full Content
    const fullTranscript = await getTranscriptDetails(t.id);
    const formattedText = formatTranscript(fullTranscript);

    // 4. Gemini Analysis
    const callMetadata: Partial<Call> = {
        id: t.id,
        firefliesId: t.id,
        title: t.title,
        date: Timestamp.fromMillis(t.date),
        duration: Math.round(t.duration),
        repName: t.host_email.split('@')[0],
        repEmail: t.host_email,
        prospectName: t.organizer_email,
        transcriptUrl: t.transcript_url,
        type: callType,
        status: 'analyzing'
    };

    const analysisResults = await analyzeSalesCall(formattedText, callMetadata, callType);
    const analysis = analysisResults as Analysis;

    // 5. Save to Firestore
    await saveAnalysisToFirestore(t, callMetadata, analysis);

    // 6. Notify ClickUp (Non-blocking but awaited)
    try {
        const settingsRef = doc(db, "settings", "fireflies_pipeline");
        const settingsSnap = await getDoc(settingsRef);
        const settings = settingsSnap.exists() ? settingsSnap.data() : {};

        const clickUpMsg = formatClickUpMessage(
            callType,
            t.host_email,
            t.title,
            new Date(t.date).toLocaleDateString(),
            t.duration,
            `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/calls/${t.id}`,
            t.transcript_url,
            analysis,
            settings.clickupTemplate
        );

        console.log(`[Orchestrator] Sending ClickUp notification for ${t.title}...`);
        await sendClickUpNotification(clickUpMsg, settings.clickupWebhook);
    } catch (clickupError) {
        console.error("[Orchestrator] ClickUp notification failed but analysis was saved:", clickupError);
    }

    console.log(`[Orchestrator] Successfully completed analysis for "${t.title}"`);
    return { callId: t.id, analysisId: t.id };
}

async function checkIfExists(firefliesId: string): Promise<boolean> {
    const q = query(collection(db, "calls"), where("firefliesId", "==", firefliesId));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
}

async function saveAnalysisToFirestore(t: any, metadata: any, analysis: Analysis) {
    const callId = t.id;

    // Save Call Record
    await setDoc(doc(db, "calls", callId), {
        ...metadata,
        firefliesId: t.id,
        duration: t.duration,
        status: 'completed',
        score: analysis.totalScore,
        outcome: analysis.outcome || 'Analyzed',
        createdAt: Timestamp.now(),
        analyzedAt: Timestamp.now()
    });

    // Save Analysis Record
    await setDoc(doc(db, "analyses", callId), {
        ...analysis,
        id: callId,
        callId: callId,
        analyzedAt: Timestamp.now()
    });
}
