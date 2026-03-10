import { NextResponse } from "next/server";
import { fetchTranscripts } from "@/lib/services/fireflies";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get("limit") || "50");

        const transcripts = await fetchTranscripts(limit);
        return NextResponse.json(transcripts);
    } catch (error: any) {
        console.error("API Error [Sync Fireflies]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
