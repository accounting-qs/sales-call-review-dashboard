import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Trash2, RefreshCw, Clock, ShieldCheck, AlertTriangle } from 'lucide-react';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { collection, onSnapshot, doc, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';

interface GeminiFileStatus {
    name: string;
    displayName: string;
    state: string;
    expirationTime: string | null;
}

function getExpirationInfo(expiresAt: string | null | undefined, geminiStatus?: GeminiFileStatus) {
    const expStr = geminiStatus?.expirationTime || expiresAt;
    if (!expStr) return { label: 'Unknown', color: 'text-slate-400', urgency: 'unknown' as const };

    const expiresMs = new Date(expStr).getTime();
    const nowMs = Date.now();
    const diffMs = expiresMs - nowMs;

    if (diffMs <= 0) {
        return { label: 'Expired', color: 'text-red-600', urgency: 'expired' as const };
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours < 6) {
        return { label: `${hours}h ${minutes}m left`, color: 'text-red-500', urgency: 'critical' as const };
    } else if (hours < 24) {
        return { label: `${hours}h ${minutes}m left`, color: 'text-amber-500', urgency: 'warning' as const };
    } else {
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        return { label: `${days}d ${remainingHours}h left`, color: 'text-emerald-500', urgency: 'safe' as const };
    }
}

export function RAGDocsSection() {
    const [docs, setDocs] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [geminiStatuses, setGeminiStatuses] = useState<Map<string, GeminiFileStatus>>(new Map());
    const [loadingStatuses, setLoadingStatuses] = useState(false);
    const [renewingId, setRenewingId] = useState<string | null>(null);

    // Fetch docs from Firestore
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'knowledge_base'), (snap) => {
            const arr = snap.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    ...data,
                    useInCall1: data.useInCall1 ?? data.isActive ?? true,
                    useInCall2: data.useInCall2 ?? data.isActive ?? true,
                };
            });
            setDocs(arr);
        });
        return () => unsub();
    }, []);

    // Fetch live Gemini file statuses
    const fetchStatuses = useCallback(async () => {
        setLoadingStatuses(true);
        try {
            const res = await fetch('/api/rag/status');
            if (res.ok) {
                const data = await res.json();
                const map = new Map<string, GeminiFileStatus>();
                for (const f of data.files) {
                    map.set(f.name, f);
                }
                setGeminiStatuses(map);
            }
        } catch (err) {
            console.error('Failed to fetch Gemini statuses:', err);
        } finally {
            setLoadingStatuses(false);
        }
    }, []);

    useEffect(() => {
        fetchStatuses();
        // Refresh every 5 minutes
        const interval = setInterval(fetchStatuses, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchStatuses]);

    const handleUpload = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.txt,.docx';
        input.onchange = async (e: any) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setUploading(true);
            try {
                const sizeKB = Math.round(file.size / 1024);
                const sizeStr = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;
                
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch('/api/rag/upload', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    const errObj = await response.json();
                    throw new Error(errObj.error || 'Upload failed');
                }

                const data = await response.json();
                const geminiFile = data.file;

                await addDoc(collection(db, 'knowledge_base'), {
                    name: file.name,
                    sizeStr,
                    status: geminiFile.state === 'PROCESSING' ? 'Indexing...' : 'Active',
                    geminiFileId: geminiFile.name,
                    geminiFileUri: geminiFile.uri,
                    mimeType: geminiFile.mimeType,
                    chunks: 'Managed by Gemini',
                    uploadedAt: new Date().toISOString(),
                    expiresAt: geminiFile.expirationTime || null,
                    fileBase64: data.fileBase64 || null,
                    useInCall1: true,
                    useInCall2: true,
                });

                // Refresh statuses to show new expiration
                await fetchStatuses();
            } catch (err: any) {
                console.error(err);
                alert(`Upload failed: ${err.message}`);
            } finally {
                setUploading(false);
            }
        };
        input.click();
    };

    const handleDelete = async (docObj: any) => {
        if (!confirm(`Are you sure you want to permanently delete ${docObj.name}?`)) return;
        try {
            if (docObj.geminiFileId) {
                const res = await fetch('/api/rag/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileName: docObj.geminiFileId })
                });
                if (!res.ok) {
                    console.warn("Failed to delete from Gemini, proceeding.");
                }
            }
            await deleteDoc(doc(db, 'knowledge_base', docObj.id));
        } catch (err) {
            console.error(err);
            alert("Failed to delete document.");
        }
    };

    const handleToggleCall = async (id: string, callType: 'call1' | 'call2', currentValue: boolean) => {
        try {
            const field = callType === 'call1' ? 'useInCall1' : 'useInCall2';
            await updateDoc(doc(db, 'knowledge_base', id), { [field]: !currentValue });
        } catch (err) {
            console.error(err);
        }
    };

    const handleRenew = async (docObj: any) => {
        if (!docObj.fileBase64) {
            alert('This document does not have a backup. Please re-upload it manually.');
            return;
        }
        setRenewingId(docObj.id);
        try {
            const res = await fetch('/api/rag/renew', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ docId: docObj.id })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Renewal failed');
            }
            await fetchStatuses();
        } catch (err: any) {
            console.error(err);
            alert(`Renewal failed: ${err.message}`);
        } finally {
            setRenewingId(null);
        }
    };

    return (
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-indigo-50/50 bg-indigo-50/30 px-8 py-6">
                <div>
                    <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-900">Reference Documents</CardTitle>
                    <CardDescription className="text-[11px] font-bold uppercase tracking-widest mt-1 text-slate-500">Upload PDFs for AI to use as context via RAG</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 px-4 text-[10px] font-bold uppercase tracking-widest rounded-xl gap-1.5"
                        onClick={fetchStatuses}
                        disabled={loadingStatuses}
                    >
                        <RefreshCw className={cn("w-3 h-3", loadingStatuses && "animate-spin")} />
                        {loadingStatuses ? 'Checking...' : 'Check Status'}
                    </Button>
                    <Button 
                        className="bg-indigo-600 hover:bg-indigo-700 h-10 px-6 font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-indigo-100 gap-2"
                        onClick={handleUpload}
                        disabled={uploading}
                    >
                        <Upload className="w-3.5 h-3.5" />
                        {uploading ? 'Uploading...' : 'Upload Document'}
                    </Button>
                </div>
            </CardHeader>

            {/* Auto-renewal info banner */}
            <div className="px-8 py-3 bg-gradient-to-r from-indigo-50/80 to-emerald-50/50 border-b border-indigo-100/30 flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                <p className="text-[11px] text-slate-600">
                    <span className="font-semibold text-slate-700">Auto-Renewal Active</span> — Gemini files expire every 48h. 
                    Files are backed up to Firebase Storage and auto-renewed via cron job before expiration.
                </p>
            </div>

            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow className="border-slate-100 h-12">
                            <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-8 w-[28%]">Document Name</TableHead>
                            <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Size</TableHead>
                            <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</TableHead>
                            <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gemini Expiration</TableHead>
                            <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Call 1</TableHead>
                            <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Call 2</TableHead>
                            <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right pr-8">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {docs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-12 text-slate-500 font-medium text-sm">
                                    No documents uploaded yet. Add a PDF to get started.
                                </TableCell>
                            </TableRow>
                        ) : docs.map(d => {
                            const geminiStatus = d.geminiFileId ? geminiStatuses.get(d.geminiFileId) : undefined;
                            const expInfo = getExpirationInfo(d.expiresAt, geminiStatus);
                            const isRenewing = renewingId === d.id;
                            const isExpired = expInfo.urgency === 'expired';
                            const isMissing = d.geminiFileId && !geminiStatus && geminiStatuses.size > 0;

                            return (
                                <TableRow key={d.id} className={cn(
                                    "border-slate-50 transition-colors h-[72px]",
                                    isExpired || isMissing ? "bg-red-50/30 hover:bg-red-50/50" : "hover:bg-slate-50/50"
                                )}>
                                    <TableCell className="pl-8">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-900 text-sm">{d.name}</span>
                                            {d.fileBase64 ? (
                                                <span className="text-[9px] text-emerald-500 font-semibold flex items-center gap-1 mt-0.5">
                                                    <ShieldCheck className="w-2.5 h-2.5" /> Backup saved
                                                </span>
                                            ) : (
                                                <span className="text-[9px] text-amber-500 font-semibold flex items-center gap-1 mt-0.5">
                                                    <AlertTriangle className="w-2.5 h-2.5" /> No backup
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-xs font-medium text-slate-600">{d.sizeStr}</span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={cn(
                                            "text-[10px] px-2 py-0.5 font-bold uppercase tracking-widest",
                                            d.status === 'Indexing...' ? "bg-amber-50 text-amber-600 border-amber-100 animate-pulse" 
                                                : isExpired || isMissing ? "bg-red-50 text-red-600 border-red-100"
                                                : "bg-green-50 text-green-600 border-green-100"
                                        )}>
                                            {isMissing ? 'Expired' : d.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col items-start gap-1">
                                            <div className="flex items-center gap-1.5">
                                                <Clock className={cn("w-3 h-3", expInfo.color)} />
                                                <span className={cn("text-xs font-semibold", expInfo.color)}>
                                                    {isMissing ? 'Expired' : expInfo.label}
                                                </span>
                                            </div>
                                            {(isExpired || isMissing || expInfo.urgency === 'critical') && d.fileBase64 && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-6 px-2 text-[9px] font-bold uppercase tracking-widest rounded-md border-indigo-200 text-indigo-600 hover:bg-indigo-50 gap-1"
                                                    onClick={() => handleRenew(d)}
                                                    disabled={isRenewing}
                                                >
                                                    <RefreshCw className={cn("w-2.5 h-2.5", isRenewing && "animate-spin")} />
                                                    {isRenewing ? 'Renewing...' : 'Renew Now'}
                                                </Button>
                                            )}
                                            {d.lastRenewedAt && (
                                                <span className="text-[9px] text-slate-400">
                                                    Last renewed: {new Date(d.lastRenewedAt).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <Switch 
                                                checked={d.useInCall1} 
                                                onCheckedChange={() => handleToggleCall(d.id, 'call1', d.useInCall1)} 
                                            />
                                            <span className={cn(
                                                "text-[9px] font-bold uppercase tracking-widest",
                                                d.useInCall1 ? "text-indigo-500" : "text-slate-300"
                                            )}>
                                                {d.useInCall1 ? 'On' : 'Off'}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <Switch 
                                                checked={d.useInCall2} 
                                                onCheckedChange={() => handleToggleCall(d.id, 'call2', d.useInCall2)} 
                                            />
                                            <span className={cn(
                                                "text-[9px] font-bold uppercase tracking-widest",
                                                d.useInCall2 ? "text-emerald-500" : "text-slate-300"
                                            )}>
                                                {d.useInCall2 ? 'On' : 'Off'}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-8">
                                        <div className="flex items-center justify-end gap-1">
                                            {d.fileBase64 && (
                                                <Button
                                                    onClick={() => handleRenew(d)}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                                    disabled={isRenewing}
                                                    title="Renew Gemini file"
                                                >
                                                    <RefreshCw className={cn("w-4 h-4", isRenewing && "animate-spin")} />
                                                </Button>
                                            )}
                                            <Button 
                                                onClick={() => handleDelete(d)} 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
