import { fetchTranscripts } from "./fireflies";
import { prisma } from "../prisma";

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

export async function syncAndPersistCalls(): Promise<SyncResult> {
    console.log("[SyncCalls] Starting sync and persist to Postgres...");

    // 1. Fetch transcripts
    const transcripts = await fetchTranscripts(50);
    console.log(`[SyncCalls] Fetched ${transcripts.length} transcripts from Fireflies`);

    if (transcripts.length === 0) {
        console.log("[SyncCalls] No transcripts found.");
        return { total: 0, newCalls: 0, updated: 0, calls: [] };
    }

    // 2. Load Keyword settings
    const settingObj = await prisma.setting.findUnique({ where: { key: 'fireflies_pipeline' } });
    const settings = (settingObj?.value as any) || {};

    const evalKeywords = (settings.evaluationKeywords || 'Evaluation Call, Business Evaluation')
        .split(',').map((k: string) => k.trim().toLowerCase()).filter(Boolean);
    const followupKeywords = (settings.followupKeywords || 'Follow-up')
        .split(',').map((k: string) => k.trim().toLowerCase()).filter(Boolean);
    const excludedKeywords = (settings.excludedKeywords || 'Test, Internal')
        .split(',').map((k: string) => k.trim().toLowerCase()).filter(Boolean);

    // 3. Fetch existing calls for deduplication
    const existingCalls = await prisma.call.findMany({ select: { id: true, status: true } });
    const existingIds = new Set(existingCalls.map(c => c.id));
    const analyzedIds = new Set(existingCalls.filter(c => c.status === 'completed').map(c => c.id));

    const now = new Date();
    let newCalls = 0;
    let updated = 0;
    const allCalls: SyncedCall[] = [];

    for (const t of transcripts) {
        const title = (t.title || '').toLowerCase();
        
        let callCategory: 'call1' | 'call2' | 'other' = 'other';
        if (excludedKeywords.some((k: string) => title.includes(k))) {
            callCategory = 'other';
        } else if (evalKeywords.some((k: string) => title.includes(k))) {
            callCategory = 'call1';
        } else if (followupKeywords.some((k: string) => title.includes(k))) {
            callCategory = 'call2';
        }

        const isNew = !existingIds.has(t.id);
        const hasTranscript = t.duration > 30;

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
            syncedAt: isNew ? now.toISOString() : '', 
            isAnalyzed: analyzedIds.has(t.id),
            hasTranscript
        };

        try {
            await prisma.call.upsert({
                where: { id: t.id },
                update: {
                    title: t.title || 'Untitled',
                    duration: t.duration,
                    callCategory,
                    transcriptUrl: t.transcript_url || '',
                },
                create: {
                    id: t.id,
                    title: t.title || 'Untitled',
                    date: new Date(t.date),
                    duration: t.duration,
                    prospectName: t.organizer_email || '',
                    transcriptUrl: t.transcript_url || '',
                    callCategory,
                    status: 'synced',
                }
            });
            if (isNew) newCalls++; else updated++;
        } catch (e) {
            console.error(`[SyncCalls] Failed to save call ${t.id} to Prisma:`, e);
        }

        allCalls.push(syncedCall);
    }

    // 6. Update lastSyncedAt
    await prisma.setting.upsert({
        where: { key: 'fireflies_pipeline' },
        update: { value: { ...settings, lastSyncedAt: now.toISOString() } as any },
        create: { key: 'fireflies_pipeline', value: { ...settings, lastSyncedAt: now.toISOString() } as any }
    });

    console.log(`[SyncCalls] ✅ Done. Total: ${allCalls.length} | New: ${newCalls} | Updated: ${updated}`);
    return { total: allCalls.length, newCalls, updated, calls: allCalls };
}
