import { NextRequest, NextResponse } from 'next/server';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getStorage as getAdminStorage } from 'firebase-admin/storage';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

export const maxDuration = 300; // 5 minutes for batch renewal

function getStorageBucket() {
    if (getApps().length === 0) {
        initializeApp({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        });
    }
    return getAdminStorage().bucket();
}

/**
 * GET /api/cron/rag-refresh
 * Checks all knowledge_base documents for expiring Gemini files.
 * Re-uploads any that expire within the next 6 hours.
 */
export async function GET(request: Request) {
    // Security: require CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET || 'salespulse_daily_sync_key_123'}`;
    
    if (authHeader !== expectedAuth) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        return NextResponse.json({ error: 'GEMINI_API_KEY missing' }, { status: 500 });
    }

    try {
        console.log('[CRON RAG Refresh] Starting auto-renewal check...');

        const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);
        
        // 1. List all files currently in Gemini
        const listResult = await fileManager.listFiles();
        const geminiFiles = listResult.files || [];

        // Build a map of Gemini file expirations
        const expirationMap = new Map<string, { expirationTime: string; state: string }>();
        for (const f of geminiFiles) {
            expirationMap.set(f.name, {
                expirationTime: (f as any).expirationTime || '',
                state: f.state?.toString() || 'UNKNOWN',
            });
        }

        // 2. Check all knowledge_base documents
        const kbSnapshot = await getDocs(collection(db, 'knowledge_base'));
        const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
        const now = Date.now();

        let renewed = 0;
        let skipped = 0;
        let errors = 0;
        let expired = 0;

        for (const kbDoc of kbSnapshot.docs) {
            const data = kbDoc.data();
            const geminiFileId = data.geminiFileId;
            const storagePath = data.storagePath;

            if (!geminiFileId) {
                skipped++;
                continue;
            }

            // Check expiration from Gemini API
            const geminiInfo = expirationMap.get(geminiFileId);
            
            let needsRenewal = false;

            if (!geminiInfo) {
                // File is gone from Gemini (expired or deleted)
                console.log(`[CRON RAG Refresh] "${data.name}" is MISSING from Gemini. Needs renewal.`);
                needsRenewal = true;
                expired++;
            } else if (geminiInfo.expirationTime) {
                const expiresAt = new Date(geminiInfo.expirationTime).getTime();
                const timeUntilExpiry = expiresAt - now;
                
                if (timeUntilExpiry < SIX_HOURS_MS) {
                    console.log(`[CRON RAG Refresh] "${data.name}" expires in ${Math.round(timeUntilExpiry / 60000)} minutes. Renewing...`);
                    needsRenewal = true;
                } else {
                    // Update the expiresAt field in Firestore for UI display
                    await updateDoc(doc(db, 'knowledge_base', kbDoc.id), {
                        expiresAt: geminiInfo.expirationTime,
                        status: 'Active',
                    });
                    skipped++;
                }
            }

            if (needsRenewal) {
                if (!storagePath) {
                    console.warn(`[CRON RAG Refresh] "${data.name}" has no storagePath. Cannot auto-renew.`);
                    await updateDoc(doc(db, 'knowledge_base', kbDoc.id), {
                        status: 'Expired — Re-upload required',
                        expiresAt: null,
                    });
                    errors++;
                    continue;
                }

                try {
                    const bucket = getStorageBucket();
                    const storageFile = bucket.file(storagePath);
                    const [exists] = await storageFile.exists();

                    if (!exists) {
                        console.warn(`[CRON RAG Refresh] Storage file not found: ${storagePath}`);
                        await updateDoc(doc(db, 'knowledge_base', kbDoc.id), {
                            status: 'Expired — Re-upload required',
                            expiresAt: null,
                        });
                        errors++;
                        continue;
                    }

                    const safeName = (data.name || 'doc.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
                    const tempPath = join(tmpdir(), `cron-renew-${Date.now()}-${safeName}`);
                    await storageFile.download({ destination: tempPath });

                    // Delete old file from Gemini (ignore errors)
                    try { await fileManager.deleteFile(geminiFileId); } catch {}

                    // Upload fresh copy
                    const uploadResult = await fileManager.uploadFile(tempPath, {
                        mimeType: data.mimeType || 'application/pdf',
                        displayName: data.name || 'document.pdf',
                    });
                    const newFile = uploadResult.file;

                    // Update Firestore
                    await updateDoc(doc(db, 'knowledge_base', kbDoc.id), {
                        geminiFileId: newFile.name,
                        geminiFileUri: newFile.uri,
                        status: newFile.state === 'PROCESSING' ? 'Indexing...' : 'Active',
                        expiresAt: (newFile as any).expirationTime || null,
                        lastRenewedAt: new Date().toISOString(),
                    });

                    try { await unlink(tempPath); } catch {}

                    console.log(`[CRON RAG Refresh] ✅ Renewed "${data.name}" → ${newFile.name}`);
                    renewed++;
                } catch (err: any) {
                    console.error(`[CRON RAG Refresh] ❌ Failed to renew "${data.name}":`, err.message);
                    errors++;
                }
            }
        }

        const summary = `Renewed: ${renewed} | Skipped (still valid): ${skipped} | Expired (no backup): ${expired} | Errors: ${errors}`;
        console.log(`[CRON RAG Refresh] Finished. ${summary}`);
        
        return NextResponse.json({ success: true, renewed, skipped, expired, errors, summary });

    } catch (error: any) {
        console.error('[CRON RAG Refresh] Fatal error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
