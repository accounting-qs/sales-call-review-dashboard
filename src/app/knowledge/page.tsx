'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useKnowledge } from '@/lib/hooks/useKnowledge';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { FileText, Trash2, Upload, AlertCircle, Loader2, Clock, RefreshCw, ShieldCheck, AlertTriangle } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { cn } from '@/lib/utils';

interface GeminiFileStatus {
    name: string;
    displayName: string;
    state: string;
    expirationTime: string | null;
}

function getExpirationInfo(expiresAt: string | null | undefined, geminiStatus?: GeminiFileStatus) {
    const expStr = geminiStatus?.expirationTime || expiresAt;
    if (!expStr) return { label: 'Unknown', color: 'text-slate-400', urgency: 'unknown' as const, bgColor: 'bg-slate-50' };

    const expiresMs = new Date(expStr).getTime();
    const diffMs = expiresMs - Date.now();

    if (diffMs <= 0) {
        return { label: 'Expired', color: 'text-red-600', urgency: 'expired' as const, bgColor: 'bg-red-50' };
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours < 6) {
        return { label: `${hours}h ${minutes}m`, color: 'text-red-500', urgency: 'critical' as const, bgColor: 'bg-red-50' };
    } else if (hours < 24) {
        return { label: `${hours}h ${minutes}m`, color: 'text-amber-500', urgency: 'warning' as const, bgColor: 'bg-amber-50' };
    } else {
        const days = Math.floor(hours / 24);
        const rh = hours % 24;
        return { label: `${days}d ${rh}h`, color: 'text-emerald-500', urgency: 'safe' as const, bgColor: 'bg-emerald-50' };
    }
}

export default function KnowledgeBasePage() {
    const { docs, loading, toggleDocForCall, deleteReferenceDoc } = useKnowledge();
    const [uploading, setUploading] = useState(false);
    const [geminiStatuses, setGeminiStatuses] = useState<Map<string, GeminiFileStatus>>(new Map());
    const [renewingId, setRenewingId] = useState<string | null>(null);

    const fetchStatuses = useCallback(async () => {
        try {
            const res = await fetch('/api/rag/status');
            if (res.ok) {
                const data = await res.json();
                const map = new Map<string, GeminiFileStatus>();
                for (const f of data.files) map.set(f.name, f);
                setGeminiStatuses(map);
            }
        } catch {}
    }, []);

    useEffect(() => {
        fetchStatuses();
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
                    storagePath: data.storagePath || null,
                    useInCall1: true,
                    useInCall2: true,
                });

                await fetchStatuses();
            } catch (error: any) {
                console.error('[Knowledge] Upload error:', error);
                alert(`Upload failed: ${error.message}`);
            } finally {
                setUploading(false);
            }
        };
        input.click();
    };

    const handleDelete = async (docObj: any) => {
        if (!confirm(`Are you sure you want to permanently delete "${docObj.name}"?`)) return;
        try {
            await deleteReferenceDoc(docObj);
        } catch {
            alert('Failed to delete document.');
        }
    };

    const handleRenew = async (docObj: any) => {
        if (!docObj.storagePath) {
            alert('No backup available. Please re-upload the file manually.');
            return;
        }
        setRenewingId(docObj.id);
        try {
            const res = await fetch('/api/rag/renew', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    docId: docObj.id,
                    storagePath: docObj.storagePath,
                    fileName: docObj.name,
                    mimeType: docObj.mimeType,
                }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Renewal failed');
            }
            await fetchStatuses();
        } catch (err: any) {
            alert(`Renewal failed: ${err.message}`);
        } finally {
            setRenewingId(null);
        }
    };

    if (loading) {
        return (
            <div className="p-8 animate-pulse">
                <div className="h-8 bg-slate-100 w-48 mb-6 rounded" />
                <div className="grid gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-24 bg-slate-50 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Knowledge Base</h1>
                    <p className="text-slate-500 mt-1">Manage documents used by Gemini for sales call analysis RAG.</p>
                </div>
                <Button
                    className="bg-indigo-600 hover:bg-indigo-700"
                    onClick={handleUpload}
                    disabled={uploading}
                >
                    {uploading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Upload className="w-4 h-4 mr-2" />
                    )}
                    {uploading ? 'Uploading...' : 'Upload Framework'}
                </Button>
            </div>

            {/* Auto-renewal info */}
            <div className="mb-6 px-5 py-3 bg-gradient-to-r from-indigo-50/80 to-emerald-50/50 rounded-xl border border-indigo-100/50 flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                <p className="text-[12px] text-slate-600">
                    <span className="font-semibold text-slate-700">Auto-Renewal Active</span> — Gemini files expire every 48h. 
                    Files with backups are automatically renewed. Files without backups need manual re-upload.
                </p>
            </div>

            <div className="grid gap-6">
                {docs.length === 0 ? (
                    <Card className="border-dashed border-2 bg-slate-50/50">
                        <CardContent className="flex flex-col items-center py-12 text-center">
                            <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
                            <h3 className="text-lg font-semibold text-slate-900">No documents found</h3>
                            <p className="text-slate-500 max-w-xs">
                                Upload your sales call frameworks and scripts so the AI can reference them during analysis.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    docs.map((docItem) => {
                        const geminiStatus = docItem.geminiFileId ? geminiStatuses.get(docItem.geminiFileId) : undefined;
                        const expInfo = getExpirationInfo(docItem.expiresAt, geminiStatus);
                        const isRenewing = renewingId === docItem.id;
                        const isExpired = expInfo.urgency === 'expired';
                        const isMissing = docItem.geminiFileId && !geminiStatus && geminiStatuses.size > 0;

                        return (
                            <Card key={docItem.id} className={cn(
                                "overflow-hidden transition-colors",
                                isExpired || isMissing 
                                    ? "border-red-200 hover:border-red-300 bg-red-50/20" 
                                    : "border-slate-200 hover:border-indigo-200"
                            )}>
                                <CardContent className="p-0">
                                    <div className="flex items-center p-6 gap-6">
                                        <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <FileText className="w-6 h-6 text-indigo-600" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold text-slate-900 truncate">{docItem.name}</h3>
                                                <Badge
                                                    className={cn(
                                                        "text-[10px] px-2 py-0.5 font-bold uppercase tracking-widest",
                                                        isExpired || isMissing
                                                            ? "bg-red-50 text-red-600 border-red-100"
                                                            : docItem.status === 'Indexing...'
                                                                ? "bg-amber-50 text-amber-600 border-amber-100 animate-pulse"
                                                                : "bg-green-50 text-green-600 border-green-100"
                                                    )}
                                                >
                                                    {isMissing ? 'Expired' : docItem.status}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-xs text-slate-400">
                                                    {docItem.sizeStr || 'Unknown'} • {docItem.mimeType || 'document'}
                                                </span>
                                                {docItem.storagePath ? (
                                                    <span className="text-[9px] text-emerald-500 font-semibold flex items-center gap-0.5">
                                                        <ShieldCheck className="w-2.5 h-2.5" /> Backed up
                                                    </span>
                                                ) : (
                                                    <span className="text-[9px] text-amber-500 font-semibold flex items-center gap-0.5">
                                                        <AlertTriangle className="w-2.5 h-2.5" /> No backup
                                                    </span>
                                                )}
                                            </div>
                                            {/* Expiration countdown */}
                                            <div className="flex items-center gap-2 mt-2">
                                                <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold", expInfo.bgColor)}>
                                                    <Clock className={cn("w-3 h-3", expInfo.color)} />
                                                    <span className={expInfo.color}>
                                                        {isMissing ? 'File expired from Gemini' : expInfo.label}
                                                    </span>
                                                </div>
                                                {(isExpired || isMissing || expInfo.urgency === 'critical') && docItem.storagePath && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-5 px-2 text-[9px] font-bold uppercase tracking-widest rounded border-indigo-200 text-indigo-600 hover:bg-indigo-50 gap-1"
                                                        onClick={() => handleRenew(docItem)}
                                                        disabled={isRenewing}
                                                    >
                                                        <RefreshCw className={cn("w-2.5 h-2.5", isRenewing && "animate-spin")} />
                                                        {isRenewing ? 'Renewing...' : 'Renew'}
                                                    </Button>
                                                )}
                                                {docItem.lastRenewedAt && (
                                                    <span className="text-[9px] text-slate-400">
                                                        Renewed: {new Date(docItem.lastRenewedAt).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6 border-l border-slate-100 pl-6">
                                            {/* Call 1 Toggle */}
                                            <div className="flex flex-col items-center gap-1.5">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Call 1</span>
                                                <Switch
                                                    checked={docItem.useInCall1}
                                                    onCheckedChange={() => toggleDocForCall(docItem.id, 'call1', docItem.useInCall1)}
                                                />
                                                <span className={cn(
                                                    "text-[9px] font-bold uppercase tracking-widest",
                                                    docItem.useInCall1 ? "text-indigo-500" : "text-slate-300"
                                                )}>
                                                    {docItem.useInCall1 ? 'Eval' : 'Off'}
                                                </span>
                                            </div>

                                            {/* Call 2 Toggle */}
                                            <div className="flex flex-col items-center gap-1.5">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Call 2</span>
                                                <Switch
                                                    checked={docItem.useInCall2}
                                                    onCheckedChange={() => toggleDocForCall(docItem.id, 'call2', docItem.useInCall2)}
                                                />
                                                <span className={cn(
                                                    "text-[9px] font-bold uppercase tracking-widest",
                                                    docItem.useInCall2 ? "text-emerald-500" : "text-slate-300"
                                                )}>
                                                    {docItem.useInCall2 ? 'Follow-up' : 'Off'}
                                                </span>
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                {docItem.storagePath && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50"
                                                        onClick={() => handleRenew(docItem)}
                                                        disabled={isRenewing}
                                                        title="Renew Gemini file"
                                                    >
                                                        <RefreshCw className={cn("w-4 h-4", isRenewing && "animate-spin")} />
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                    onClick={() => handleDelete(docItem)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>
        </div>
    );
}
