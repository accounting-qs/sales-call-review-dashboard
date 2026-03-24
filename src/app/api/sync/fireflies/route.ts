import { NextResponse } from "next/server";
import { fetchTranscripts } from "@/lib/services/fireflies";

export const maxDuration = 120; // Allow up to 2 minutes for large accounts

export async function GET() {
    try {
        // Fetch ALL transcripts via pagination (no limit cap)
        const transcripts = await fetchTranscripts(50); // 50 per page, paginated
        return NextResponse.json(transcripts);
    } catch (error: any) {
        console.error("API Error [Sync Fireflies]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
