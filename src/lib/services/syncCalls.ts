import { fetchTranscripts } from "./fireflies";
import { db } from "../firebase";
import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";

export interface SyncedCall {
    firefliesId: string;
    title: string;
    date: number;
    duration: number;
    hostEmail: string;
    organizerEmail: string;
    transcriptUrl: string;
    participants: string[];
    callCategory: 'call1' | 'call2' | 'other';
    syncedAt: string;
    isAnalyzed: boolean;
    hasTranscript: boolean;
}

interface SyncResult {
    total: number;
    newCalls: number;
    updated: number;
    calls: SyncedCall[];
}

/**
 * Shared function used by BOTH manual sync and nightly cron.
 * Fetches ALL transcripts from Fireflies, classifies them,
 * and upserts to the `synced_calls` Firestore collection.
 * Deduplication is handled by using firefliesId as the doc ID.
 */
export async function syncAndPersistCalls(): Promise<SyncResult> {
    console.log("[SyncCalls] Starting sync and persist...");

    // 1. Fetch all transcripts from Fireflies (paginated)
    const transcripts = await fetchTranscripts(50);
    console.log(`[SyncCalls] Fetched ${transcripts.length} transcripts from Fireflies`);

    if (transcripts.length === 0) {
        console.log("[SyncCalls] No transcripts found.");
        return { total: 0, newCalls: 0, updated: 0, calls: [] };
    }

    // 2. Load keyword settings for classification
    const settingsSnap = await getDoc(doc(db, 'settings', 'fireflies_pipeline'));
    const settings = settingsSnap.exists() ? settingsSnap.data() : {};

    const evalKeywords = (settings.evaluationKeywords || 'Evaluation Call, Business Evaluation')
        .split(',').map((k: string) => k.trim().toLowerCase()).filter((k: string) => k);
    const followupKeywords = (settings.followupKeywords || 'Follow-up')
        .split(',').map((k: string) => k.trim().toLowerCase()).filter((k: string) => k);
    const excludedKeywords = (settings.excludedKeywords || 'Test, Internal')
        .split(',').map((k: string) => k.trim().toLowerCase()).filter((k: string) => k);

    // 3. Check which calls are already analyzed (in `calls` collection)
    const analyzedIds = new Set<string>();
    try {
        const callsSnapshot = await getDocs(collection(db, 'calls'));
        callsSnapshot.docs.forEach(d => analyzedIds.add(d.id));
    } catch (e) {
        console.warn("[SyncCalls] Could not fetch calls collection:", e);
    }

    // 4. Check which calls already exist in synced_calls
    const existingIds = new Set<string>();
    try {
        const syncedSnapshot = await getDocs(collection(db, 'synced_calls'));
        syncedSnapshot.docs.forEach(d => existingIds.add(d.id));
    } catch (e) {
        console.warn("[SyncCalls] synced_calls collection is empty or new:", e);
    }

    // 5. Classify and save each transcript using setDoc with merge
    const now = new Date().toISOString();
    let newCalls = 0;
    let updated = 0;
    const allCalls: SyncedCall[] = [];

    for (const t of transcripts) {
        const title = (t.title || '').toLowerCase();

        // Classify
        let callCategory: 'call1' | 'call2' | 'other' = 'other';
        if (excludedKeywords.some((k: string) => title.includes(k))) {
            callCategory = 'other';
        } else if (evalKeywords.some((k: string) => title.includes(k))) {
            callCategory = 'call1';
        } else if (followupKeywords.some((k: string) => title.includes(k))) {
            callCategory = 'call2';
        }

        const isNew = !existingIds.has(t.id);

        const syncedCall: SyncedCall = {
            firefliesId: t.id,
            title: t.title || 'Untitled',
            date: t.date,
            duration: t.duration,
            hostEmail: t.host_email || '',
            organizerEmail: t.organizer_email || '',
            transcriptUrl: t.transcript_url || '',
            participants: t.participants || [],
            callCategory,
            syncedAt: isNew ? now : '', // Will be preserved via merge for existing docs
            isAnalyzed: analyzedIds.has(t.id),
            hasTranscript: t.duration > 30,
        };

        try {
            if (isNew) {
                // New doc — set everything including syncedAt
                await setDoc(doc(db, 'synced_calls', t.id), syncedCall);
                newCalls++;
            } else {
                // Existing doc — merge without overwriting syncedAt
                const { syncedAt, ...updateData } = syncedCall;
                await setDoc(doc(db, 'synced_calls', t.id), updateData, { merge: true });
                updated++;
            }
        } catch (e) {
            console.error(`[SyncCalls] Failed to save call ${t.id}:`, e);
        }

        allCalls.push(syncedCall);
    }

    // 6. Update lastSyncedAt
    await setDoc(doc(db, 'settings', 'fireflies_pipeline'), { lastSyncedAt: now }, { merge: true });

    console.log(`[SyncCalls] ✅ Done. Total: ${allCalls.length} | New: ${newCalls} | Updated: ${updated}`);
    return { total: allCalls.length, newCalls, updated, calls: allCalls };
}
