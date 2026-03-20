import { NextRequest, NextResponse } from 'next/server';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { writeFile, readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

export const maxDuration = 60;

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

        // Convert file to temporary local file because fileManager.uploadFile requires a local path
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

        // 2. Store the raw file as base64 in Firestore for permanent backup
        //    (Firebase Storage via admin SDK causes build failures on App Hosting,
        //     so we store as base64 in the Firestore doc instead)
        let fileBase64 = '';
        try {
            const fileData = await readFile(tempPath);
            fileBase64 = fileData.toString('base64');
        } catch (err) {
            console.warn('[RAG Upload] Could not read file for backup:', err);
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
            fileBase64, // Returned to client to store in Firestore
        });

    } catch (error: any) {
        console.error('API Error /rag/upload:', error);
        return NextResponse.json({ error: error.message || 'Failed to upload document' }, { status: 500 });
    }
}
