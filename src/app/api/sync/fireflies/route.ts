import { NextResponse } from "next/server";
import { fetchTranscripts } from "@/lib/services/fireflies";

export const maxDuration = 120;

/**
 * GET /api/sync/fireflies
 * Fetches transcripts from Fireflies API and returns them.
 * Firestore persistence is handled client-side for speed.
 */
export async function GET() {
    try {
        const transcripts = await fetchTranscripts(50);
        return NextResponse.json(transcripts);
    } catch (error: any) {
        console.error("API Error [Sync Fireflies]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
