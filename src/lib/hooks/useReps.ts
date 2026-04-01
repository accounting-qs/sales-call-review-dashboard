import { useState, useEffect } from 'react';
import { Rep } from '@/types';

export function useReps() {
    const [reps, setReps] = useState<Rep[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const fetchReps = async () => {
            try {
                const res = await fetch('/api/reps');
                if (!res.ok) throw new Error('Failed to fetch reps');
                const data = await res.json();
                if (isMounted) {
                    setReps(data);
                    setLoading(false);
                }
            } catch (error) {
                console.error("Error fetching reps:", error);
                if (isMounted) setLoading(false);
            }
        };

        fetchReps();
        const interval = setInterval(fetchReps, 5000); // Emulate real-time syncing

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, []);

    return { reps, loading };
}
