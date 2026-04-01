import { useState, useEffect } from 'react';
import { Call } from '@/types';

export function useCalls(repEmail?: string) {
    const [calls, setCalls] = useState<Call[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const fetchCalls = async () => {
            try {
                const url = repEmail ? `/api/calls?repEmail=${encodeURIComponent(repEmail)}` : '/api/calls';
                const res = await fetch(url);
                if (!res.ok) throw new Error('Failed to fetch calls');
                const data = await res.json();
                
                if (isMounted) {
                    // Sort locally since Prisma might return them sorted, but good to be safe for dashboard rendering
                    data.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    setCalls(data);
                    setLoading(false);
                }
            } catch (error) {
                console.error("Error fetching calls:", error);
                if (isMounted) setLoading(false);
            }
        };

        setLoading(true);
        fetchCalls();
        const interval = setInterval(fetchCalls, 5000); // Emulate real-time syncing

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [repEmail]);

    return { calls, loading };
}
