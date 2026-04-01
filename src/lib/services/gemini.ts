import { Call, CallType, Analysis } from "@/types";
import { Timestamp } from "firebase/firestore";
import { getPromptSettings } from "./promptSettings";
import { prisma } from "@/lib/prisma";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-pro";

// We keep a lightweight Firebase connection only to read prompt settings from the 'settings' collection for backward compatibility,
// since we haven't ported the dynamic "settings" table fully in this phase yet. Unchanged setting fetching.
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export async function analyzeSalesCall(
    transcript: string,
    metadata: Partial<Call>,
    callType: CallType
): Promise<Partial<Analysis>> {
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");

    // 0. Fetch the dynamic model selection from Settings
    let selectedModel = DEFAULT_MODEL;
    try {
        const pipelineSnap = await getDoc(doc(db, 'settings', 'fireflies_pipeline'));
        if (pipelineSnap.exists() && pipelineSnap.data().aiModel) {
            selectedModel = pipelineSnap.data().aiModel;
        }
    } catch (err) {
        console.warn('Could not fetch dynamic model from settings. Using default.', err);
    }

    // 1. Fetch relevant reference docs from PostgreSQL natively (No more Gemini File API)
    const callField = callType === 'evaluation' ? 'useInCall1' : 'useInCall2';
    
    // Fetch active KnowledgeDocuments matched to this call type
    const docs = await prisma.knowledgeDocument.findMany({
        where: {
            isActive: true,
            [callField]: true
        }
    });

    const selectedDocNames: string[] = [];
    const contextRubrics: string[] = [];

    docs.forEach(d => {
        if (d.extractedText) {
            selectedDocNames.push(d.name);
            contextRubrics.push(`--- DOCUMENT: ${d.name} ---\n${d.extractedText}\n`);
        }
    });

    // 2. Fetch specific instructions (Prompts) from Firestore 
    const promptSettings = await getPromptSettings();
    const systemPrompt = callType === 'evaluation'
        ? promptSettings.call1Prompt
        : promptSettings.call2Prompt;

    const callTypeLabel = callType === 'evaluation' ? 'CALL 1 (Business Evaluation)' : 'CALL 2 (Follow-Up)';

    const userPromptContent = `
        # ANALYSIS TYPE: ${callTypeLabel}
        You are analyzing a ${callTypeLabel} transcript. Apply ONLY the ${callTypeLabel} scoring framework.

        # REFERENCE DOCUMENTS / RUBRICS ATTACHED (${selectedDocNames.length} documents)
        The following frameworks have been provided as context text. You MUST strictly reference these documents and use them as your primary scoring rubric:
        ${selectedDocNames.map((name, i) => `${i + 1}. "${name}"`).join('\n        ')}

        ${contextRubrics.length > 0 ? contextRubrics.join("\n") : '⚠️ WARNING: No reference documents were provided for this call type. Score using the system prompt instructions only.'}

        # CALL INFORMATION
        **Call Type:** ${callTypeLabel}
        **Call ID:** ${metadata.id}
        **Call Title:** ${metadata.title}
        **Date:** ${metadata.date ? new Date((metadata.date as any).toDate ? (metadata.date as any).toDate() : metadata.date as any).toLocaleDateString() : 'Unknown'}
        **Sales Rep:** ${metadata.repName || 'Unknown'} (${metadata.repEmail || 'Unknown'})
        **Prospect:** ${metadata.prospectName || 'Unknown'}

        ---
        # FULL TRANSCRIPT
        ${transcript}
    `;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${GEMINI_API_KEY}`;

    console.log(`[Gemini/Postgres] Starting ${callTypeLabel} analysis for "${metadata.title}" using ${selectedModel}...`);
    console.log(`[Gemini/Postgres] Injected ${docs.length} native Postgres documents as text rubric context: ${selectedDocNames.join(', ') || '(none)'}`);

    const bodyWithDocs = {
        contents: [{
            role: "user",
            parts: [
                { text: systemPrompt + "\n\n" + userPromptContent }
            ]
        }]
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyWithDocs)
    });

    const result = await response.json();

    if (result.error) {
        throw new Error(`Gemini API error: ${result.error.message}`);
    }

    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
        throw new Error("Empty response from Gemini");
    }

    try {
        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || [null, responseText];
        const cleanedJson = jsonMatch[1]!.trim();
        const analysisData = JSON.parse(cleanedJson);

        return {
            ...analysisData,
            callId: metadata.id,
            repEmail: metadata.repEmail,
            analyzedAt: Timestamp.now(),
            callType
        };
    } catch (error) {
        console.error("Failed to parse Gemini response:", responseText, error);
        throw new Error("Analysis failed: Invalid JSON format from AI");
    }
}
