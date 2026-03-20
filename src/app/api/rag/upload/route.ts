import { NextRequest, NextResponse } from 'next/server';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getStorage as getAdminStorage } from 'firebase-admin/storage';

export const maxDuration = 60;

// Initialize firebase-admin for server-side Storage access
function getStorageBucket() {
    if (getApps().length === 0) {
        initializeApp({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        });
    }
    return getAdminStorage().bucket();
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        
        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) {
            return NextResponse.json({ error: 'Server misconfiguration. GEMINI_API_KEY missing.' }, { status: 500 });
        }

        const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);

        // Convert file to temporary local file
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const tempPath = join(tmpdir(), `${Date.now()}-${safeName}`);
        await writeFile(tempPath, buffer);

        // 1. Upload to Gemini File API
        const uploadResult = await fileManager.uploadFile(tempPath, {
            mimeType: file.type || 'application/pdf',
            displayName: file.name,
        });
        const returnedFile = uploadResult.file;

        // 2. Save a permanent backup copy to Firebase Storage
        let storagePath = '';
        try {
            storagePath = `rag_documents/${safeName}`;
            const bucket = getStorageBucket();
            await bucket.upload(tempPath, {
                destination: storagePath,
                metadata: {
                    contentType: file.type || 'application/pdf',
                    metadata: {
                        originalName: file.name,
                        uploadedAt: new Date().toISOString(),
                    }
                }
            });
            console.log(`[RAG Upload] Backed up to Firebase Storage: ${storagePath}`);
        } catch (storageErr: any) {
            console.warn('[RAG Upload] Firebase Storage backup failed (non-blocking):', storageErr.message);
            storagePath = ''; // Non-critical, continue without backup
        }

        // 3. Cleanup temp file
        try { await unlink(tempPath); } catch {}

        return NextResponse.json({ 
            file: {
                name: returnedFile.name,
                displayName: returnedFile.displayName,
                mimeType: returnedFile.mimeType,
                sizeBytes: returnedFile.sizeBytes,
                uri: returnedFile.uri,
                state: returnedFile.state,
                createTime: returnedFile.createTime,
                expirationTime: (returnedFile as any).expirationTime || null,
            },
            storagePath
        });

    } catch (error: any) {
        console.error('API Error /rag/upload:', error);
        return NextResponse.json({ error: error.message || 'Failed to upload document' }, { status: 500 });
    }
}
