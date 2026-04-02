import { NextResponse } from "next/server";
import { processLatestCalls } from "@/lib/services/orchestrator";
import { prisma } from "@/lib/prisma";

export const maxDuration = 300; // 5 minutes max

/**
 * GET /api/cron/sync
 * Nightly automated sync (default 12am EST).
 * Runs AI analysis on new unprocessed calls via orchestrator.
 */
export async function GET(request: Request) {
    // Security: require CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET || 'salespulse_daily_sync_key_123'}`;

    if (authHeader !== expectedAuth) {
        return new NextResponse("Unauthorized. Invalid Cron Secret.", { status: 401 });
    }

    try {
        console.log("[CRON] Starting nightly sync...");

        // Fetch settings from Prisma
        const settingObj = await prisma.setting.findUnique({ where: { key: "fireflies_pipeline" } });
        const settings = (settingObj?.value as any) || { autoSyncEnabled: true, dailySyncTime: '00:00' };

        // Check if auto sync is enabled
        if (!settings.autoSyncEnabled) {
            console.log("[CRON] Auto Sync is disabled. Skipping.");
            return NextResponse.json({ success: true, message: "Skipped: Auto Sync is disabled" });
        }

        // Check time or force flag
        const { searchParams } = new URL(request.url);
        const force = searchParams.get('force') === 'true';

        const preferredTime = settings.dailySyncTime || '00:00';
        const preferredHour = parseInt(preferredTime.split(':')[0], 10);
        const currentHour = new Date().getHours();

        if (currentHour !== preferredHour && !force) {
            console.log(`[CRON] Skipped: Current hour (${currentHour}) ≠ preferred (${preferredHour})`);
            return NextResponse.json({ success: true, message: "Skipped: Not the scheduled hour" });
        }

        console.log("[CRON] Time matched or forced. Running analysis pipeline...");

        // Run AI analysis on unprocessed calls (fetches from Fireflies + analyzes)
        await processLatestCalls();

        console.log("[CRON] ✅ Nightly sync completed successfully");
        return NextResponse.json({ success: true, message: "Sync completed" });

    } catch (error: any) {
        console.error("[CRON] Error during nightly sync:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
