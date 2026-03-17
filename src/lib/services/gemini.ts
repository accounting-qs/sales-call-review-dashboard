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

    // 1. Fetch relevant reference docs
    const q = query(collection(db, 'knowledge_base'), where('isActive', '==', true));
    const docsSnapshot = await getDocs(q);
    const selectedFileParts: any[] = [];
    const selectedDocNames: string[] = [];
    
    docsSnapshot.docs.forEach(d => {
        const data = d.data();
        if (data.geminiFileUri && data.mimeType) {
            selectedDocNames.push(data.name);
            selectedFileParts.push({
                fileData: {
                    mimeType: data.mimeType,
                    fileUri: data.geminiFileUri
                }
            });
        }
    });

    // 2. Fetch specific instructions (Prompts) from Firestore
    const promptSettings = await getPromptSettings();
    const systemPrompt = callType === 'evaluation'
        ? promptSettings.call1Prompt
        : promptSettings.call2Prompt;

    const userPromptContent = `
        # REFERENCE DOCUMENTS TO USE
        Please strictly reference any internal documents or files provided in the data attachments alongside this prompt. They represent our canonical frameworks.
        Prioritize information from these specific sources: ${selectedDocNames.join(', ')}

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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${GEMINI_API_KEY}`;

    const body = {
        contents: [
            { 
                role: "user", 
                parts: [
                    ...selectedFileParts, // Inject PDF documents directly into the context window
                    { text: systemPrompt + "\n\n" + userPromptContent }
                ] 
            }
        ]
    };

    console.log(`[Gemini] Starting analysis for ${metadata.title} using ${selectedModel}...`);
    console.log(`[Gemini] Appended ${selectedFileParts.length} active documents to the context.`);

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
