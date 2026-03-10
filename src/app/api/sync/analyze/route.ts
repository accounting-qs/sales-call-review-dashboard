import { NextResponse } from "next/server";
import { processSingleCallById } from "@/lib/services/orchestrator";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { firefliesId, callType } = body;

        if (!firefliesId || !callType) {
            return NextResponse.json({ error: "Missing firefliesId or callType" }, { status: 400 });
        }

        console.log(`[API Analyze] Manually triggering ${callType} analysis for ${firefliesId}...`);
        const result = await processSingleCallById(firefliesId, callType);

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("API Error [Manual Analyze]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
