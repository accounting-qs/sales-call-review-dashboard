'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
    RefreshCw,
    Play,
    CheckCircle2,
    Clock,
    Search as SearchIcon,
    Filter,
    ArrowUpDown,
    ExternalLink,
    Brain,
    Users,
    FileText,
    MessageSquare,
    ChevronRight,
    FileCode,
    Settings as SettingsIcon,
    AlertCircle,
    Save,
    UserPlus,
    UserCheck,
    ChevronDown,
    ChevronUp,
    Mail
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, getDoc, Timestamp, orderBy } from 'firebase/firestore';
import { useReps } from '@/lib/hooks/useReps';

interface SyncedTranscript {
    id: string;
    firefliesId: string;
    title: string | null;
    date: number;
    duration: number;
    host_email: string | null;
    organizer_email: string | null;
    transcript_url: string;
    participants?: string[];
    callCategory: 'call1' | 'call2' | 'other';
    isAnalyzed: boolean;
    hasTranscript: boolean;
    syncedAt: string;
    // These come from the detail view, not the list
    sentences?: Array<{
        index: number;
        speaker_name: string;
        text: string;
        start_time: number;
        end_time: number;
    }>;
}

const DEFAULT_TEMPLATE = `==📊 **New Audited Call** ==

👤 **Rep:** {{rep}}
👥 **Prospect:** {{title}}
📅 **Date:** {{date}}
🔗 **Link:** {{link}}
⏱️ **Duration:** {{duration}} min

🔎 **AI Review Summary**
> {{analysis}}

**Quick Stats:**
- **Alignment:** {{alignment}}
- **Score:** {{score}}/10
- **Risk:** {{risk}}

[Full Report]({{link}}) | [Recording]({{transcript}})`;

type CallFilter = 'call1' | 'call2' | 'other' | 'all';

export default function SyncPage() {
    const [transcripts, setTranscripts] = useState<SyncedTranscript[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [search, setSearch] = useState('');
    const [analyzingId, setAnalyzingId] = useState<string | null>(null);
    const [selectedTranscript, setSelectedTranscript] = useState<SyncedTranscript | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [transcriptSearch, setTranscriptSearch] = useState('');
    const [lastSyncedAt, setLastSyncedAt] = useState<string>('');
    const [callFilter, setCallFilter] = useState<CallFilter>('call1');
    const [showPeoplePanel, setShowPeoplePanel] = useState(false);
    const [addingRepEmail, setAddingRepEmail] = useState<string | null>(null);
    const [syncStats, setSyncStats] = useState<{ total: number; newCalls: number } | null>(null);

    const { reps: existingReps } = useReps();
    const existingRepEmails = useMemo(
        () => new Set(existingReps.map(r => r.email.toLowerCase())),
        [existingReps]
    );

    // Load saved calls from Firestore on page load (instant, no API call)
    const loadSavedCalls = async () => {
        try {
            const snapshot = await getDocs(
                query(collection(db, 'synced_calls'), orderBy('date', 'desc'))
            );
            const calls = snapshot.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    firefliesId: d.id,
                    title: data.title || null,
                    date: data.date,
                    duration: data.duration,
                    host_email: data.hostEmail || null,
                    organizer_email: data.organizerEmail || null,
                    transcript_url: data.transcriptUrl || '',
                    participants: data.participants || [],
                    callCategory: data.callCategory || 'other',
                    isAnalyzed: data.isAnalyzed || false,
                    hasTranscript: data.hasTranscript !== false,
                    syncedAt: data.syncedAt || '',
                } as SyncedTranscript;
            });
            setTranscripts(calls);
        } catch (err) {
            console.error('Error loading saved calls:', err);
        } finally {
            setLoading(false);
        }
    };

    // Sync from Fireflies API and persist to Firestore
    const fetchFireflies = async () => {
        setSyncing(true);
        setSyncStats(null);
        try {
            const res = await fetch('/api/sync/fireflies');
            const data = await res.json();
            if (data.success && Array.isArray(data.calls)) {
                // Map API response to our UI format
                const synced = data.calls.map((c: any) => ({
                    id: c.firefliesId,
                    firefliesId: c.firefliesId,
                    title: c.title,
                    date: c.date,
                    duration: c.duration,
                    host_email: c.hostEmail,
                    organizer_email: c.organizerEmail,
                    transcript_url: c.transcriptUrl,
                    participants: c.participants || [],
                    callCategory: c.callCategory,
                    isAnalyzed: c.isAnalyzed,
                    hasTranscript: c.hasTranscript,
                    syncedAt: c.syncedAt,
                } as SyncedTranscript));
                setTranscripts(synced);
                setSyncStats({ total: data.total, newCalls: data.newCalls });
                setLastSyncedAt(new Date().toISOString());
            }
        } catch (error) {
            console.error("Sync error:", error);
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        loadSavedCalls();
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const docRef = doc(db, 'settings', 'fireflies_pipeline');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const s = docSnap.data();
                if (s.lastSyncedAt) setLastSyncedAt(s.lastSyncedAt);
            }
        } catch (error) {
            console.error("Error loading settings:", error);
        }
    };

    const handleAnalyze = async (firefliesId: string, callType: 'evaluation' | 'followup') => {
        setAnalyzingId(firefliesId);
        try {
            const res = await fetch('/api/sync/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ firefliesId, callType })
            });

            if (res.ok) {
                setTranscripts(prev => prev.map(t => t.id === firefliesId ? { ...t, isAnalyzed: true } : t));
                alert(`Analysis started for ${callType.toUpperCase()}! It will appear in the dashboard shortly.`);
            } else {
                const err = await res.json();
                alert(`Error: ${err.error}`);
            }
        } catch (error) {
            alert("Failed to trigger analysis");
        } finally {
            setAnalyzingId(null);
        }
    };

    const handleViewDetails = async (transcript: SyncedTranscript) => {
        setSelectedTranscript(transcript);
        setLoadingDetails(true);
        setTranscriptSearch('');
        try {
            const res = await fetch(`/api/sync/transcript?id=${transcript.id}`);
            const data = await res.json();
            if (data && !data.error) {
                setSelectedTranscript(data);
            }
        } catch (error) {
            console.error("Error fetching details:", error);
        } finally {
            setLoadingDetails(false);
        }
    };

    const highlightText = (text: string, highlight: string) => {
        if (!highlight.trim()) return text;
        const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const parts = text.split(regex);
        return (
            <span>
                {parts.map((part, i) =>
                    part.toLowerCase() === highlight.toLowerCase() ? (
                        <mark key={i} className="bg-yellow-200 text-slate-900 rounded-sm px-0.5">{part}</mark>
                    ) : (
                        part
                    )
                )}
            </span>
        );
    };

    // Classification now comes from Firestore — no client-side classifyCall needed
    const counts = {
        call1: transcripts.filter(t => t.callCategory === 'call1').length,
        call2: transcripts.filter(t => t.callCategory === 'call2').length,
        other: transcripts.filter(t => t.callCategory === 'other').length,
        all: transcripts.length,
    };

    const filteredTranscripts = transcripts.filter(t => {
        // Apply call type filter
        if (callFilter !== 'all' && t.callCategory !== callFilter) return false;
        // Apply search filter
        const title = (t.title || '').toLowerCase();
        const email = (t.host_email || '').toLowerCase();
        const participants = (t.participants || []).join(',').toLowerCase();
        const searchVal = search.toLowerCase();
        return title.includes(searchVal) || email.includes(searchVal) || participants.includes(searchVal);
    });

    const formatDate = (ms: number) => {
        return new Date(ms).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDuration = (mins: number) => {
        const m = Math.floor(mins);
        const s = Math.round((mins - m) * 60);
        return `${m}m ${s}s`;
    };

    const getInitials = (email: string) => {
        return email.split('@')[0].slice(0, 2).toUpperCase();
    };

    if (loading) return (
        <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
    );

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50">
            <Header
                breadcrumbs={[{ label: 'Manager Dashboard' }, { label: 'Sync Fireflies' }]}
                actions={
                    <div className="flex items-center gap-4">
                        {lastSyncedAt ? (
                            <div className="flex flex-col items-end hidden sm:flex">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Last Synced</span>
                                <span className="text-[11px] font-bold text-slate-700 tabular-nums">
                                    {new Date(lastSyncedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                </span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-end hidden sm:flex">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Last Synced</span>
                                <span className="text-[11px] font-bold text-slate-400 italic">Never</span>
                            </div>
                        )}
                        <Button 
                            variant="outline" 
                            className="h-10 w-10 p-0 rounded-xl border-slate-200"
                            onClick={() => window.location.href = '/settings'}
                            title="Open Pipeline Settings"
                        >
                            <SettingsIcon className="w-4 h-4 text-slate-500" />
                        </Button>

                        <Button
                            onClick={fetchFireflies}
                            disabled={syncing}
                            className="bg-indigo-600 hover:bg-indigo-700 h-10 gap-2 font-bold uppercase text-xs tracking-widest shadow-lg shadow-indigo-100 px-6 rounded-xl"
                        >
                            <RefreshCw className={cn("w-3 h-3", syncing && "animate-spin")} />
                            {syncing ? 'Syncing...' : 'Sync Transcripts'}
                        </Button>
                    </div>
                }
            />

            <div className="flex-1 overflow-y-auto px-8 py-8 pb-24">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight font-outfit uppercase">
                        Fireflies Pipeline
                    </h1>
                    <p className="text-slate-400 text-sm font-bold mt-2 uppercase tracking-[0.1em]">View all recordings and select calls for AI deep-dive analysis</p>
                </div>

                {/* Call Type Filter Tabs */}
                <div className="flex items-center gap-2 mb-6">
                    {[
                        { key: 'call1' as CallFilter, label: 'Call 1 — Evaluation', icon: Brain, color: 'indigo' },
                        { key: 'call2' as CallFilter, label: 'Call 2 — Follow-up', icon: RefreshCw, color: 'emerald' },
                        { key: 'other' as CallFilter, label: 'Other', icon: FileText, color: 'slate' },
                        { key: 'all' as CallFilter, label: 'All Calls', icon: Filter, color: 'purple' },
                    ].map(tab => {
                        const isActive = callFilter === tab.key;
                        const count = counts[tab.key];
                        const TabIcon = tab.icon;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setCallFilter(tab.key)}
                                className={cn(
                                    "relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-200",
                                    isActive
                                        ? tab.color === 'indigo' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                                        : tab.color === 'emerald' ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200"
                                        : tab.color === 'purple' ? "bg-purple-600 text-white shadow-lg shadow-purple-200"
                                        : "bg-slate-700 text-white shadow-lg shadow-slate-200"
                                        : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                )}
                            >
                                <TabIcon className="w-3.5 h-3.5" />
                                {tab.label}
                                <span className={cn(
                                    "ml-1 px-2 py-0.5 rounded-full text-[10px] font-black",
                                    isActive
                                        ? "bg-white/20 text-white"
                                        : "bg-slate-100 text-slate-500"
                                )}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* People on Calls — Discovery Panel */}
                <div className="mb-6">
                    <button
                        onClick={() => setShowPeoplePanel(!showPeoplePanel)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all text-[11px] font-black uppercase tracking-widest"
                    >
                        <Users className="w-3.5 h-3.5" />
                        People on Calls
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black">
                            {(() => {
                                const emails = new Set<string>();
                                filteredTranscripts.forEach(t => {
                                    (t.participants || [t.host_email]).forEach((p: string | null) => {
                                        if (p) emails.add(p.toLowerCase());
                                    });
                                });
                                return emails.size;
                            })()}
                        </span>
                        {showPeoplePanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    {showPeoplePanel && (
                        <div className="mt-3 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-1 h-4 bg-indigo-600 rounded-full" />
                                <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Discovered Participants</h3>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">— Click to add as rep</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {(() => {
                                    // Build a map of email → { count, name }
                                    const peopleMap = new Map<string, { email: string; count: number; name: string }>();
                                    filteredTranscripts.forEach(t => {
                                        (t.participants || [t.host_email]).forEach((p: string | null) => {
                                            if (!p) return;
                                            const email = p.toLowerCase();
                                            const existing = peopleMap.get(email);
                                            if (existing) {
                                                existing.count++;
                                            } else {
                                                const namePart = email.split('@')[0].replace(/[._-]/g, ' ');
                                                const displayName = namePart.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                                                peopleMap.set(email, { email, count: 1, name: displayName });
                                            }
                                        });
                                    });
                                    // Sort: existing reps first, then by call count descending
                                    const people = Array.from(peopleMap.values()).sort((a, b) => {
                                        const aIsRep = existingRepEmails.has(a.email) ? 1 : 0;
                                        const bIsRep = existingRepEmails.has(b.email) ? 1 : 0;
                                        if (aIsRep !== bIsRep) return bIsRep - aIsRep;
                                        return b.count - a.count;
                                    });

                                    if (people.length === 0) {
                                        return (
                                            <div className="col-span-full text-center py-6">
                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">No participants found in filtered calls</p>
                                            </div>
                                        );
                                    }

                                    return people.map(person => {
                                        const isRep = existingRepEmails.has(person.email);
                                        const isAdding = addingRepEmail === person.email;
                                        return (
                                            <div
                                                key={person.email}
                                                className={cn(
                                                    "flex items-center gap-3 p-3 rounded-xl border transition-all group",
                                                    isRep
                                                        ? "bg-emerald-50/50 border-emerald-200"
                                                        : "bg-white border-slate-100 hover:border-indigo-200 hover:shadow-sm"
                                                )}
                                            >
                                                <Avatar className="w-8 h-8 shrink-0">
                                                    <AvatarFallback className={cn(
                                                        "text-[10px] font-black text-white",
                                                        isRep ? "bg-emerald-600" : "bg-slate-400"
                                                    )}>
                                                        {person.name.charAt(0).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[11px] font-black text-slate-900 truncate uppercase tracking-tight">
                                                            {person.name}
                                                        </span>
                                                        {isRep && (
                                                            <UserCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] text-slate-400 truncate">{person.email}</span>
                                                        <span className="text-[9px] font-bold text-slate-400">•</span>
                                                        <span className="text-[9px] font-bold text-indigo-500">{person.count} call{person.count !== 1 ? 's' : ''}</span>
                                                    </div>
                                                </div>
                                                {isRep ? (
                                                    <Badge className="bg-emerald-100 text-emerald-700 border-none text-[8px] font-black uppercase tracking-tight shrink-0">
                                                        Active Rep
                                                    </Badge>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 shrink-0 gap-1 transition-all"
                                                        disabled={isAdding}
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            setAddingRepEmail(person.email);
                                                            try {
                                                                await setDoc(doc(db, 'reps', person.email), {
                                                                    name: person.name,
                                                                    email: person.email,
                                                                    totalCalls: 0,
                                                                    avgScore: 0,
                                                                    isActive: true,
                                                                    createdAt: Timestamp.now()
                                                                });
                                                            } catch (err) {
                                                                console.error('Failed to add rep:', err);
                                                                alert('Failed to add representative');
                                                            } finally {
                                                                setAddingRepEmail(null);
                                                            }
                                                        }}
                                                    >
                                                        <UserPlus className="w-3 h-3" />
                                                        {isAdding ? 'Adding...' : 'Add Rep'}
                                                    </Button>
                                                )}
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4 mb-6">
                    <div className="relative flex-1 max-w-md">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Filter by title, rep, or participant..."
                            className="pl-10 h-11 bg-white border-slate-200 rounded-xl text-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <Card className="border-none shadow-sm bg-white overflow-hidden rounded-2xl">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow className="hover:bg-transparent border-slate-100 h-12">
                                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-8 w-48">Date & Time</TableHead>
                                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recording Title</TableHead>
                                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">People</TableHead>
                                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duration</TableHead>
                                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right pr-8">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTranscripts.map((t) => (
                                    <TableRow key={t.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors h-20 group cursor-pointer" onClick={() => handleViewDetails(t)}>
                                        <TableCell className="pl-8">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-900">{formatDate(t.date)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-bold text-slate-900 truncate max-w-[250px] uppercase tracking-tight">{t.title}</span>
                                                <Badge variant="outline" className={cn(
                                                    "text-[8px] font-black uppercase tracking-tighter",
                                                    (t as any).callCategory === 'call1' ? "bg-indigo-50 text-indigo-600 border-indigo-200"
                                                    : (t as any).callCategory === 'call2' ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                                    : "bg-slate-50 text-slate-500 border-slate-200"
                                                )}>
                                                    {(t as any).callCategory === 'call1' ? 'Call 1'
                                                     : (t as any).callCategory === 'call2' ? 'Call 2'
                                                     : 'Other'}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex -space-x-2">
                                                {(t.participants || [t.host_email]).slice(0, 3).map((p, i) => (
                                                    <Avatar key={i} className="w-8 h-8 border-2 border-white ring-0">
                                                        <AvatarFallback className={cn("text-[10px] font-black text-white", i === 0 ? "bg-indigo-600" : i === 1 ? "bg-purple-600" : "bg-slate-400")}>
                                                            {getInitials(p || '??')}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                ))}
                                                {(t.participants?.length || 0) > 3 && (
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-black text-slate-500">
                                                        +{t.participants!.length - 3}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                                    <Clock className="w-3 h-3" />
                                                    {formatDuration(t.duration)}
                                                </div>
                                                {(t.duration <= 30) && (
                                                    <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-[8px] font-black uppercase tracking-tight gap-1 py-0.5 px-2">
                                                        <AlertCircle className="w-2.5 h-2.5" />
                                                        No Words
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-8" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-2">
                                                {t.isAnalyzed ? (
                                                    <Badge variant="secondary" className="bg-green-50 text-green-700 border-none px-3 py-1 gap-1.5 font-bold text-[10px] uppercase tracking-tight">
                                                        <CheckCircle2 className="w-3 h-3" /> Analyzed
                                                    </Badge>
                                                ) : (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                size="sm"
                                                                className="h-9 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest px-4 rounded-xl shadow-md shadow-indigo-100"
                                                                disabled={analyzingId === t.id}
                                                            >
                                                                <Play className={cn("w-3 h-3 fill-current", analyzingId === t.id && "animate-spin")} />
                                                                {analyzingId === t.id ? 'Analyzing...' : 'Analyze'}
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-[220px] p-2 rounded-xl shadow-2xl border-slate-100">
                                                            <div className="px-2 py-1.5 mb-1">
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Framework</p>
                                                            </div>
                                                            <DropdownMenuItem
                                                                className="rounded-lg py-2.5 cursor-pointer font-bold text-slate-700 focus:bg-indigo-50 focus:text-indigo-700 gap-3"
                                                                onClick={() => handleAnalyze(t.id, 'evaluation')}
                                                            >
                                                                <Brain className="w-4 h-4" />
                                                                Agent: Call 1 (Evaluation)
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className="rounded-lg py-2.5 cursor-pointer font-bold text-slate-700 focus:bg-indigo-50 focus:text-indigo-700 gap-3"
                                                                onClick={() => handleAnalyze(t.id, 'followup')}
                                                            >
                                                                <RefreshCw className="w-4 h-4" />
                                                                Agent: Call 2 (Follow-up)
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}
                                                <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-slate-400 hover:text-indigo-600" onClick={() => window.open(t.transcript_url, '_blank')}>
                                                    <ExternalLink className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Transcript Details Dialog */}
            <Dialog open={!!selectedTranscript} onOpenChange={(open) => {
                if (!open) {
                    setSelectedTranscript(null);
                    setIsFullScreen(false);
                }
            }}>
                <DialogContent className={cn(
                    "flex flex-col p-0 overflow-hidden border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] bg-white ring-1 ring-slate-100/50 transition-all duration-300 ease-in-out sm:max-w-none",
                    isFullScreen
                        ? "fixed inset-0 w-screen h-screen rounded-none z-[100] translate-x-0 translate-y-0 left-0 top-0"
                        : "w-[95vw] max-w-7xl h-[92vh] rounded-[2rem] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                )}>
                    <DialogHeader className="px-8 py-4 bg-white border-b border-slate-50/50 shrink-0 relative">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Badge className="bg-indigo-600 text-white border-none font-black text-[9px] px-3 py-1 uppercase tracking-widest rounded-full shadow-lg shadow-indigo-100">
                                        Transcript
                                    </Badge>
                                    <div className="h-4 w-px bg-slate-200" />
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600">
                                            <Clock className="w-3 h-3" />
                                            {selectedTranscript && formatDuration(selectedTranscript.duration)}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400">
                                            <Users className="w-3 h-3" />
                                            {selectedTranscript?.participants?.length || 1} Participants
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 pr-8">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 rounded-lg border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all gap-2 px-3 shadow-sm"
                                        onClick={() => setIsFullScreen(!isFullScreen)}
                                    >
                                        {isFullScreen ? (
                                            <>
                                                <ArrowUpDown className="w-3.5 h-3.5 transform rotate-45" />
                                                <span className="text-[9px] font-black uppercase tracking-widest">Minimize</span>
                                            </>
                                        ) : (
                                            <>
                                                <ExternalLink className="w-3.5 h-3.5" />
                                                <span className="text-[9px] font-black uppercase tracking-widest">Full Screen</span>
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                            <DialogTitle className="text-xl font-black text-slate-900 tracking-tight font-outfit uppercase leading-tight max-w-4xl truncate">
                                {selectedTranscript?.title}
                            </DialogTitle>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden flex bg-white min-h-0">
                        {/* Sidebar: Participants */}
                        <div className={cn(
                            "shrink-0 border-r border-slate-100/50 p-6 bg-slate-50/30 overflow-y-auto transition-all",
                            isFullScreen ? "w-80" : "w-64"
                        )}>
                            <div className="space-y-8">
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-1 h-4 bg-indigo-600 rounded-full" />
                                        <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Call Roster</h3>
                                    </div>
                                    <div className="space-y-3">
                                        {(selectedTranscript?.participants || [selectedTranscript?.host_email]).map((p, i) => (
                                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                                                <Avatar className="w-8 h-8 rounded-lg shadow-inner relative z-10 shrink-0">
                                                    <AvatarFallback className={cn("text-[10px] font-black text-white", i === 0 ? "bg-indigo-600" : i === 1 ? "bg-purple-600" : "bg-teal-600")}>
                                                        {getInitials(p || '??')}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col min-w-0 relative z-10">
                                                    <span className="text-[11px] font-black text-slate-900 truncate uppercase tracking-tight">{p?.split('@')[0]}</span>
                                                    <span className="text-[9px] font-bold text-slate-400 truncate opacity-70 italic">{p}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-5 rounded-2xl bg-indigo-600 text-white relative overflow-hidden shadow-xl shadow-indigo-100">
                                    <Brain className="w-5 h-5 mb-3 opacity-50" />
                                    <h4 className="text-[11px] font-black uppercase tracking-widest mb-1">AI Ready</h4>
                                    <p className="text-[9px] font-bold opacity-80 leading-relaxed uppercase tracking-widest">Transcript processed successfully.</p>
                                </div>
                            </div>
                        </div>

                        {/* Main: Transcript */}
                        <div className="flex-1 flex flex-col min-w-0 bg-white">
                            <div className="px-8 py-3 bg-slate-50/50 border-b border-slate-100 shrink-0">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <MessageSquare className="w-4 h-4 text-slate-400" />
                                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Conversation Record</h3>
                                    </div>
                                    <div className="relative w-72">
                                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                        <Input
                                            placeholder="Find keywords in script..."
                                            className="pl-9 h-8 bg-white border-slate-200 rounded-lg text-[12px] font-medium"
                                            value={transcriptSearch}
                                            onChange={(e) => setTranscriptSearch(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
                                <div className="px-8 py-8">
                                    {loadingDetails ? (
                                        <div className="h-full flex flex-col items-center justify-center space-y-6 py-32">
                                            <div className="relative">
                                                <div className="h-12 w-12 rounded-full border-4 border-slate-100 border-t-indigo-600 animate-spin" />
                                                <Brain className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-indigo-600 opacity-50" />
                                            </div>
                                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Accessing Transcripts...</p>
                                        </div>
                                    ) : selectedTranscript?.sentences && selectedTranscript.sentences.length > 0 ? (
                                        <div className="space-y-10 pb-24 max-w-4xl mx-auto">
                                            {selectedTranscript.sentences.filter(s =>
                                                !transcriptSearch || s.text.toLowerCase().includes(transcriptSearch.toLowerCase()) || (s.speaker_name || '').toLowerCase().includes(transcriptSearch.toLowerCase())
                                            ).map((s, i) => (
                                                <div key={i} className="group relative">
                                                    <div className="flex items-start gap-6">
                                                        <div className="w-16 shrink-0 pt-1 sticky top-0">
                                                            <span className="text-[10px] font-black text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-100 tabular-nums inline-block w-full text-center shadow-xs">
                                                                {Math.floor(s.start_time / 60)}:{(Math.floor(s.start_time % 60)).toString().padStart(2, '0')}
                                                            </span>
                                                        </div>

                                                        <div className="flex-1 min-w-0 space-y-2">
                                                            <div className="flex items-center gap-2">
                                                                <div className="h-1.5 w-1.5 rounded-full bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.5)]" />
                                                                <span className="text-[11px] font-black text-indigo-600 uppercase tracking-tight">
                                                                    {highlightText(s.speaker_name || 'Prospect', transcriptSearch)}
                                                                </span>
                                                            </div>
                                                            <div className="bg-white border border-slate-100 p-6 rounded-2xl rounded-tl-none shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:bg-slate-50/20 group-hover:border-indigo-100/50">
                                                                <p className="text-[15px] text-slate-600 leading-relaxed font-medium tracking-tight whitespace-normal">
                                                                    {highlightText(s.text, transcriptSearch)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-32 space-y-5">
                                            <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center">
                                                <AlertCircle className="w-8 h-8 text-amber-500" />
                                            </div>
                                            <div className="text-center space-y-2">
                                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">No Words Detected</h3>
                                                <p className="text-xs text-slate-400 font-medium max-w-sm">
                                                    This call recording appears to have no spoken content. This can happen when a meeting starts but no one speaks,
                                                    or the recording failed to capture audio.
                                                </p>
                                            </div>
                                            <Badge className="bg-amber-50 text-amber-600 border-amber-200 text-[9px] font-black uppercase tracking-widest px-4 py-1.5 gap-1.5">
                                                <Clock className="w-3 h-3" />
                                                Duration: {selectedTranscript && formatDuration(selectedTranscript.duration)}
                                            </Badge>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
