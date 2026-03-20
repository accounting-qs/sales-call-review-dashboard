import { NextResponse } from 'next/server';
import { GoogleAIFileManager } from '@google/generative-ai/server';

/**
 * GET /api/rag/status
 * Returns the current status and expiration info of all files in Gemini File API.
 */
export async function GET() {
    try {
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) {
            return NextResponse.json({ error: 'GEMINI_API_KEY missing' }, { status: 500 });
        }

        const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);
        const listResult = await fileManager.listFiles();
        const files = listResult.files || [];

        const fileStatuses = files.map((f: any) => ({
            name: f.name,            // e.g. 'files/abc123'
            displayName: f.displayName,
            state: f.state,
            mimeType: f.mimeType,
            sizeBytes: f.sizeBytes,
            uri: f.uri,
            createTime: f.createTime,
            expirationTime: f.expirationTime || null,
        }));

        return NextResponse.json({ files: fileStatuses });
    } catch (error: any) {
        console.error('API Error /rag/status:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
