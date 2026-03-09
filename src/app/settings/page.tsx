'use client';

import React, { useState } from 'react';
import {
    Settings,
    FileText,
    Terminal,
    Cpu,
    Upload,
    Trash2,
    Save,
    RefreshCcw,
    Plus,
    Info,
    Database
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { seedData } from '@/lib/seed';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('docs');

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50">
            <Header
                breadcrumbs={[{ label: 'System Settings' }]}
                actions={
                    <Button size="sm" className="h-9 gap-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold uppercase tracking-wider">
                        <Save className="w-3 h-3" />
                        Save Changes
                    </Button>
                }
            />

            <div className="flex-1 overflow-y-auto px-8 py-6 pb-20 max-w-6xl mx-auto w-full">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Configuration</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage AI models, prompts, and knowledge base documents</p>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="bg-slate-100 p-1 rounded-lg">
                        <TabsTrigger value="docs" className="text-xs font-bold uppercase tracking-wider gap-2 h-8 px-4 data-[state=active]:bg-white data-[state=active]:text-indigo-600">
                            <FileText className="w-3.5 h-3.5" />
                            RAG Documents
                        </TabsTrigger>
                        <TabsTrigger value="prompts" className="text-xs font-bold uppercase tracking-wider gap-2 h-8 px-4 data-[state=active]:bg-white data-[state=active]:text-indigo-600">
                            <Terminal className="w-3.5 h-3.5" />
                            Agent Prompts
                        </TabsTrigger>
                        <TabsTrigger value="models" className="text-xs font-bold uppercase tracking-wider gap-2 h-8 px-4 data-[state=active]:bg-white data-[state=active]:text-indigo-600">
                            <Cpu className="w-3.5 h-3.5" />
                            Model Configuration
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="docs" className="space-y-6">
                        <Card className="border-none shadow-sm bg-white overflow-hidden">
                            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 px-6 py-6">
                                <div>
                                    <CardTitle className="text-base font-bold text-slate-900">Reference Documents</CardTitle>
                                    <CardDescription className="text-xs">Upload PDFs for AI to use as context via RAG</CardDescription>
                                </div>
                                <Button variant="outline" className="h-9 gap-2 text-xs font-bold border-slate-200">
                                    <Upload className="w-3.5 h-3.5" />
                                    Upload Document
                                </Button>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader className="bg-slate-50">
                                        <TableRow className="border-slate-100">
                                            <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-6 py-3">Document Name</TableHead>
                                            <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-3">Size / Chunks</TableHead>
                                            <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-3">Status</TableHead>
                                            <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-3">Date Uploaded</TableHead>
                                            <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right pr-6 py-3">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow className="border-slate-100 hover:bg-slate-50/50">
                                            <TableCell className="pl-6 font-bold py-4">Sales_Closing_Framework_v2.pdf</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-medium text-slate-600">2.4 MB</span>
                                                    <span className="text-[10px] text-slate-400">124 chunks</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className="bg-green-50 text-green-600 border-green-100 text-[10px] px-2 py-0.5 font-bold">Indexed</Badge>
                                            </TableCell>
                                            <TableCell className="text-xs font-medium text-slate-600">May 12, 2024</TableCell>
                                            <TableCell className="text-right pr-6">
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                        <TableRow className="border-slate-100 hover:bg-slate-50/50">
                                            <TableCell className="pl-6 font-bold py-4">Objection_Handling_Guide.pdf</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-medium text-slate-600">1.8 MB</span>
                                                    <span className="text-[10px] text-slate-400">68 chunks</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className="bg-green-50 text-green-600 border-green-100 text-[10px] px-2 py-0.5 font-bold">Indexed</Badge>
                                            </TableCell>
                                            <TableCell className="text-xs font-medium text-slate-600">May 10, 2024</TableCell>
                                            <TableCell className="text-right pr-6">
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="prompts" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <PromptEditorCard
                                name="Extraction Agent"
                                description="Extracts sections from transcripts"
                                version={4}
                                model="Gemini 1.5 Pro"
                            />
                            <PromptEditorCard
                                name="Scoring Agent"
                                description="Assigns 0-10 scores to sections"
                                version={12}
                                model="GPT-4o"
                            />
                            <PromptEditorCard
                                name="Training Agent"
                                description="Generates weekly Coaching plans"
                                version={2}
                                model="Claude 3.5 Sonnet"
                                useRag
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="models" className="space-y-6">
                        <Card className="border-none shadow-sm bg-white overflow-hidden">
                            <CardHeader className="bg-slate-50/50 px-6 py-6 border-b border-slate-100">
                                <CardTitle className="text-base font-bold text-slate-900">Pipeline Model Configuration</CardTitle>
                                <CardDescription className="text-xs">Define which LLM powers each step of the analysis pipeline</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <ModelSelector
                                        label="Transcript Extraction"
                                        description="Handles long-context needle-in-haystack extraction"
                                        defaultModel="Gemini 1.5 Pro (Latest)"
                                    />
                                    <ModelSelector
                                        label="Section Scoring"
                                        description="Detailed reasoning and numeric evaluation"
                                        defaultModel="GPT-4o (2024-05-13)"
                                    />
                                    <ModelSelector
                                        label="Coaching Generation"
                                        description="Creative and action-oriented feedback"
                                        defaultModel="Claude 3.5 Sonnet"
                                    />
                                    <ModelSelector
                                        label="RAG Document Embedding"
                                        description="Vector search and document indexing"
                                        defaultModel="text-embedding-3-small"
                                    />
                                </div>

                                <div className="pt-8 border-t border-slate-100 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <Label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                            Development Utilities
                                            <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-600 border-amber-100">Dev Only</Badge>
                                        </Label>
                                        <p className="text-[10px] text-slate-400 font-medium italic">Re-seed the entire Firestore database with original mock data. This will recreate all records with current timestamps.</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="h-10 gap-2 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold"
                                        onClick={async () => {
                                            if (confirm('Are you sure you want to re-seed the database? This will overwrite existing data.')) {
                                                try {
                                                    await seedData();
                                                    alert('Database seeded successfully!');
                                                } catch (e: any) {
                                                    alert('Error seeding: ' + e.message);
                                                }
                                            }
                                        }}
                                    >
                                        <Database className="w-4 h-4" />
                                        Reset & Seed Database
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

function PromptEditorCard({ name, description, version, model, useRag }: any) {
    return (
        <Card className="border-none shadow-sm bg-white overflow-hidden flex flex-col h-full group">
            <CardHeader className="pb-4">
                <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline" className="text-[8px] font-bold uppercase tracking-wider h-5 px-1.5 border-slate-200">
                        v{version}.0
                    </Badge>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-slate-50">
                        <Save className="w-3.5 h-3.5 text-slate-400" />
                    </Button>
                </div>
                <CardTitle className="text-sm font-bold text-slate-900">{name}</CardTitle>
                <CardDescription className="text-xs leading-relaxed">{description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col pt-0 px-6 pb-6">
                <div className="flex flex-col gap-4 mt-2">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Model</label>
                        <div className="bg-slate-50 rounded-lg p-2 text-xs font-medium text-slate-700 border border-slate-100">
                            {model}
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Use RAG</label>
                            <Info className="w-3 h-3 text-slate-300" />
                        </div>
                        <div className={cn("w-10 h-5 rounded-full relative transition-colors", useRag ? "bg-indigo-600" : "bg-slate-200")}>
                            <div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all", useRag ? "left-6" : "left-1")} />
                        </div>
                    </div>
                    <Button className="mt-4 bg-slate-900 hover:bg-black text-[10px] font-bold uppercase tracking-wider h-9 rounded-lg gap-2">
                        <Terminal className="w-3 h-3" />
                        Edit Prompt System
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function ModelSelector({ label, description, defaultModel }: any) {
    return (
        <div className="space-y-3">
            <div className="space-y-1">
                <Label className="text-sm font-bold text-slate-900">{label}</Label>
                <p className="text-[10px] text-slate-400 font-medium">{description}</p>
            </div>
            <div className="relative group/sel">
                <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 flex items-center justify-between hover:border-indigo-200 hover:bg-slate-50/50 transition-all cursor-pointer">
                    {defaultModel}
                    <div className="w-4 h-4 bg-slate-100 rounded flex items-center justify-center">
                        <Plus className="w-2.5 h-2.5 text-slate-400" />
                    </div>
                </div>
            </div>
        </div>
    );
}
