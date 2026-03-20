import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';

interface KnowledgeDoc {
    id: string;
    name: string;
    sizeStr?: string;
    status: string;
    geminiFileId?: string;
    geminiFileUri?: string;
    mimeType?: string;
    chunks?: string;
    uploadedAt: string;
    // Legacy field — kept for backward compatibility
    isActive?: boolean;
    // Per-call-type toggles
    useInCall1: boolean;
    useInCall2: boolean;
    // Expiration and auto-renewal fields
    expiresAt?: string | null;
    storagePath?: string | null;
    lastRenewedAt?: string | null;
}

export function useKnowledge() {
    const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'knowledge_base'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const docsData = snapshot.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    ...data,
                    // Backward compat: if doc only has old `isActive` field, default both calls to that value
                    useInCall1: data.useInCall1 ?? data.isActive ?? true,
                    useInCall2: data.useInCall2 ?? data.isActive ?? true,
                };
            }) as KnowledgeDoc[];
            setDocs(docsData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    /** Toggle a document for a specific call type */
    const toggleDocForCall = async (docId: string, callType: 'call1' | 'call2', currentValue: boolean) => {
        const docRef = doc(db, 'knowledge_base', docId);
        const field = callType === 'call1' ? 'useInCall1' : 'useInCall2';
        await updateDoc(docRef, { [field]: !currentValue });
    };

    const deleteReferenceDoc = async (docObj: any) => {
        try {
            // If it has a Gemini ID, wipe it from Google servers first
            if (docObj.geminiFileId) {
                const res = await fetch('/api/rag/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileName: docObj.geminiFileId })
                });
                if (!res.ok) {
                    console.warn("Failed to delete from Gemini File API, but proceeding to remove from Firebase.");
                }
            }
            await deleteDoc(doc(db, 'knowledge_base', docObj.id));
        } catch (err) {
            console.error(err);
            throw err;
        }
    };

    return { docs, loading, toggleDocForCall, deleteReferenceDoc };
}
