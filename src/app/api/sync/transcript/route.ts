import { NextResponse } from "next/server";
import { getTranscriptDetails } from "@/lib/services/fireflies";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Missing transcript ID" }, { status: 400 });
        }

        const details = await getTranscriptDetails(id);
        return NextResponse.json(details);
    } catch (error: any) {
        console.error("API Error [Transcript Details]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
