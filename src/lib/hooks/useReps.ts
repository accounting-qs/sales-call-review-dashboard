import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Rep } from '@/types';

export function useReps() {
    const [reps, setReps] = useState<Rep[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const repsRef = collection(db, 'reps');
        const q = query(repsRef, orderBy('name', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const repsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Rep[];
            setReps(repsData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { reps, loading };
}
