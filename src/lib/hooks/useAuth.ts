import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { User, UserRole } from '@/types';

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Fetch user document from Firestore
                const userRef = doc(db, 'users', firebaseUser.email || firebaseUser.uid);

                // Listen to user changes
                const unsubUser = onSnapshot(userRef, (docSnap) => {
                    if (docSnap.exists()) {
                        setUser({
                            ...docSnap.data() as User,
                            uid: firebaseUser.uid
                        });
                    } else {
                        setUser({
                            uid: firebaseUser.uid,
                            email: firebaseUser.email || '',
                            name: firebaseUser.displayName || 'User',
                            role: 'rep', // default role
                            createdAt: docSnap.data()?.createdAt || null
                        } as User);
                    }
                    setLoading(false);
                });

                return () => unsubUser();
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    return { user, loading };
}
