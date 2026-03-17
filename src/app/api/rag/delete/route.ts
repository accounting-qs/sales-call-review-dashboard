import { NextRequest, NextResponse } from 'next/server';
import { GoogleAIFileManager } from '@google/generative-ai/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { fileName } = body; // This is the ID format 'files/8a9x8y' returned by Gemini

        if (!fileName) {
            return NextResponse.json({ error: 'Missing fileName parameter' }, { status: 400 });
        }

        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) {
            return NextResponse.json({ error: 'Server misconfiguration. GEMINI_API_KEY missing.' }, { status: 500 });
        }

        const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);

        // Delete from Gemini storage
        await fileManager.deleteFile(fileName);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('API Error /rag/delete:', error);
        return NextResponse.json({ error: error.message || 'Failed to delete document from Gemini' }, { status: 500 });
    }
}
