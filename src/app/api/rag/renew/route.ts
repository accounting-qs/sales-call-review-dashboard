import { NextRequest, NextResponse } from 'next/server';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export const maxDuration = 120;

/**
 * POST /api/rag/renew
 * Re-uploads a document to Gemini File API from the base64 backup stored in Firestore,
 * then updates the Firestore knowledge_base record with fresh Gemini file data.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { docId } = body;

        if (!docId) {
            return NextResponse.json({ error: 'Missing docId' }, { status: 400 });
        }

        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) {
            return NextResponse.json({ error: 'GEMINI_API_KEY missing' }, { status: 500 });
        }

        // 1. Read the document from Firestore (includes base64 backup)
        const docRef = doc(db, 'knowledge_base', docId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return NextResponse.json({ error: 'Document not found in knowledge_base' }, { status: 404 });
        }

        const data = docSnap.data();
        const fileBase64 = data.fileBase64;

        if (!fileBase64) {
            return NextResponse.json({ 
                error: 'No backup data found for this document. Please re-upload the file manually.',
                code: 'NO_BACKUP'
            }, { status: 404 });
        }

        const fileName = data.name || 'document.pdf';
        const mimeType = data.mimeType || 'application/pdf';

        console.log(`[RAG Renew] Renewing "${fileName}" from Firestore backup...`);

        // 2. Write base64 to temp file
        const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const tempPath = join(tmpdir(), `renew-${Date.now()}-${safeName}`);
        const buffer = Buffer.from(fileBase64, 'base64');
        await writeFile(tempPath, buffer);

        // 3. Re-upload to Gemini File API
        const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);
        const uploadResult = await fileManager.uploadFile(tempPath, {
            mimeType,
            displayName: fileName,
        });
        const geminiFile = uploadResult.file;

        // 4. Update Firestore knowledge_base document with new Gemini references
        await updateDoc(docRef, {
            geminiFileId: geminiFile.name,
            geminiFileUri: geminiFile.uri,
            status: geminiFile.state === 'PROCESSING' ? 'Indexing...' : 'Active',
            expiresAt: (geminiFile as any).expirationTime || null,
            lastRenewedAt: new Date().toISOString(),
        });

        // 5. Cleanup temp
        try { await unlink(tempPath); } catch {}

        console.log(`[RAG Renew] ✅ Renewed "${fileName}" → ${geminiFile.name}`);

        return NextResponse.json({ 
            success: true,
            file: {
                name: geminiFile.name,
                uri: geminiFile.uri,
                state: geminiFile.state,
                expirationTime: (geminiFile as any).expirationTime || null,
            }
        });

    } catch (error: any) {
        console.error('API Error /rag/renew:', error);
        return NextResponse.json({ error: error.message || 'Failed to renew document' }, { status: 500 });
    }
}
