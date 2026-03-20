import { Call, CallType, Analysis } from "@/types";
import { db } from "../firebase";
import { collection, query, where, getDocs, Timestamp, getDoc, doc } from "firebase/firestore";
import { getPromptSettings } from "./promptSettings";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-pro";

export async function analyzeSalesCall(
    transcript: string,
    metadata: Partial<Call>,
    callType: CallType
): Promise<Partial<Analysis>> {
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");

    // 0. Fetch the dynamic model selection from DB
    let selectedModel = DEFAULT_MODEL;
    try {
        const pipelineSnap = await getDoc(doc(db, 'settings', 'fireflies_pipeline'));
        if (pipelineSnap.exists() && pipelineSnap.data().aiModel) {
            selectedModel = pipelineSnap.data().aiModel;
        }
    } catch (err) {
        console.warn('Could not fetch dynamic model from settings. Using default.', err);
    }

    // 1. Fetch relevant reference docs filtered by call type
    // Use the call-type-specific field: useInCall1 for evaluation, useInCall2 for followup
    const callField = callType === 'evaluation' ? 'useInCall1' : 'useInCall2';
    const q = query(collection(db, 'knowledge_base'), where(callField, '==', true));
    const docsSnapshot = await getDocs(q);
    const selectedFileParts: any[] = [];
    const selectedDocNames: string[] = [];

    // Also fetch legacy docs that only have `isActive` (backward compat)
    const legacyQ = query(collection(db, 'knowledge_base'), where('isActive', '==', true));
    const legacySnapshot = await getDocs(legacyQ);
    const seenIds = new Set<string>();
    
    // Helper to add a doc if it has valid file data
    const addDoc = (d: any) => {
        if (seenIds.has(d.id)) return;
        const data = d.data();
        if (data.geminiFileUri && data.mimeType) {
            seenIds.add(d.id);
            selectedDocNames.push(data.name);
            selectedFileParts.push({
                fileData: {
                    mimeType: data.mimeType,
                    fileUri: data.geminiFileUri
                }
            });
        }
    };

    docsSnapshot.docs.forEach(addDoc);
    // Include legacy docs that don't have the new fields yet
    legacySnapshot.docs.forEach(d => {
        const data = d.data();
        if (data[callField] === undefined && data.isActive === true) {
            addDoc(d);
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

        # REFERENCE DOCUMENTS ATTACHED (${selectedDocNames.length} documents)
        The following ${selectedDocNames.length} documents have been specifically selected for this ${callTypeLabel} analysis and are attached as file data alongside this prompt. They represent our canonical frameworks for this call type.
        You MUST strictly reference these documents and use them as your primary scoring rubric:
        ${selectedDocNames.map((name, i) => `${i + 1}. "${name}"`).join('\n        ')}

        ${selectedDocNames.length === 0 ? '⚠️ WARNING: No reference documents were provided for this call type. Score using the system prompt instructions only.' : ''}

        # CALL INFORMATION
        **Call Type:** ${callTypeLabel}
        **Call ID:** ${metadata.id}
        **Call Title:** ${metadata.title}
        **Date:** ${metadata.date instanceof Timestamp ? metadata.date.toDate().toLocaleDateString() : 'Unknown'}
        **Sales Rep:** ${metadata.repName} (${metadata.repEmail})
        **Prospect:** ${metadata.prospectName}

        ---
        # FULL TRANSCRIPT
        ${transcript}
    `;

    // Direct API call to support file_search tool
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${GEMINI_API_KEY}`;

    const body = {
        contents: [
            { 
                role: "user", 
                parts: [
                    ...selectedFileParts, // Inject ONLY the docs enabled for this call type
                    { text: systemPrompt + "\n\n" + userPromptContent }
                ] 
            }
        ]
    };

    console.log(`[Gemini] Starting ${callTypeLabel} analysis for "${metadata.title}" using ${selectedModel}...`);
    console.log(`[Gemini] Call type: ${callType} → Filtered by field: ${callField}`);
    console.log(`[Gemini] Injected ${selectedFileParts.length} documents: ${selectedDocNames.join(', ') || '(none)'}`);

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
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
