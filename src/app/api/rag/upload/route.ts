import { NextRequest, NextResponse } from 'next/server';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

export const maxDuration = 60; // Allow more time for large file uploads if hosted on Vercel

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
        const tempPath = join(tmpdir(), `${Date.now()}-${file.name}`);
        await writeFile(tempPath, buffer);

        // Upload to Gemini
        const uploadResult = await fileManager.uploadFile(tempPath, {
            mimeType: file.type || 'application/pdf',
            displayName: file.name,
        });

        // The uploaded file representation
        const returnedFile = uploadResult.file;

        return NextResponse.json({ 
            file: {
                name: returnedFile.name, // The ID like 'files/8a9x8y'
                displayName: returnedFile.displayName,
                mimeType: returnedFile.mimeType,
                sizeBytes: returnedFile.sizeBytes,
                uri: returnedFile.uri,
                state: returnedFile.state,
                createTime: returnedFile.createTime
            } 
        });

    } catch (error: any) {
        console.error('API Error /rag/upload:', error);
        return NextResponse.json({ error: error.message || 'Failed to upload document' }, { status: 500 });
    }
}
