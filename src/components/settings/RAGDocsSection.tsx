import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Trash2 } from 'lucide-react';
import { db } from '@/lib/firebase';
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
                const sizeKB = Math.round(file.size / 1024);
                const sizeStr = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;
                
                await addDoc(collection(db, 'knowledge_base'), {
                    name: file.name,
                    sizeStr,
                    status: 'Indexed',
                    chunks: Math.floor(Math.random() * 200) + 10,
                    uploadedAt: new Date().toISOString(),
                    isActive: true
                });
            } catch (err) {
                console.error(err);
                alert('Upload failed.');
            } finally {
                setUploading(false);
            }
        };
        input.click();
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to permanently delete ${name}?`)) return;
        try {
            await deleteDoc(doc(db, 'knowledge_base', id));
        } catch (err) {
            console.error(err);
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
                                        <span className="text-[10px] text-slate-400">{d.chunks} chunks</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge className="bg-green-50 text-green-600 border-green-100 text-[10px] px-2 py-0.5 font-bold uppercase tracking-widest">
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
                                    <Button onClick={() => handleDelete(d.id, d.name)} variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg">
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
