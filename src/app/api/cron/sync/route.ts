import { NextResponse } from "next/server";
import { processLatestCalls } from "@/lib/services/orchestrator";
import { syncAndPersistCalls } from "@/lib/services/syncCalls";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export const maxDuration = 300; // 5 minutes max

/**
 * GET /api/cron/sync
 * Nightly automated sync (default 12am EST).
 * 1. Fetch + persist ALL calls to synced_calls collection
 * 2. Run AI analysis on new unprocessed calls via orchestrator
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

        // Fetch settings
        const settingsRef = doc(db, 'settings', 'fireflies_pipeline');
        const settingsSnap = await getDoc(settingsRef);
        const settings = settingsSnap.exists() ? settingsSnap.data() : { autoSyncEnabled: true, dailySyncTime: '00:00' };

        // Check if auto sync is enabled
        if (!settings.autoSyncEnabled) {
            console.log("[CRON] Auto Sync is disabled. Skipping.");
            return NextResponse.json({ success: true, message: "Skipped: Auto Sync is disabled" });
        }

        // Check time or force flag
        const { searchParams } = new URL(request.url);
        const force = searchParams.get('force') === 'true';

        const preferredTime = settings.dailySyncTime || '00:00'; // Default: 12am EST
        const preferredHour = parseInt(preferredTime.split(':')[0], 10);
        const currentHour = new Date().getHours();

        if (currentHour !== preferredHour && !force) {
            console.log(`[CRON] Skipped: Current hour (${currentHour}) ≠ preferred (${preferredHour})`);
            return NextResponse.json({ success: true, message: "Skipped: Not the scheduled hour" });
        }

        console.log("[CRON] Time matched or forced. Running sync pipeline...");

        // Step 1: Sync and persist ALL calls from Fireflies to Firestore
        const syncResult = await syncAndPersistCalls();
        console.log(`[CRON] Sync complete. Total: ${syncResult.total} | New: ${syncResult.newCalls} | Updated: ${syncResult.updated}`);

        // Step 2: Run AI analysis on unprocessed calls (via orchestrator)
        if (settings.autoAnalysis) {
            console.log("[CRON] Auto-Analysis enabled. Processing new calls...");
            await processLatestCalls();
        } else {
            console.log("[CRON] Auto-Analysis is disabled. Skipping analysis step.");
        }

        console.log("[CRON] ✅ Nightly sync completed successfully");
        return NextResponse.json({
            success: true,
            message: "Sync completed",
            sync: {
                total: syncResult.total,
                newCalls: syncResult.newCalls,
                updated: syncResult.updated,
            }
        });

    } catch (error: any) {
        console.error("[CRON] Error during nightly sync:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
