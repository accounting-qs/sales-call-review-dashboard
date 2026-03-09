'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    BarChart3,
    Mail,
    Lock,
    ArrowRight,
    Loader2,
    AlertCircle
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.push('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Failed to sign in. Please check your credentials.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#0f172a] relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]" />

            <div className="w-full max-w-md px-6 z-10 animate-in fade-in zoom-in duration-700">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-600/20 mb-4 ring-1 ring-white/20">
                        <BarChart3 className="text-white w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight font-outfit">SalesPulse</h1>
                    <p className="text-indigo-300/60 text-xs font-bold uppercase tracking-widest mt-2">Quantum Scaling OS</p>
                </div>

                <Card className="border-none bg-slate-900/40 backdrop-blur-xl ring-1 ring-white/10 shadow-2xl">
                    <CardHeader className="pt-8 px-8">
                        <CardTitle className="text-xl font-bold text-white">Welcome Back</CardTitle>
                        <CardDescription className="text-slate-400 text-xs">Enter your credentials to access the coaching dashboard</CardDescription>
                    </CardHeader>

                    <form onSubmit={handleLogin}>
                        <CardContent className="space-y-6 px-8 pt-6">
                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400 text-xs animate-in slide-in-from-top-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <p className="font-medium">{error}</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1" htmlFor="email">Email Address</Label>
                                <div className="relative group">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@quantum-scaling.com"
                                        className="bg-slate-950/50 border-slate-800 text-slate-200 pl-10 h-11 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all placeholder:text-slate-600"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest" htmlFor="password">Password</Label>
                                    <button type="button" className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300">Forgot Password?</button>
                                </div>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        className="bg-slate-950/50 border-slate-800 text-slate-200 pl-10 h-11 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all placeholder:text-slate-600"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        </CardContent>

                        <CardFooter className="px-8 pb-8 pt-4">
                            <Button
                                type="submit"
                                className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase tracking-widest text-xs gap-2 shadow-lg shadow-indigo-600/20 group"
                                disabled={loading}
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        Sign In
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>

                <p className="text-center mt-8 text-slate-500 text-[10px] font-medium uppercase tracking-widest">
                    Authorized Personnel Only — Privacy Policy
                </p>
            </div>
        </div>
    );
}
