import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Trash2, RefreshCw, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RAGDocsSection() {
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
        if (!confirm(`Are you sure you want to permanently delete ${docName}?`)) return;
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
            
            // Optimistic update
            setDocs(docs.map(d => d.id === docObj.id ? updatedDoc : d));

            await fetch(`/api/rag/documents/${docObj.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedDoc)
            });
        } catch (err) {
            console.error(err);
            fetchDocs(); // Revert on failure
        }
    };

    return (
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-indigo-50/50 bg-indigo-50/30 px-8 py-6">
                <div>
                    <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-900">Reference Documents</CardTitle>
                    <CardDescription className="text-[11px] font-bold uppercase tracking-widest mt-1 text-slate-500">Upload PDFs for AI to use as context via pgvector</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 px-4 text-[10px] font-bold uppercase tracking-widest rounded-xl gap-1.5"
                        onClick={fetchDocs}
                        disabled={loading}
                    >
                        <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </Button>
                    <Button 
                        className="bg-indigo-600 hover:bg-indigo-700 h-10 px-6 font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-indigo-100 gap-2"
                        onClick={handleUpload}
                        disabled={uploading}
                    >
                        <Upload className="w-3.5 h-3.5" />
                        {uploading ? 'Uploading...' : 'Upload PDF'}
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow className="border-slate-100 h-12">
                            <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-8 w-[40%]">Document Name</TableHead>
                            <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vector Chunks</TableHead>
                            <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</TableHead>
                            <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Call 1</TableHead>
                            <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Call 2</TableHead>
                            <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right pr-8">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {docs.length === 0 && !loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12 text-slate-500 font-medium text-sm">
                                    No documents uploaded yet. Add a PDF to get started with RAG.
                                </TableCell>
                            </TableRow>
                        ) : docs.map(d => (
                            <TableRow key={d.id} className="border-slate-50 transition-colors h-[72px] hover:bg-slate-50/50">
                                <TableCell className="pl-8">
                                    <span className="font-bold text-slate-900 text-sm">{d.name}</span>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1.5 text-slate-600">
                                        <Layers className="w-4 h-4 text-indigo-400" />
                                        <span className="text-xs font-semibold">{d.chunkCount} chunks</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge className="text-[10px] px-2 py-0.5 font-bold uppercase tracking-widest bg-emerald-50 text-emerald-600 border-emerald-100">
                                        Active
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                    <div className="flex flex-col items-center gap-1">
                                        <Switch 
                                            checked={d.useInCall1} 
                                            onCheckedChange={() => handleToggleCall(d, 'call1')} 
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
                                            onCheckedChange={() => handleToggleCall(d, 'call2')} 
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
                                    <Button 
                                        onClick={() => handleDelete(d.id, d.name)} 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
