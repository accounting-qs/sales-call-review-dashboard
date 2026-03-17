import { NextRequest, NextResponse } from 'next/server';
import { analyzeSalesCall } from '@/lib/services/gemini';
import { Timestamp } from 'firebase/firestore';

export const maxDuration = 60; // 1 min timeout

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { prompt } = body;

        if (!prompt) {
            return NextResponse.json({ error: 'Missing transcript snippet prompt' }, { status: 400 });
        }

        const mockMetadata = {
            id: "qa-test-123",
            title: "QA AI System Test",
            date: Timestamp.now(),
            repName: "Test Rep",
            repEmail: "test@quantum-scaling.com",
            prospectName: "Dr. QA Tester"
        };

        const analysis = await analyzeSalesCall(prompt, mockMetadata, 'evaluation');

        return NextResponse.json({ 
            success: true, 
            analysis,
            message: `Successfully generated ${Object.keys(analysis).length} analytics variables.` 
        });
    } catch (error: any) {
        console.error('API Error /qa/ai:', error);
        return NextResponse.json({ error: error.message || 'Failed to complete AI Test Action' }, { status: 500 });
    }
}
