import { NextResponse } from "next/server";
import { processSingleCallById } from "@/lib/services/orchestrator";

export async function POST(request: Request) {
    console.log("[API Analyze] POST request received");
    try {
        const body = await request.json();
        const { firefliesId, callType } = body;
        console.log(`[API Analyze] Params: firefliesId=${firefliesId}, callType=${callType}`);

        if (!firefliesId || !callType) {
            console.error("[API Analyze] Missing firefliesId or callType");
            return NextResponse.json({ error: "Missing firefliesId or callType" }, { status: 400 });
        }

        console.log(`[API Analyze] Calling processSingleCallById...`);
        const result = await processSingleCallById(firefliesId, callType);
        console.log("[API Analyze] processSingleCallById success:", result);

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("API Error [Manual Analyze]:", error);
        // Provide more detail in the 500 response
        return NextResponse.json({
            error: error.message,
            stack: error.stack,
            details: "Check server console for full logs"
        }, { status: 500 });
    }
}
