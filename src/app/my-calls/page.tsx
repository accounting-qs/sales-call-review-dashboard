'use client';

import React from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useCalls } from '@/lib/hooks/useCalls';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, FileText, ChevronRight, Phone } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const getScoreColor = (score: number) => {
    if (score < 5) return 'text-red-600 bg-red-50 border-red-100';
    if (score < 7) return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-green-600 bg-green-50 border-green-100';
};

export default function MyCallsPage() {
    const { user } = useAuth();
    const { calls, loading } = useCalls(user?.email || undefined);

    if (!user) return null;

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50">
            <Header
                breadcrumbs={[{ label: 'My Call History' }]}
                actions={
                    <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Live Syncing</span>
                    </div>
                }
            />

            <div className="flex-1 overflow-y-auto px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Recent Calls</h1>
                    <p className="text-slate-500 text-sm mt-1">Review your latest sales calls and AI-generated feedback</p>
                </div>

                <Card className="border-none shadow-sm bg-white overflow-hidden">
                    <CardHeader className="bg-slate-50 border-b border-slate-100 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-widest">
                                <Phone className="w-4 h-4 text-indigo-600" />
                                Call Log ({calls.length})
                            </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow className="border-slate-100 hover:bg-transparent">
                                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-6 py-3">Call Details</TableHead>
                                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-3">Prospect</TableHead>
                                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-3 text-center">Outcome</TableHead>
                                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-3 text-center">AI Score</TableHead>
                                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right pr-6 py-3">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i} className="animate-pulse">
                                            <TableCell colSpan={5} className="h-16 bg-slate-50/50" />
                                        </TableRow>
                                    ))
                                ) : calls.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-40 text-center text-slate-400 italic">
                                            No calls found for your account.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    calls.map((call) => (
                                        <TableRow key={call.id} className="border-slate-100 group hover:bg-slate-50/50 transition-colors">
                                            <TableCell className="pl-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate max-w-[200px]">{call.title}</span>
                                                    <span className="text-[10px] text-slate-400 font-medium">
                                                        {call.date.toDate().toLocaleDateString()} • {Math.floor(call.duration)}m {Math.round((call.duration % 1) * 60)}s
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-700">{call.prospectName}</span>
                                                    <span className="text-[10px] text-slate-400">{call.prospectCompany}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={call.outcome === 'Closed' ? 'default' : 'secondary'} className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5">
                                                    {call.outcome}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge className={cn("text-[11px] font-black px-2 py-1 border", getScoreColor(call.score))}>
                                                    {call.score.toFixed(1)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <Link href={`/calls/${call.id}`}>
                                                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-none">
                                                        <ChevronRight className="w-5 h-5" />
                                                    </Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
