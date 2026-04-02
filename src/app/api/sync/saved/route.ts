import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SYNCED_CALLS_KEY = "synced_calls_cache";

/**
 * GET /api/sync/saved
 * Returns all synced (but not necessarily analyzed) transcripts.
 * These are the raw Fireflies records cached locally for the sync dashboard.
 */
export async function GET() {
    try {
        const setting = await prisma.setting.findUnique({
            where: { key: SYNCED_CALLS_KEY },
        });

        if (setting && setting.value) {
            const calls = (setting.value as any).calls || [];
            return NextResponse.json(calls);
        }

        return NextResponse.json([]);
    } catch (error: any) {
        console.error("[API Sync Saved] GET error:", error);
        return NextResponse.json([]);
    }
}

/**
 * POST /api/sync/saved
 * Saves/updates the synced calls cache. 
 * Body: { calls: SyncedTranscript[] }
 * Merges new calls with existing ones (upsert by id).
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const newCalls: any[] = body.calls || [];

        // Load existing cached calls
        const existing = await prisma.setting.findUnique({
            where: { key: SYNCED_CALLS_KEY },
        });

        const existingCalls: any[] = existing ? ((existing.value as any).calls || []) : [];

        // Merge: new calls overwrite existing by ID
        const callMap = new Map<string, any>();
        for (const call of existingCalls) {
            callMap.set(call.id || call.firefliesId, call);
        }
        for (const call of newCalls) {
            callMap.set(call.id || call.firefliesId, call);
        }

        const merged = Array.from(callMap.values());

        // Sort by date descending
        merged.sort((a, b) => (b.date || 0) - (a.date || 0));

        await prisma.setting.upsert({
            where: { key: SYNCED_CALLS_KEY },
            update: { value: { calls: merged } as any },
            create: { key: SYNCED_CALLS_KEY, value: { calls: merged } as any },
        });

        return NextResponse.json({ success: true, total: merged.length });
    } catch (error: any) {
        console.error("[API Sync Saved] POST error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
