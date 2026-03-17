import { NextResponse } from "next/server";
import { processLatestCalls } from "@/lib/services/orchestrator";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

// Optional: Use edge runtime or maxDuration for long-running functions
export const maxDuration = 300; // 5 minutes max duration on Vercel/Firebase hosting

export async function GET(request: Request) {
    // 1. Basic Security: Only allow requests with a valid Authorization header
    // so random internet bots don't drain your Fireflies/Gemini API limits
    const authHeader = request.headers.get('authorization');
    
    // Check against a secure basic CRON secret
    // Note: You can add CRON_SECRET to your .env.local and Firebase environment
    const expectedAuth = `Bearer ${process.env.CRON_SECRET || 'salespulse_daily_sync_key_123'}`;
    
    if (authHeader !== expectedAuth) {
        return new NextResponse("Unauthorized. Invalid Cron Secret.", { status: 401 });
    }

    try {
        console.log("[CRON] Checking execution time and status...");

        // Fetch settings from Firebase
        const settingsRef = doc(db, 'settings', 'fireflies_pipeline');
        const settingsSnap = await getDoc(settingsRef);
        const settings = settingsSnap.exists() ? settingsSnap.data() : { autoSyncEnabled: true, dailySyncTime: '02:00' };

        // Ensure auto sync is enabled
        if (!settings.autoSyncEnabled) {
             console.log("[CRON] Auto Sync is globally disabled inside Settings. Skipping run.");
             return NextResponse.json({ success: true, message: "Skipped: Auto Sync is disabled" });
        }

        // Logic to allow forced execution or time matching
        const { searchParams } = new URL(request.url);
        const force = searchParams.get('force') === 'true';

        // Check time matching
        const preferredTime = settings.dailySyncTime || '02:00'; 
        const preferredHour = parseInt(preferredTime.split(':')[0], 10);
        
        const currentHour = new Date().getHours();

        if (currentHour !== preferredHour && !force) {
            console.log(`[CRON] Skipped: Current hour (${currentHour}) does not match preferred hour (${preferredHour})`);
            return NextResponse.json({ success: true, message: "Skipped: Not the scheduled hour" });
        }

        console.log("[CRON] Time matched or Forced. Triggering Daily Fireflies Sync...");
        
        // This will fetch transcripts, deduplicate, route, analyze, and save.
        await processLatestCalls();

        console.log("[CRON] Daily Sync Completed Successfully");
        return NextResponse.json({ success: true, message: "Sync job finished successfully" });
        
    } catch (error: any) {
        console.error("[CRON] Error during automated sync:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
