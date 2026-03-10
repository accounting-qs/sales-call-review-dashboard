import { Call, CallType, Analysis } from "@/types";
import { db } from "../firebase";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { getPromptSettings } from "./promptSettings";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const STORE_ID = process.env.GEMINI_FILE_SEARCH_STORE_ID;
const MODEL = process.env.GEMINI_MODEL || "gemini-1.5-pro";

export async function analyzeSalesCall(
    transcript: string,
    metadata: Partial<Call>,
    callType: CallType
): Promise<Partial<Analysis>> {
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");

    // 1. Fetch relevant reference docs
    const field = callType === 'evaluation' ? 'enabledForCall1' : 'enabledForCall2';
    const q = query(collection(db, 'knowledge'), where(field, '==', true));
    const docsSnapshot = await getDocs(q);
    const selectedDocs = docsSnapshot.docs.map(d => d.data().name);

    // 2. Fetch specific instructions (Prompts) from Firestore
    const promptSettings = await getPromptSettings();
    const systemPrompt = callType === 'evaluation'
        ? promptSettings.call1Prompt
        : promptSettings.call2Prompt;

    const userPromptContent = `
        # REFERENCE DOCUMENTS TO USE
        The following documents have been selected for this analysis from the RAG store. You MUST prioritize information from these specific sources:
        ${selectedDocs.length > 0 ? selectedDocs.map(d => `- ${d}`).join('\n') : 'No specific documents selected. Use general framework knowledge.'}

        # CALL INFORMATION
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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const body = {
        contents: [
            { role: "user", parts: [{ text: systemPrompt + "\n\n" + userPromptContent }] }
        ],
        tools: STORE_ID ? [{
            file_search: {
                file_search_store_names: [STORE_ID]
            }
        }] : []
    };

    console.log(`[Gemini] Starting analysis for ${metadata.title} using ${MODEL}...`);
    console.log(`[Gemini] Selected Docs: ${selectedDocs.join(', ') || 'None'}`);

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
