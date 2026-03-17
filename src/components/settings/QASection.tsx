import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Play, CheckCircle, Bug, TerminalSquare, MessageSquare, Database } from 'lucide-react';

export function QASection() {
    const [testCallId, setTestCallId] = useState('');
    const [runningSync, setRunningSync] = useState(false);
    
    // Test states
    const [testPrompt, setTestPrompt] = useState('');
    const [runningAi, setRunningAi] = useState(false);
    const [aiResult, setAiResult] = useState('');
    
    const [runningWebhook, setRunningWebhook] = useState(false);

    const handleTestSync = async () => {
        setRunningSync(true);
        try {
            const res = await fetch('/api/qa/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ callId: testCallId || undefined })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            alert(`Success: ${data.message}`);
        } catch (err: any) {
            alert(`Sync Failed: ${err.message}`);
        } finally {
            setRunningSync(false);
        }
    };

    const handleTestAi = async () => {
        setRunningAi(true);
        setAiResult('');
        try {
            const res = await fetch('/api/qa/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: testPrompt })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setAiResult(`Success! Evaluated using Gemini & your active RAG documents.\n\nRaw Output:\n${JSON.stringify(data.analysis, null, 2)}`);
        } catch (err: any) {
            setAiResult(`Analysis Failed: ${err.message}`);
        } finally {
            setRunningAi(false);
        }
    };

    const handleTestWebhook = async () => {
        setRunningWebhook(true);
        try {
            const res = await fetch('/api/qa/webhook', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            alert(`Success: ${data.message}`);
        } catch (err: any) {
            alert(`Webhook Failed: ${err.message}`);
        } finally {
            setRunningWebhook(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between border-b border-rose-50/50 bg-rose-50/30 px-8 py-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <Bug className="w-5 h-5 text-rose-600" />
                            <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-900">QA Debugger</CardTitle>
                        </div>
                        <CardDescription className="text-[11px] font-bold uppercase tracking-widest mt-1 text-slate-500">
                            Manually trigger and verify specific steps in the pipeline
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                    
                    {/* Fireflies Sync QA */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                            <Database className="w-4 h-4 text-slate-400" />
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">1. Fireflies Sync & Routing</h3>
                        </div>
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-end gap-4">
                            <div className="flex-1 space-y-2">
                                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-900">Target Call ID (Optional)</Label>
                                <Input 
                                    placeholder="Leave blank to sync latest calls..." 
                                    className="h-11 rounded-xl bg-white border-slate-200"
                                    value={testCallId}
                                    onChange={(e) => setTestCallId(e.target.value)}
                                />
                            </div>
                            <Button 
                                className="h-11 bg-slate-900 hover:bg-black uppercase text-[10px] font-bold tracking-widest gap-2 rounded-xl px-6 min-w-[140px]"
                                onClick={handleTestSync}
                                disabled={runningSync}
                            >
                                {runningSync ? <span className="animate-spin">⟳</span> : <Play className="w-3.5 h-3.5" />}
                                Run Sync
                            </Button>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic pl-2">
                            This tests the Fireflies API connection and the Rep Routing Logic.
                        </p>
                    </div>

                    {/* AI Scoring QA */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                            <TerminalSquare className="w-4 h-4 text-slate-400" />
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">2. AI Models & Prompts</h3>
                        </div>
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-900">Test Input (Transcript Snippet)</Label>
                                <Textarea 
                                    placeholder="Paste a transcript snippet here to test the scoring or extraction agents..." 
                                    className="min-h-[100px] rounded-xl bg-white border-slate-200 text-sm"
                                    value={testPrompt}
                                    onChange={(e) => setTestPrompt(e.target.value)}
                                />
                            </div>
                            <div className="flex justify-end">
                                <Button 
                                    className="h-11 bg-slate-900 hover:bg-black uppercase text-[10px] font-bold tracking-widest gap-2 rounded-xl px-6 min-w-[140px]"
                                    onClick={handleTestAi}
                                    disabled={runningAi || !testPrompt}
                                >
                                    {runningAi ? <span className="animate-spin">⟳</span> : <Play className="w-3.5 h-3.5" />}
                                    Test AI Rules
                                </Button>
                            </div>
                            
                            {aiResult && (
                                <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 mt-4 space-y-2 overflow-hidden">
                                    <div className="flex items-center gap-2 mb-3">
                                        <CheckCircle className="w-4 h-4 text-green-400" />
                                        <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">Test Complete</span>
                                    </div>
                                    <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap overflow-auto max-h-[300px]">
                                        {aiResult}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Webhook QA */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                            <MessageSquare className="w-4 h-4 text-slate-400" />
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">3. ClickUp / Webhook Delivery</h3>
                        </div>
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h4 className="text-sm font-bold text-slate-900">Test ClickUp Webhook Delivery</h4>
                                <p className="text-xs text-slate-500 font-medium">Sends a mock finalized analysis payload to the configured webhook destination.</p>
                            </div>
                            <Button 
                                className="h-11 bg-slate-900 hover:bg-black uppercase text-[10px] font-bold tracking-widest gap-2 rounded-xl px-6 min-w-[150px]"
                                onClick={handleTestWebhook}
                                disabled={runningWebhook}
                            >
                                {runningWebhook ? <span className="animate-spin">⟳</span> : <Play className="w-3.5 h-3.5" />}
                                Fire Webhook
                            </Button>
                        </div>
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}
