import { NextResponse } from "next/server";
import { syncAndPersistCalls } from "@/lib/services/syncCalls";

export const maxDuration = 120; // Allow up to 2 minutes for large accounts

/**
 * GET /api/sync/fireflies
 * Fetches ALL transcripts from Fireflies, classifies them,
 * and saves/updates them in the `synced_calls` Firestore collection.
 * Returns the full list of synced calls.
 */
export async function GET() {
    try {
        const result = await syncAndPersistCalls();
        return NextResponse.json({
            success: true,
            total: result.total,
            newCalls: result.newCalls,
            updated: result.updated,
            calls: result.calls,
        });
    } catch (error: any) {
        console.error("API Error [Sync Fireflies]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
