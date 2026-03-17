import { NextRequest, NextResponse } from 'next/server';
import { processLatestCalls, processSingleCallById } from '@/lib/services/orchestrator';

export const maxDuration = 120; // Allow 2 mins for standard processing

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { callId } = body;

        if (callId) {
            await processSingleCallById(callId, 'evaluation'); // Default to evaluation for QA testing
        } else {
            await processLatestCalls();
        }

        return NextResponse.json({ 
            success: true, 
            message: callId ? `Successfully synced and analyzed call ${callId}` : `Successfully ran cron sync on latest calls` 
        });
    } catch (error: any) {
        console.error('API Error /qa/sync:', error);
        return NextResponse.json({ error: error.message || 'Failed to complete sync task' }, { status: 500 });
    }
}
