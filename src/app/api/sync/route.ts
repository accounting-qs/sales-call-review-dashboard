import { NextResponse } from 'next/server';
import { processLatestCalls } from '@/lib/services/orchestrator';

export async function GET() {
    try {
        // This will run the orchestrator in the background for local dev
        // In production, you'd use a CRON job or a long-running worker
        processLatestCalls();

        return NextResponse.json({
            message: 'Sync process started in background. Check server logs for progress.'
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
