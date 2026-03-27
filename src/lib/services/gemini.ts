import { Call, CallType, Analysis } from "@/types";
import { db } from "../firebase";
import { collection, query, where, getDocs, Timestamp, getDoc, doc, updateDoc } from "firebase/firestore";
import { getPromptSettings } from "./promptSettings";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-pro";

/**
 * Auto-refresh a single RAG document if its Gemini file is expired.
 * Uses GoogleAIFileManager directly (server-side).
 * Returns the (possibly refreshed) fileUri, or null if renewal fails.
 */
async function ensureFreshGeminiUri(kbDocId: string, data: any): Promise<string | null> {
    const expires = data.expiresAt;
    const isExpired = !expires || new Date(expires).getTime() < Date.now();
    
    // If not expired, return current URI
    if (!isExpired && data.geminiFileUri) {
        return data.geminiFileUri;
    }

    // Expired — try to renew from base64 backup
    if (!data.fileBase64) {
        console.warn(`[Gemini] ⚠️ "${data.name}" is expired and has NO backup. Skipping.`);
        return null;
    }

    if (!GEMINI_API_KEY) return null;

    console.log(`[Gemini] 🔄 Auto-renewing expired RAG file "${data.name}"...`);

    try {
        const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);
        const fileName = data.name || 'document.pdf';
        const mimeType = data.mimeType || 'application/pdf';
        
        // Write base64 to temp file
        const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const tempPath = join(tmpdir(), `auto-renew-${Date.now()}-${safeName}`);
        const buffer = Buffer.from(data.fileBase64, 'base64');
        await writeFile(tempPath, buffer);

        // Delete old file from Gemini (ignore errors — may already be gone)
        if (data.geminiFileId) {
            try { await fileManager.deleteFile(data.geminiFileId); } catch {}
        }

        // Upload fresh copy
        const uploadResult = await fileManager.uploadFile(tempPath, {
            mimeType,
            displayName: fileName,
        });
        const newFile = uploadResult.file;

        // Update Firestore with fresh references
        await updateDoc(doc(db, 'knowledge_base', kbDocId), {
            geminiFileId: newFile.name,
            geminiFileUri: newFile.uri,
            status: newFile.state === 'PROCESSING' ? 'Indexing...' : 'Active',
            expiresAt: (newFile as any).expirationTime || null,
            lastRenewedAt: new Date().toISOString(),
        });

        // Cleanup temp
        try { await unlink(tempPath); } catch {}

        console.log(`[Gemini] ✅ Renewed "${fileName}" → ${newFile.uri}`);
        return newFile.uri;
    } catch (err: any) {
        console.error(`[Gemini] ❌ Renewal error for "${data.name}":`, err.message);
        return null;
    }
}

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
    const callField = callType === 'evaluation' ? 'useInCall1' : 'useInCall2';
    const q = query(collection(db, 'knowledge_base'), where(callField, '==', true));
    const docsSnapshot = await getDocs(q);
    const selectedFileParts: any[] = [];
    const selectedDocNames: string[] = [];

    // Also fetch legacy docs that only have `isActive` (backward compat)
    const legacyQ = query(collection(db, 'knowledge_base'), where('isActive', '==', true));
    const legacySnapshot = await getDocs(legacyQ);
    const seenIds = new Set<string>();
    
    // Helper to add a doc — auto-refreshes expired Gemini URIs from backup
    const addDoc = async (d: any) => {
        if (seenIds.has(d.id)) return;
        const data = d.data();
        if (!data.mimeType) return;

        seenIds.add(d.id);
        const freshUri = await ensureFreshGeminiUri(d.id, data);
        
        if (freshUri) {
            selectedDocNames.push(data.name);
            selectedFileParts.push({
                fileData: {
                    mimeType: data.mimeType,
                    fileUri: freshUri
                }
            });
        }
    };

    // Process docs (await each for sequential refresh to avoid rate limits)
    for (const d of docsSnapshot.docs) {
        await addDoc(d);
    }
    for (const d of legacySnapshot.docs) {
        const data = d.data();
        if (data[callField] === undefined && data.isActive === true) {
            await addDoc(d);
        }
    }

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

    console.log(`[Gemini] Starting ${callTypeLabel} analysis for "${metadata.title}" using ${selectedModel}...`);
    console.log(`[Gemini] Call type: ${callType} → Filtered by field: ${callField}`);
    console.log(`[Gemini] Injected ${selectedFileParts.length} documents: ${selectedDocNames.join(', ') || '(none)'}`);

    // First attempt: with RAG file attachments
    const bodyWithDocs = {
        contents: [{
            role: "user",
            parts: [
                ...selectedFileParts,
                { text: systemPrompt + "\n\n" + userPromptContent }
            ]
        }]
    };

    let response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyWithDocs)
    });

    let result = await response.json();

    // If RAG files are expired, retry WITHOUT file attachments
    if (result.error && selectedFileParts.length > 0 &&
        (result.error.message?.includes('permission') || result.error.message?.includes('not exist'))) {
        console.warn(`[Gemini] ⚠️ RAG files expired or inaccessible. Retrying without file attachments...`);
        console.warn(`[Gemini] Original error: ${result.error.message}`);

        const bodyWithoutDocs = {
            contents: [{
                role: "user",
                parts: [
                    { text: systemPrompt + "\n\n" + userPromptContent }
                ]
            }]
        };

        response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyWithoutDocs)
        });

        result = await response.json();
    }

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
