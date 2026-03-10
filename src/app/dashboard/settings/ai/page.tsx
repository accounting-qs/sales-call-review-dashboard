'use client';

import React, { useEffect, useState } from 'react';
import {
    Brain,
    Save,
    RotateCcw,
    AlertCircle,
    Info,
    CheckCircle2
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PromptSettings } from '@/lib/services/promptSettings';

export default function AISettingsPage() {
    const [settings, setSettings] = useState<Partial<PromptSettings>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        fetch('/api/settings/prompts')
            .then(res => res.json())
            .then(data => {
                setSettings(data);
                setLoading(false);
            });
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/settings/prompts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            if (res.ok) {
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
            }
        } catch (error) {
            console.error("Save error:", error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
    );

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50">
            <Header
                breadcrumbs={[{ label: 'Manager Settings' }, { label: 'AI Instructions' }]}
                actions={
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-indigo-600 hover:bg-indigo-700 h-11 gap-3 font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-100 px-8 rounded-2xl transition-all active:scale-95"
                    >
                        {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                        {saving ? 'Saving...' : saved ? 'Settings Saved' : 'Save Instructions'}
                    </Button>
                }
            />

            <div className="flex-1 overflow-y-auto px-8 py-8 pb-24">
                <div className="mb-10 flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight font-outfit uppercase">
                            AI Instructions
                        </h1>
                        <p className="text-slate-400 text-sm font-bold mt-2 uppercase tracking-[0.1em]">Modify the logic and parameters for the AI analysis engine</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 px-5 py-3 rounded-2xl flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                        <p className="text-[10px] font-bold text-amber-800 uppercase tracking-tight leading-relaxed max-w-xs">
                            Changes here will affect all future analysis operations immediately. Use caution when modifying frameworks.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-10">
                    {/* Call 1: Evaluation */}
                    <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden group">
                        <CardHeader className="p-8 pb-0 flex flex-row items-center justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                        <Brain className="w-5 h-5" />
                                    </div>
                                    <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tight">Agent: Call 1 (Evaluation)</CardTitle>
                                </div>
                                <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-10">
                                    Logic for first-contact business evaluation calls
                                </CardDescription>
                            </div>
                            <Badge className="bg-indigo-50 text-indigo-700 border-none font-black text-[10px] px-3 py-1 uppercase tracking-tight">Active Framework</Badge>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="relative">
                                <Textarea
                                    className="min-h-[500px] bg-slate-50/50 border-slate-100 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all rounded-2xl font-mono text-sm leading-relaxed p-6 text-slate-700 ring-offset-transparent outline-none"
                                    value={settings.call1Prompt}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSettings({ ...settings, call1Prompt: e.target.value })}
                                />
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="outline" size="sm" className="bg-white border-slate-200 h-8 gap-2 uppercase font-black text-[8px] tracking-widest text-slate-400 hover:text-indigo-600" onClick={() => alert('Feature coming soon: Reset to Default')}>
                                        <RotateCcw className="w-3 h-3" />
                                        Reset to Default
                                    </Button>
                                </div>
                            </div>
                            <div className="mt-6 flex items-start gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <Info className="w-4 h-4 text-slate-400 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Recommended Tags</p>
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {['totalScore', 'dealRisk', 'scriptAlignment', 'outcome', 'leadSource', 'sections'].map(tag => (
                                            <span key={tag} className="text-[9px] font-black text-slate-400 bg-white border border-slate-100 px-2 py-0.5 rounded-md">#{tag}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Call 2: Follow-up */}
                    <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden group">
                        <CardHeader className="p-8 pb-0 flex flex-row items-center justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                                        <RotateCcw className="w-5 h-5" />
                                    </div>
                                    <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tight">Agent: Call 2 (Follow-up)</CardTitle>
                                </div>
                                <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-10">
                                    Logic for second-contact follow-up and closing calls
                                </CardDescription>
                            </div>
                            <Badge className="bg-purple-50 text-purple-700 border-none font-black text-[10px] px-3 py-1 uppercase tracking-tight">Active Framework</Badge>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="relative">
                                <Textarea
                                    className="min-h-[500px] bg-slate-50/50 border-slate-100 focus:bg-white focus:ring-2 focus:ring-purple-100 transition-all rounded-2xl font-mono text-sm leading-relaxed p-6 text-slate-700 ring-offset-transparent outline-none"
                                    value={settings.call2Prompt}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSettings({ ...settings, call2Prompt: e.target.value })}
                                />
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="outline" size="sm" className="bg-white border-slate-200 h-8 gap-2 uppercase font-black text-[8px] tracking-widest text-slate-400 hover:text-purple-600" onClick={() => alert('Feature coming soon: Reset to Default')}>
                                        <RotateCcw className="w-3 h-3" />
                                        Reset to Default
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
