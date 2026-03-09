import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { Call } from '@/types';

export function useCalls(repEmail?: string) {
    const [calls, setCalls] = useState<Call[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const callsRef = collection(db, 'calls');
        let q = query(callsRef, orderBy('date', 'desc'));

        if (repEmail) {
            q = query(callsRef, where('repEmail', '==', repEmail), orderBy('date', 'desc'));
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const callsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Call[];
            setCalls(callsData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [repEmail]);

    return { calls, loading };
}
