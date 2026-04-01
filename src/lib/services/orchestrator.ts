import { fetchTranscripts, getTranscriptDetails, formatTranscript } from "./fireflies";
import { analyzeSalesCall } from "./gemini";
import { sendClickUpNotification, formatClickUpMessage } from "./clickup";
import { prisma } from "../prisma";
import { Analysis } from "@/types";

export async function processLatestCalls() {
    console.log("[Orchestrator] Starting poll for new transcripts...");

    try {
        // Fetch Pipeline Settings from Prisma
        const settingObj = await prisma.setting.findUnique({ where: { key: "fireflies_pipeline" } });
        const settings = (settingObj?.value as any) || {
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

        const evalKeywords = settings.evaluationKeywords.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
        const followupKeywords = settings.followupKeywords.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
        const excludedKeywords = settings.excludedKeywords.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);

        for (const t of transcripts) {
            const title = (t.title || "").toLowerCase();

            // 1. Exclusion check
            if (excludedKeywords.some((k: string) => title.includes(k))) {
                console.log(`[Orchestrator] Skipping "${t.title}" (Excluded keyword match)`);
                continue;
            }

            // 2. Routing
            let callType: 'evaluation' | 'followup' | null = null;

            if (evalKeywords.some((k: string) => title.includes(k))) callType = 'evaluation';
            else if (followupKeywords.some((k: string) => title.includes(k))) callType = 'followup';
            else if (settings.defaultAgent !== 'none') callType = settings.defaultAgent as 'evaluation' | 'followup';

            if (!callType) {
                console.log(`[Orchestrator] Skipping "${t.title}" (No direct match and no default agent)`);
                continue;
            }

            // 3. Deduplication check using Prisma
            const alreadyProcessed = await checkIfExists(t.id);
            if (alreadyProcessed) {
                console.log(`[Orchestrator] Skipping "${t.title}" (Already processed)`);
                continue;
            }

            console.log(`[Orchestrator] Auto-Processing ${callType.toUpperCase()}: "${t.title}"`);
            await processSingleCall(t, callType);
        }

        // Save last synced timestamp
        const now = new Date().toISOString();
        const updatedSettings = { ...settings, lastSyncedAt: now };
        await prisma.setting.upsert({
            where: { key: "fireflies_pipeline" },
            update: { value: updatedSettings as any },
            create: { key: "fireflies_pipeline", value: updatedSettings as any }
        });
        console.log(`[Orchestrator] Finished polling. Last synced updated to ${now}`);
    } catch (error) {
        console.error("[Orchestrator] Fatal error in pipeline:", error);
    }
}

/**
 * Manually trigger analysis for a specific Fireflies transcript
 */
export async function processSingleCallById(firefliesId: string, forcedCallType: 'evaluation' | 'followup') {
    const alreadyProcessed = await checkIfExists(firefliesId);
    if (alreadyProcessed) throw new Error("Call already analyzed and synced in database");

    const fullTranscript = await getTranscriptDetails(firefliesId);
    if (!fullTranscript) throw new Error("Transcript not found in Fireflies");

    const t = {
        id: firefliesId,
        title: fullTranscript.title || "Untitled Call",
        date: fullTranscript.date,
        duration: fullTranscript.duration,
        host_email: fullTranscript.host_email || "unknown@quantum-scaling.com",
        organizer_email: fullTranscript.organizer_email || "prospect@unknown.com",
        transcript_url: fullTranscript.transcript_url || "" // map to transcriptUrl
    };

    return await processSingleCall(t, forcedCallType);
}

export async function processSingleCall(t: any, callType: 'evaluation' | 'followup') {
    // 3. Get Full Content
    const fullTranscript = await getTranscriptDetails(t.id);
    const formattedText = formatTranscript(fullTranscript);

    // Ensure rep exists in Postgres dynamically
    const repId = await ensureRepExists(t.host_email, t.title);

    // 4. Gemini/AI Analysis
    const callMetadata = {
        id: t.id,
        firefliesId: t.id,
        title: t.title,
        date: new Date(t.date),
        duration: Math.round(t.duration),
        repEmail: t.host_email,
        repName: t.host_email.split('@')[0],
        prospectName: t.organizer_email,
        transcriptUrl: t.transcript_url,
        type: callType, 
        status: 'analyzing'
    };

    // Note: AI integration handles Gemini internally right now. We'll update the gemini router later.
    const analysisResults = await analyzeSalesCall(formattedText, callMetadata as any, callType);
    const analysis = analysisResults as Analysis;

    // 5. Save everything to Prisma
    await saveAnalysisToPrisma(t, repId, callType, analysis);

    // 6. Notify ClickUp (Non-blocking)
    try {
        const settingObj = await prisma.setting.findUnique({ where: { key: "fireflies_pipeline" } });
        const settings = (settingObj?.value as any) || {};

        const clickUpMsg = formatClickUpMessage(
            callType,
            t.host_email,
            t.title,
            new Date(t.date).toLocaleDateString(),
            t.duration,
            `${process.env.NEXT_PUBLIC_APP_URL || 'https://sales-call-review-dashboard--sales-review-dashboard.us-east4.hosted.app'}/calls/${t.id}`,
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
    const call = await prisma.call.findUnique({
        where: { id: firefliesId },
        select: { status: true }
    });
    return (call?.status === 'completed');
}

async function ensureRepExists(email: string, title?: string): Promise<string | null> {
    if (!email) return null;
    
    let rep = await prisma.rep.findUnique({ where: { email } });
    if (!rep) {
        const rawName = email.split('@')[0];
        const name = rawName.charAt(0).toUpperCase() + rawName.slice(1);
        rep = await prisma.rep.create({
            data: {
                email,
                name
            }
        });
        console.log(`[Orchestrator] Auto-created new rep profile for ${email}`);
    }
    return rep.id;
}

async function saveAnalysisToPrisma(t: any, repId: string | null, callCategory: string, analysis: Analysis) {
    // We update or create the Call, and then create the unique Analysis
    
    await prisma.$transaction(async (tx) => {
        // 1. Upsert Call record
        await tx.call.upsert({
            where: { id: t.id },
            update: {
                status: 'completed',
                repId: repId || undefined,
                title: t.title || "Untitled",
                duration: t.duration,
                callCategory
            },
            create: {
                id: t.id,
                status: 'completed',
                repId: repId || undefined,
                title: t.title || "Untitled",
                date: new Date(t.date),
                duration: t.duration,
                prospectName: t.organizer_email,
                transcriptUrl: t.transcript_url,
                callCategory
            }
        });

        // 2. Upsert Analysis record
        await tx.analysis.upsert({
            where: { callId: t.id },
            update: {
                callType: callCategory,
                outcome: analysis.outcome || 'Analyzed',
                dealRisk: analysis.dealRisk || 'Unknown',
                scriptAlignment: analysis.scriptAlignment || 'Unknown',
                callAnalysis: analysis.callAnalysis || '',
                topCoachingPriorities: analysis.topCoachingPriorities || [],
                sections: analysis.sections as any,
                totalScore: analysis.totalScore || 0,
                leadSource: analysis.leadSource,
                miscellaneous: analysis.miscellaneous
            },
            create: {
                callId: t.id,
                callType: callCategory,
                outcome: analysis.outcome || 'Analyzed',
                dealRisk: analysis.dealRisk || 'Unknown',
                scriptAlignment: analysis.scriptAlignment || 'Unknown',
                callAnalysis: analysis.callAnalysis || '',
                topCoachingPriorities: analysis.topCoachingPriorities || [],
                sections: analysis.sections as any,
                totalScore: analysis.totalScore || 0,
                leadSource: analysis.leadSource,
                miscellaneous: analysis.miscellaneous
            }
        });
    });
}
