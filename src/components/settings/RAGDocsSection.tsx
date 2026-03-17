import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Trash2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { collection, onSnapshot, doc, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';

export function RAGDocsSection() {
    const [docs, setDocs] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'knowledge_base'), (snap) => {
            const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setDocs(arr);
        });
        return () => unsub();
    }, []);

    const handleUpload = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.txt,.docx';
        input.onchange = async (e: any) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setUploading(true);
            try {
                // Formatting size for UI
                const sizeKB = Math.round(file.size / 1024);
                const sizeStr = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;
                
                // 1. Upload exactly to Google Gemini API
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch('/api/rag/upload', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    const errObj = await response.json();
                    throw new Error(errObj.error || 'Upload failed due to an unknown server error.');
                }

                const data = await response.json();
                const geminiFile = data.file;

                // 2. Save reference into Firebase
                await addDoc(collection(db, 'knowledge_base'), {
                    name: file.name,
                    sizeStr,
                    status: geminiFile.state === 'PROCESSING' ? 'Indexing...' : 'Active',
                    geminiFileId: geminiFile.name, // E.g., 'files/123xyz'
                    geminiFileUri: geminiFile.uri, // E.g., 'https://generativelanguage.googleapis.com/.../123xyz'
                    mimeType: geminiFile.mimeType,
                    chunks: 'Managed by Gemini', // Gemini abstracts chunking completely out
                    uploadedAt: new Date().toISOString(),
                    isActive: true
                });
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
            // If it has a Gemini ID, wipe it from Google servers first
            if (docObj.geminiFileId) {
                const res = await fetch('/api/rag/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileName: docObj.geminiFileId })
                });
                if (!res.ok) {
                    console.warn("Failed to delete from Gemini File API, but proceeding to remove from Firebase.");
                }
            }
            
            // Delete from UI database
            await deleteDoc(doc(db, 'knowledge_base', docObj.id));
        } catch (err) {
            console.error(err);
            alert("Failed to delete document.");
        }
    };

    const handleToggle = async (id: string, current: boolean) => {
        try {
            await updateDoc(doc(db, 'knowledge_base', id), {
                isActive: !current
            });
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-indigo-50/50 bg-indigo-50/30 px-8 py-6">
                <div>
                    <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-900">Reference Documents</CardTitle>
                    <CardDescription className="text-[11px] font-bold uppercase tracking-widest mt-1 text-slate-500">Upload PDFs for AI to use as context via RAG</CardDescription>
                </div>
                <Button 
                    className="bg-indigo-600 hover:bg-indigo-700 h-10 px-6 font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-indigo-100 gap-2"
                    onClick={handleUpload}
                    disabled={uploading}
                >
                    <Upload className="w-3.5 h-3.5" />
                    {uploading ? 'Uploading...' : 'Upload Document'}
                </Button>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow className="border-slate-100 h-12">
                            <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-8 w-1/3">Document Name</TableHead>
                            <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Size / Chunks</TableHead>
                            <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</TableHead>
                            <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Use in AI Review</TableHead>
                            <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right pr-8">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {docs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-12 text-slate-500 font-medium text-sm">
                                    No documents uploaded yet. Add a PDF to get started.
                                </TableCell>
                            </TableRow>
                        ) : docs.map(d => (
                            <TableRow key={d.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors h-16">
                                <TableCell className="pl-8 font-bold text-slate-900 text-sm">{d.name}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-medium text-slate-600">{d.sizeStr}</span>
                                        <span className="text-[10px] text-slate-400">{d.chunks || 'Managed by Gemini'}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge className={cn(
                                        "text-[10px] px-2 py-0.5 font-bold uppercase tracking-widest",
                                        d.status === 'Indexing...' ? "bg-amber-50 text-amber-600 border-amber-100 animate-pulse" : "bg-green-50 text-green-600 border-green-100"
                                    )}>
                                        {d.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Switch 
                                        checked={d.isActive !== false} 
                                        onCheckedChange={() => handleToggle(d.id, d.isActive !== false)} 
                                    />
                                </TableCell>
                                <TableCell className="text-right pr-8">
                                    <Button onClick={() => handleDelete(d)} variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg">
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
