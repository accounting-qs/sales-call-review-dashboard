import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, addDoc, Timestamp } from 'firebase/firestore';
import { ReferenceDoc } from '@/types';

export function useKnowledge() {
    const [docs, setDocs] = useState<ReferenceDoc[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'knowledge'), orderBy('uploadedAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const docsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as ReferenceDoc[];
            setDocs(docsData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const toggleDocSelection = async (docId: string, callType: 'call1' | 'call2', enabled: boolean) => {
        const docRef = doc(db, 'knowledge', docId);
        const updateData = callType === 'call1'
            ? { enabledForCall1: enabled }
            : { enabledForCall2: enabled };

        await updateDoc(docRef, updateData);
    };

    const deleteReferenceDoc = async (docId: string) => {
        await deleteDoc(doc(db, 'knowledge', docId));
    };

    return { docs, loading, toggleDocSelection, deleteReferenceDoc };
}
