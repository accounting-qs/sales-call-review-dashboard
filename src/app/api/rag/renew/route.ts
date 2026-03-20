import { NextRequest, NextResponse } from 'next/server';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getStorage as getAdminStorage } from 'firebase-admin/storage';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export const maxDuration = 120;

function getStorageBucket() {
    if (getApps().length === 0) {
        initializeApp({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        });
    }
    return getAdminStorage().bucket();
}

/**
 * POST /api/rag/renew
 * Re-uploads a document from Firebase Storage to Gemini File API,
 * then updates the Firestore knowledge_base record with fresh Gemini file data.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { docId, storagePath, fileName, mimeType } = body;

        if (!docId || !storagePath) {
            return NextResponse.json({ error: 'Missing docId or storagePath' }, { status: 400 });
        }

        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) {
            return NextResponse.json({ error: 'GEMINI_API_KEY missing' }, { status: 500 });
        }

        console.log(`[RAG Renew] Renewing "${fileName}" from Storage path: ${storagePath}`);

        // 1. Download from Firebase Storage to temp file
        const bucket = getStorageBucket();
        const file = bucket.file(storagePath);
        const [exists] = await file.exists();

        if (!exists) {
            return NextResponse.json({ 
                error: 'File not found in Firebase Storage. Manual re-upload required.',
                code: 'STORAGE_NOT_FOUND'
            }, { status: 404 });
        }

        const safeName = (fileName || 'document.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
        const tempPath = join(tmpdir(), `renew-${Date.now()}-${safeName}`);
        await file.download({ destination: tempPath });

        // 2. Re-upload to Gemini File API
        const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);
        const uploadResult = await fileManager.uploadFile(tempPath, {
            mimeType: mimeType || 'application/pdf',
            displayName: fileName || 'document.pdf',
        });
        const geminiFile = uploadResult.file;

        // 3. Update Firestore knowledge_base document with new Gemini references
        const docRef = doc(db, 'knowledge_base', docId);
        await updateDoc(docRef, {
            geminiFileId: geminiFile.name,
            geminiFileUri: geminiFile.uri,
            status: geminiFile.state === 'PROCESSING' ? 'Indexing...' : 'Active',
            expiresAt: (geminiFile as any).expirationTime || null,
            lastRenewedAt: new Date().toISOString(),
        });

        // 4. Cleanup temp
        try { await unlink(tempPath); } catch {}

        console.log(`[RAG Renew] Successfully renewed "${fileName}". New file: ${geminiFile.name}, expires: ${(geminiFile as any).expirationTime}`);

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
