'use client';

import React from 'react';
import { useKnowledge } from '@/lib/hooks/useKnowledge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Trash2, Upload, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function KnowledgeBasePage() {
    const { docs, loading, toggleDocSelection, deleteReferenceDoc } = useKnowledge();

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
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Framework
                </Button>
            </div>

            <div className="grid gap-6">
                {docs.length === 0 ? (
                    <Card className="border-dashed border-2 bg-slate-50/50">
                        <CardContent className="flex flex-col items-center py-12 text-center">
                            <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
                            <h3 className="text-lg font-semibold text-slate-900">No documents found</h3>
                            <p className="text-slate-500 max-w-xs">
                                Seed your knowledge base with the initial documentation to start selective analysis.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    docs.map((doc) => (
                        <Card key={doc.id} className="overflow-hidden border-slate-200 hover:border-indigo-200 transition-colors">
                            <CardContent className="p-0">
                                <div className="flex items-center p-6 gap-6">
                                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <FileText className="w-6 h-6 text-indigo-600" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-slate-900 truncate">{doc.name}</h3>
                                            <Badge variant="outline" className="text-[10px] text-slate-400 uppercase">
                                                {doc.type}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-slate-400">
                                            Uploaded on {format(doc.uploadedAt.toDate(), 'MMM dd, yyyy')} • {doc.fileName}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-8 border-l border-slate-100 pl-8">
                                        <div className="space-y-3">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
                                                Use for Agent:
                                            </div>
                                            <div className="flex gap-6">
                                                <div className="flex items-center gap-2">
                                                    <Checkbox
                                                        id={`c1-${doc.id}`}
                                                        checked={doc.enabledForCall1}
                                                        onCheckedChange={(checked) => toggleDocSelection(doc.id, 'call1', !!checked)}
                                                    />
                                                    <label htmlFor={`c1-${doc.id}`} className="text-sm font-medium text-slate-600 cursor-pointer">
                                                        Call 1
                                                    </label>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Checkbox
                                                        id={`c2-${doc.id}`}
                                                        checked={doc.enabledForCall2}
                                                        onCheckedChange={(checked) => toggleDocSelection(doc.id, 'call2', !!checked)}
                                                    />
                                                    <label htmlFor={`c2-${doc.id}`} className="text-sm font-medium text-slate-600 cursor-pointer">
                                                        Call 2
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => deleteReferenceDoc(doc.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
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
