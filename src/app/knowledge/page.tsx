'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { FileText, Trash2, Upload, AlertCircle, Loader2, Layers, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function KnowledgeBasePage() {
    const [docs, setDocs] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchDocs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/rag/documents');
            if (res.ok) {
                const data = await res.json();
                setDocs(data);
            }
        } catch (err) {
            console.error('Failed to fetch docs:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDocs();
    }, [fetchDocs]);

    const handleUpload = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf';
        input.onchange = async (e: any) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setUploading(true);
            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('useInCall1', 'true');
                formData.append('useInCall2', 'true');

                const response = await fetch('/api/rag/documents', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    const errObj = await response.json();
                    throw new Error(errObj.error || 'Upload failed');
                }

                await fetchDocs();
            } catch (err: any) {
                console.error(err);
                alert(`Upload failed: ${err.message}`);
            } finally {
                setUploading(false);
            }
        };
        input.click();
    };

    const handleDelete = async (docId: string, docName: string) => {
        if (!confirm(`Are you sure you want to permanently delete "${docName}"?`)) return;
        try {
            const res = await fetch(`/api/rag/documents/${docId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error("Failed to delete document");
            await fetchDocs();
        } catch (err) {
            console.error(err);
            alert("Failed to delete document.");
        }
    };

    const handleToggleCall = async (docObj: any, callType: 'call1' | 'call2') => {
        try {
            const field = callType === 'call1' ? 'useInCall1' : 'useInCall2';
            const updatedDoc = { ...docObj, [field]: !docObj[field] };
            
            setDocs(docs.map(d => d.id === docObj.id ? updatedDoc : d));

            await fetch(`/api/rag/documents/${docObj.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedDoc)
            });
        } catch (err) {
            console.error(err);
            await fetchDocs();
        }
    };

    if (loading && docs.length === 0) {
        return (
            <div className="p-8 animate-pulse max-w-5xl mx-auto">
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
                    <p className="text-slate-500 mt-1">Manage documents used by the AI RAG engine for evaluation context.</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={fetchDocs}
                        disabled={loading}
                    >
                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                        Refresh
                    </Button>
                    <Button
                        className="bg-indigo-600 hover:bg-indigo-700 gap-2"
                        onClick={handleUpload}
                        disabled={uploading}
                    >
                        {uploading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Upload className="w-4 h-4" />
                        )}
                        {uploading ? 'Vectorizing...' : 'Upload Framework PDF'}
                    </Button>
                </div>
            </div>

            <div className="grid gap-6">
                {docs.length === 0 ? (
                    <Card className="border-dashed border-2 bg-slate-50/50">
                        <CardContent className="flex flex-col items-center py-12 text-center">
                            <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
                            <h3 className="text-lg font-semibold text-slate-900">No documents found</h3>
                            <p className="text-slate-500 max-w-xs">
                                Upload your sales call frameworks and scripts so the AI can reference them via RAG.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    docs.map((docItem) => (
                        <Card key={docItem.id} className="overflow-hidden transition-colors border-slate-200 hover:border-indigo-200">
                            <CardContent className="p-0">
                                <div className="flex items-center p-6 gap-6">
                                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <FileText className="w-6 h-6 text-indigo-600" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-slate-900 truncate">{docItem.name}</h3>
                                            <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[10px] px-2 py-0.5 font-bold uppercase tracking-widest">
                                                Active
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-3 mt-2">
                                            <div className="flex items-center gap-1.5 text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md">
                                                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                                                <span className="text-xs font-semibold">{docItem.chunkCount} vector chunks</span>
                                            </div>
                                            <span className="text-xs text-slate-400 font-medium">Uploaded {new Date(docItem.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 border-l border-slate-100 pl-6">
                                        {/* Call 1 Toggle */}
                                        <div className="flex flex-col items-center gap-1.5">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Call 1</span>
                                            <Switch
                                                checked={docItem.useInCall1}
                                                onCheckedChange={() => handleToggleCall(docItem, 'call1')}
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
                                                onCheckedChange={() => handleToggleCall(docItem, 'call2')}
                                            />
                                            <span className={cn(
                                                "text-[9px] font-bold uppercase tracking-widest",
                                                docItem.useInCall2 ? "text-emerald-500" : "text-slate-300"
                                            )}>
                                                {docItem.useInCall2 ? 'Follow-up' : 'Off'}
                                            </span>
                                        </div>

                                        <div className="flex flex-col border-l border-slate-100 pl-6">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                onClick={() => handleDelete(docItem.id, docItem.name)}
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
