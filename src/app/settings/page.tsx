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
    Database,
    Activity,
    Clock,
    FileCode,
    ExternalLink,
    AlertCircle,
    Target
} from 'lucide-react';
// Settings now use Prisma via REST API (no Firestore needed)
import { Header } from '@/components/layout/Header';
import { seedData } from '@/lib/seed';
import { cn } from '@/lib/utils';
import { RAGDocsSection } from '@/components/settings/RAGDocsSection';
import { QASection } from '@/components/settings/QASection';
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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('pipeline');
    
    // Pipeline Settings State
    const [pipelineSettings, setPipelineSettings] = useState({
        autoAnalysis: false,
        evaluationKeywords: 'Evaluation Call, Business Evaluation',
        followupKeywords: 'Follow-up',
        excludedKeywords: 'Test, Internal',
        defaultAgent: 'none',
        clickupWebhook: '',
        clickupListId: '',
        clickupTemplate: `==📊 **New Audited Call** ==\n\n👤 **Rep:** {{rep}}\n👥 **Prospect:** {{title}}\n📅 **Date:** {{date}}\n🔗 **Link:** {{link}}\n⏱️ **Duration:** {{duration}} min\n\n<details>\n<summary>🔎 **Click to see full AI Review**</summary>\n\n{{analysis}}\n\n**Quick Stats:**\n- **Alignment:** {{alignment}}\n- **Score:** {{score}}/10\n- **Risk:** {{risk}}\n\n[Full Report]({{link}})\n[Recording]({{transcript}})\n</details>`,
        dailySyncTime: '02:00',
        autoSyncEnabled: true,
        aiModel: 'gemini-2.5-pro'
    });
    const [savingSettings, setSavingSettings] = useState(false);

    React.useEffect(() => {
        const loadSettings = async () => {
            try {
                const res = await fetch('/api/settings/pipeline');
                if (res.ok) {
                    const data = await res.json();
                    setPipelineSettings(prev => ({ ...prev, ...data }));
                }
            } catch (error) {
                console.error("Error loading settings:", error);
            }
        };
        loadSettings();
    }, []);

    const handleSavePipeline = async () => {
        setSavingSettings(true);
        try {
            const res = await fetch('/api/settings/pipeline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...pipelineSettings,
                    updatedAt: new Date().toISOString()
                })
            });
            if (res.ok) {
                alert("Pipeline settings saved successfully!");
            } else {
                throw new Error('Failed to save');
            }
        } catch (error) {
            console.error("Error saving settings:", error);
            alert("Failed to save settings");
        } finally {
            setSavingSettings(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50">
            <Header
                breadcrumbs={[{ label: 'System Settings' }]}
                actions={
                    <Button 
                        size="sm" 
                        onClick={handleSavePipeline}
                        disabled={savingSettings}
                        className="h-9 gap-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold uppercase tracking-wider"
                    >
                        {savingSettings ? <RefreshCcw className="w-3 h-3 animate-spin"/> : <Save className="w-3 h-3" />}
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
                        <TabsTrigger value="pipeline" className="text-xs font-bold uppercase tracking-wider gap-2 h-8 px-4 data-[state=active]:bg-white data-[state=active]:text-indigo-600">
                            <Activity className="w-3.5 h-3.5" />
                            Data Pipeline
                        </TabsTrigger>
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
                        <TabsTrigger value="qa" className="text-xs font-bold uppercase tracking-wider gap-2 h-8 px-4 data-[state=active]:bg-white data-[state=active]:text-rose-600">
                            <AlertCircle className="w-3.5 h-3.5" />
                            QA Debugger
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="pipeline" className="space-y-6">
                        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden rounded-2xl">
                            <CardHeader className="flex flex-row items-center justify-between border-b border-indigo-50/50 bg-indigo-50/30 px-8 py-6">
                                <div>
                                    <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-900">Pipeline Config</CardTitle>
                                    <CardDescription className="text-[11px] font-bold uppercase tracking-widest mt-1 text-slate-500">Configure automated synchronization and AI analysis rules</CardDescription>
                                </div>
                                <Button 
                                    className="bg-indigo-600 hover:bg-indigo-700 h-10 px-6 font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-indigo-100 gap-2"
                                    onClick={handleSavePipeline}
                                    disabled={savingSettings}
                                >
                                    {savingSettings ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    Save Rules
                                </Button>
                            </CardHeader>
                            <CardContent className="p-8">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                    {/* Column 1 */}
                                    <div className="space-y-8">
                                        <div className="space-y-4">
                                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 pb-2">Automation Rules</h3>
                                            
                                            {/* Auto Analysis Toggle */}
                                            <div className="flex items-center justify-between p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100/50 hover:border-indigo-200 transition-colors">
                                                <div className="space-y-0.5">
                                                    <Label className="text-sm font-black text-indigo-900">Auto-Analyze Transcripts</Label>
                                                    <p className="text-[10px] text-indigo-600/70 font-bold uppercase tracking-widest">Trigger AI heavily immediately after sync</p>
                                                </div>
                                                <Switch
                                                    checked={pipelineSettings.autoAnalysis}
                                                    onCheckedChange={(val) => setPipelineSettings(prev => ({ ...prev, autoAnalysis: val }))}
                                                />
                                            </div>

                                            {/* Automated Daily Sync Settings */}
                                            <div className="space-y-4 p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors">
                                                <div className="flex items-center justify-between">
                                                    <div className="space-y-0.5">
                                                        <Label className="text-sm font-black text-slate-900">Automated Daily Sync</Label>
                                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Enable background automated pulls</p>
                                                    </div>
                                                    <Switch
                                                        checked={pipelineSettings.autoSyncEnabled}
                                                        onCheckedChange={(val) => setPipelineSettings(prev => ({ ...prev, autoSyncEnabled: val }))}
                                                    />
                                                </div>
                                                
                                                {pipelineSettings.autoSyncEnabled && (
                                                    <div className="pt-4 border-t border-slate-200">
                                                        <Label className="text-[11px] font-black uppercase tracking-widest text-slate-900 mb-2 block">CRON Execution Time (24H Format)</Label>
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-sm">
                                                                <Clock className="w-4 h-4 text-indigo-600" />
                                                            </div>
                                                            <Input
                                                                type="time"
                                                                className="h-11 rounded-xl shadow-sm bg-white border-slate-200 text-sm font-bold w-32 focus-visible:ring-indigo-500"
                                                                value={pipelineSettings.dailySyncTime}
                                                                onChange={(e) => setPipelineSettings(prev => ({ ...prev, dailySyncTime: e.target.value }))}
                                                            />
                                                            <p className="text-[9px] text-slate-400 font-bold uppercase italic mt-1 leading-tight flex-1">
                                                                The external CRON job checks the `/api/cron/sync` endpoint. It only executes if the current hour matches this time.
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 pb-2">Destinations</h3>
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1 rounded bg-slate-100"><ExternalLink className="w-3 h-3 text-slate-600" /></div>
                                                    <Label className="text-[11px] font-black uppercase tracking-widest text-slate-900">Webhook URL (ClickUp / Zapier)</Label>
                                                </div>
                                                <Input
                                                    placeholder="https://api.clickup.com/..."
                                                    className="h-11 rounded-xl bg-slate-50 border-slate-200 text-[11px] font-mono shadow-sm focus-visible:ring-indigo-500"
                                                    value={pipelineSettings.clickupWebhook}
                                                    onChange={(e) => setPipelineSettings(prev => ({ ...prev, clickupWebhook: e.target.value }))}
                                                />
                                            </div>
                                            
                                            {/* ClickUp List ID for Native Tasks */}
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1 rounded bg-slate-100"><Target className="w-3 h-3 text-slate-600" /></div>
                                                    <Label className="text-[11px] font-black uppercase tracking-widest text-slate-900">ClickUp List ID (For Coaching Tasks)</Label>
                                                </div>
                                                <Input
                                                    placeholder="e.g. 123456789"
                                                    className="h-11 rounded-xl bg-slate-50 border-slate-200 text-sm shadow-sm focus-visible:ring-indigo-500"
                                                    value={pipelineSettings.clickupListId || ''}
                                                    onChange={(e) => setPipelineSettings(prev => ({ ...prev, clickupListId: e.target.value }))}
                                                />
                                                <p className="text-[9px] text-slate-400 font-medium">Used natively by the Phase 3 advanced workflow engine to push AI suggestions to reps.</p>
                                            </div>

                                            {/* ClickUp Template */}
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1 rounded bg-slate-100"><FileCode className="w-3 h-3 text-slate-600" /></div>
                                                    <Label className="text-[11px] font-black uppercase tracking-widest text-slate-900">Message Body (Markdown)</Label>
                                                </div>
                                                <Textarea
                                                    className="min-h-[220px] rounded-xl bg-slate-50 border-slate-200 text-[11px] font-mono leading-relaxed shadow-sm focus-visible:ring-indigo-500"
                                                    value={pipelineSettings.clickupTemplate}
                                                    onChange={(e) => setPipelineSettings(prev => ({ ...prev, clickupTemplate: e.target.value }))}
                                                />
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {['{{rep}}', '{{title}}', '{{date}}', '{{link}}', '{{duration}}', '{{analysis}}', '{{score}}', '{{risk}}'].map(p => (
                                                        <code key={p} className="text-[9px] font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 text-indigo-700">{p}</code>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Column 2 */}
                                    <div className="space-y-8">
                                        <div className="space-y-4">
                                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 pb-2">Routing Rules</h3>
                                        
                                            {/* Evaluation Keywords */}
                                            <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                                                <div className="flex items-center gap-2">
                                                    <Badge className="bg-indigo-600 text-white border-none font-black text-[9px] px-2 py-0.5 uppercase tracking-widest shadow-sm shadow-indigo-100">Call 1</Badge>
                                                    <Label className="text-[11px] font-black uppercase tracking-widest text-slate-900">Evaluation Keywords</Label>
                                                </div>
                                                <Input
                                                    className="h-11 rounded-xl bg-white border-slate-200 text-sm shadow-sm"
                                                    value={pipelineSettings.evaluationKeywords}
                                                    onChange={(e) => setPipelineSettings(prev => ({ ...prev, evaluationKeywords: e.target.value }))}
                                                />
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Keywords to route to Evaluation Agent</p>
                                            </div>

                                            {/* Follow-up Keywords */}
                                            <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                                                <div className="flex items-center gap-2">
                                                    <Badge className="bg-purple-600 text-white border-none font-black text-[9px] px-2 py-0.5 uppercase tracking-widest shadow-sm shadow-purple-100">Call 2</Badge>
                                                    <Label className="text-[11px] font-black uppercase tracking-widest text-slate-900">Follow-up Keywords</Label>
                                                </div>
                                                <Input
                                                    className="h-11 rounded-xl bg-white border-slate-200 text-sm shadow-sm"
                                                    value={pipelineSettings.followupKeywords}
                                                    onChange={(e) => setPipelineSettings(prev => ({ ...prev, followupKeywords: e.target.value }))}
                                                />
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Keywords to route to Follow-up Agent</p>
                                            </div>

                                            {/* Excluded Keywords */}
                                            <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-slate-500 border-slate-300 font-black text-[9px] px-2 py-0.5 uppercase tracking-widest">Ignore</Badge>
                                                    <Label className="text-[11px] font-black uppercase tracking-widest text-slate-900">Excluded Title Keywords</Label>
                                                </div>
                                                <Input
                                                    className="h-11 rounded-xl bg-white border-slate-200 text-sm shadow-sm"
                                                    value={pipelineSettings.excludedKeywords}
                                                    onChange={(e) => setPipelineSettings(prev => ({ ...prev, excludedKeywords: e.target.value }))}
                                                />
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Calls containing these words are never auto-analyzed</p>
                                            </div>

                                            {/* Default Agent */}
                                            <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                                                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-900">Fallback Agent</Label>
                                                <Select
                                                    value={pipelineSettings.defaultAgent}
                                                    onValueChange={(val) => setPipelineSettings(prev => ({ ...prev, defaultAgent: val }))}
                                                >
                                                    <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200 text-sm shadow-sm">
                                                        <SelectValue placeholder="Select defaults" />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                                        <SelectItem value="none" className="font-bold cursor-pointer">None (Manual only)</SelectItem>
                                                        <SelectItem value="evaluation" className="font-bold cursor-pointer"><span className="text-indigo-600 mr-2">•</span>Call 1 (Evaluation)</SelectItem>
                                                        <SelectItem value="followup" className="font-bold cursor-pointer"><span className="text-purple-600 mr-2">•</span>Call 2 (Follow-up)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="docs" className="space-y-6">
                        <RAGDocsSection />
                    </TabsContent>

                    <TabsContent value="qa" className="space-y-6">
                        <QASection />
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
                                <CardDescription className="text-xs">Select which AI model powers transcript analysis. Supports Gemini, Claude, and OpenAI.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <Label className="text-sm font-bold text-slate-900">Primary AI Reasoning Model</Label>
                                            <p className="text-[10px] text-slate-400 font-medium">The model selected here will perform all transcript analytics, scoring, and coaching extraction.</p>
                                        </div>
                                        <Select
                                            value={pipelineSettings.aiModel}
                                            onValueChange={(val) => setPipelineSettings({ ...pipelineSettings, aiModel: val })}
                                        >
                                            <SelectTrigger className="w-full bg-white border border-slate-200 rounded-xl px-4 py-6 text-sm font-semibold text-slate-700 hover:border-indigo-200 hover:bg-slate-50/50 transition-all cursor-pointer shadow-sm">
                                                <SelectValue placeholder="Select AI Model" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-slate-200 shadow-xl overflow-hidden max-h-[480px]">

                                                {/* ── Google Gemini ── */}
                                                <div className="bg-blue-50 px-3 py-2 text-[10px] font-bold text-blue-500 uppercase tracking-widest border-b border-blue-100 flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Google Gemini
                                                </div>
                                                <SelectItem value="gemini-3.1-pro-preview" className="py-2.5 cursor-pointer">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900">Gemini 3.1 Pro <span className="text-[9px] text-blue-500 font-semibold ml-1">PREVIEW</span></span>
                                                        <span className="text-[10px] text-slate-500 font-medium mt-0.5">Most advanced multimodal reasoning, 1M context</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="gemini-3.1-flash-lite-preview" className="py-2.5 cursor-pointer">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900">Gemini 3.1 Flash-Lite <span className="text-[9px] text-blue-500 font-semibold ml-1">PREVIEW</span></span>
                                                        <span className="text-[10px] text-slate-500 font-medium mt-0.5">Most cost-efficient, high-volume latency-sensitive</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="gemini-3-flash-preview" className="py-2.5 cursor-pointer">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900">Gemini 3 Flash <span className="text-[9px] text-blue-500 font-semibold ml-1">PREVIEW</span></span>
                                                        <span className="text-[10px] text-slate-500 font-medium mt-0.5">Powerful agentic + coding, fast multimodal</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="gemini-2.5-pro" className="py-2.5 cursor-pointer">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900">Gemini 2.5 Pro <span className="text-[9px] text-green-600 font-semibold ml-1">GA</span></span>
                                                        <span className="text-[10px] text-slate-500 font-medium mt-0.5">Complex reasoning + coding, 1M context (recommended)</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="gemini-2.5-flash" className="py-2.5 cursor-pointer">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900">Gemini 2.5 Flash <span className="text-[9px] text-green-600 font-semibold ml-1">GA</span></span>
                                                        <span className="text-[10px] text-slate-500 font-medium mt-0.5">Balanced intelligence with low latency + cost</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="gemini-2.5-flash-lite" className="py-2.5 cursor-pointer">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900">Gemini 2.5 Flash-Lite <span className="text-[9px] text-green-600 font-semibold ml-1">GA</span></span>
                                                        <span className="text-[10px] text-slate-500 font-medium mt-0.5">Massive scale, highest throughput, lowest cost</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="gemini-2.0-flash" className="py-2.5 cursor-pointer">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900">Gemini 2.0 Flash <span className="text-[9px] text-amber-600 font-semibold ml-1">LEGACY</span></span>
                                                        <span className="text-[10px] text-slate-500 font-medium mt-0.5">General purpose, scheduled sunset June 2026</span>
                                                    </div>
                                                </SelectItem>

                                                {/* ── Anthropic Claude ── */}
                                                <div className="bg-orange-50 px-3 py-2 text-[10px] font-bold text-orange-500 uppercase tracking-widest border-y border-orange-100 flex items-center gap-1.5 mt-1">
                                                    <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" /> Anthropic Claude
                                                </div>
                                                <SelectItem value="claude-opus-4.6" className="py-2.5 cursor-pointer">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900">Claude Opus 4.6</span>
                                                        <span className="text-[10px] text-slate-500 font-medium mt-0.5">Flagship — deep reasoning, agentic tasks, 1M context</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="claude-sonnet-4.6" className="py-2.5 cursor-pointer">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900">Claude Sonnet 4.6</span>
                                                        <span className="text-[10px] text-slate-500 font-medium mt-0.5">Best daily driver — Opus intelligence, faster + cheaper</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="claude-haiku-4.5" className="py-2.5 cursor-pointer">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900">Claude Haiku 4.5</span>
                                                        <span className="text-[10px] text-slate-500 font-medium mt-0.5">Budget tier — fast, cost-effective execution</span>
                                                    </div>
                                                </SelectItem>

                                                {/* ── OpenAI ── */}
                                                <div className="bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-600 uppercase tracking-widest border-y border-emerald-100 flex items-center gap-1.5 mt-1">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> OpenAI
                                                </div>
                                                <SelectItem value="gpt-5.4-pro" className="py-2.5 cursor-pointer">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900">GPT-5.4 Pro</span>
                                                        <span className="text-[10px] text-slate-500 font-medium mt-0.5">Highest precision, complex reasoning + coding</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="gpt-5.4" className="py-2.5 cursor-pointer">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900">GPT-5.4</span>
                                                        <span className="text-[10px] text-slate-500 font-medium mt-0.5">Flagship frontier model for high-intelligence tasks</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="gpt-5.4-mini" className="py-2.5 cursor-pointer">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900">GPT-5.4 Mini</span>
                                                        <span className="text-[10px] text-slate-500 font-medium mt-0.5">High-performance balanced for coding + efficiency</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="gpt-5.4-nano" className="py-2.5 cursor-pointer">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900">GPT-5.4 Nano</span>
                                                        <span className="text-[10px] text-slate-500 font-medium mt-0.5">Most cost-efficient, high-volume repetitive tasks</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="gpt-4.1" className="py-2.5 cursor-pointer">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900">GPT-4.1</span>
                                                        <span className="text-[10px] text-slate-500 font-medium mt-0.5">Versatile non-reasoning — text analysis, vision</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="gpt-4.1-mini" className="py-2.5 cursor-pointer">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900">GPT-4.1 Mini</span>
                                                        <span className="text-[10px] text-slate-500 font-medium mt-0.5">Efficient workhorse, optimized for cost + speed</span>
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <Label className="text-sm font-bold text-slate-900 flex items-center gap-2">API Key Status</Label>
                                            <p className="text-[10px] text-slate-400 font-medium">Environment variables configured for each provider. Set in Render Dashboard → Environment.</p>
                                        </div>
                                        <div className="space-y-2.5">
                                            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                                                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block shrink-0" />
                                                <span className="text-sm font-semibold text-slate-700 flex-1">GEMINI_API_KEY</span>
                                                <Badge variant="secondary" className="text-[9px] bg-green-50 text-green-600 border-green-100">Configured</Badge>
                                            </div>
                                            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                                                <span className="w-2 h-2 rounded-full bg-orange-400 inline-block shrink-0" />
                                                <span className="text-sm font-semibold text-slate-700 flex-1">ANTHROPIC_API_KEY</span>
                                                <Badge variant="secondary" className="text-[9px] bg-slate-100 text-slate-400 border-slate-200">Add in Render</Badge>
                                            </div>
                                            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                                                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shrink-0" />
                                                <span className="text-sm font-semibold text-slate-700 flex-1">OPENAI_API_KEY</span>
                                                <Badge variant="secondary" className="text-[9px] bg-slate-100 text-slate-400 border-slate-200">Add in Render</Badge>
                                            </div>
                                        </div>
                                    </div>
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
