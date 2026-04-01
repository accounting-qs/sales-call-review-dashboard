'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
    BarChart3,
    Calendar,
    Clock,
    User,
    Building2,
    ChevronDown,
    ArrowLeft,
    MessageSquare,
    FileText,
    AlertTriangle,
    CheckCircle2,
    ExternalLink,
    Target
} from 'lucide-react';
import { Call, Analysis } from '@/types';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const formatDuration = (minutes: number) => {
    const mins = Math.floor(minutes);
    const secs = Math.round((minutes - mins) * 60);
    return `${mins}m ${secs}s`;
};

const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp.toDate?.() || new Date(timestamp);
    return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const getScoreColor = (score: number) => {
    if (score < 5) return 'text-red-500';
    if (score < 7) return 'text-amber-500';
    return 'text-green-500';
};

const getProgressColor = (score: number) => {
    if (score < 5) return 'bg-red-500';
    if (score < 7) return 'bg-amber-500';
    return 'bg-green-500';
};

export default function CallDetailPage() {
    const { callId } = useParams();
    const [call, setCall] = useState<Call | null>(null);
    const [analysis, setAnalysis] = useState<Analysis | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!callId) return;

        let isMounted = true;
        
        const fetchCallData = async () => {
            try {
                const res = await fetch(`/api/calls/${callId}`);
                if (!res.ok) throw new Error("Not found");
                const data = await res.json();
                
                if (isMounted) {
                    setCall(data.call);
                    setAnalysis(data.analysis);
                    setLoading(false);
                }
            } catch (error) {
                console.error("Error fetching call:", error);
                if (isMounted) setLoading(false);
            }
        };

        fetchCallData();

        return () => { isMounted = false; };
    }, [callId]);

    if (loading) return (
        <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
    );

    if (!call) return (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <p className="text-slate-500">Call not found</p>
            <Button onClick={() => window.location.href = '/dashboard'}>Go to Dashboard</Button>
        </div>
    );

    const getCall1Sections = (data: any) => {
        if (!data) return [];
        return [
            { id: 'intro', label: 'Intro / Pitch Frame', data: data.intro },
            { id: 'bizAnalysis', label: 'Business Analysis', data: data.bizAnalysis },
            { id: 'challenges', label: 'Challenges / Current Marketing', data: data.challenges },
            { id: 'goals', label: 'Goals / Vision', data: data.goals },
            { id: 'transition', label: 'Transition to Pitch', data: data.transition },
            { id: 'funnelFlow', label: 'Funnel Flow Demonstration', data: data.funnelFlow },
            { id: 'timeline', label: 'Timeline & Roadmap', data: data.timeline },
            { id: 'roiCalc', label: 'ROI Calculator', data: data.roiCalc },
            { id: 'tempCheck', label: 'Temp Check', data: data.tempCheck },
            { id: 'priceDrop', label: 'Price Drop', data: data.priceDrop },
            { id: 'objections', label: 'Objection Handling', data: data.objections },
            { id: 'decisionLeadership', label: 'Decision Leadership & Timeline', data: data.decisionLeadership },
            { id: 'booking', label: 'Booking & Post-Call Frame', data: data.booking },
        ];
    };

    const getCall2Sections = (data: any) => {
        if (!data) return [];
        return [
            { id: 'intro', label: 'S1: Intro', data: data.intro },
            { id: 'technicalQuestions', label: 'S2: Technical Questions', data: data.technicalQuestions },
            { id: 'sevenBehaviours', label: 'S3: 7 Behaviours', data: data.sevenBehaviours },
            { id: 'refundExplanation', label: 'S4: Refund Explanation', data: data.refundExplanation },
            { id: 'tempCheckObjections', label: 'S5: Temp Check & Objections', data: data.tempCheckObjections },
            { id: 'rePriceDrop', label: 'S6: Re-Price Drop', data: data.rePriceDrop },
            { id: 'contractReview', label: 'S7: Contract Review', data: data.contractReview },
            { id: 'closing', label: 'S8: Closing', data: data.closing },
        ];
    };

    let sections: { id: string; label: string; data: any }[] = [];
    if (analysis) {
        sections = analysis.callType === 'evaluation'
            ? getCall1Sections(analysis.sections)
            : getCall2Sections(analysis.sections);
            
        sections = sections.filter(s => s.data && typeof s.data.score === 'number');
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50">
            <Header
                breadcrumbs={[
                    { label: 'Representative Profile', href: `/reps/${call.repEmail}` },
                    { label: call.repName, href: `/reps/${call.repEmail}` },
                    { label: 'Internal Analysis Report' }
                ]}
                actions={
                    <Button
                        variant="outline"
                        className="border-slate-200 text-slate-600 gap-2 font-semibold h-9"
                        onClick={() => window.open(call.transcriptUrl, '_blank')}
                    >
                        <ExternalLink className="w-4 h-4" />
                        View in Fireflies
                    </Button>
                }
            />

            <div className="flex-1 overflow-y-auto px-8 py-8 pb-24">
                {/* Call Summary Header */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
                    <div className="space-y-2">
                        <Link
                            href={`/reps/${call.repEmail}`}
                            className="flex items-center gap-2 text-indigo-600 text-xs font-extrabold uppercase tracking-widest hover:text-indigo-700 transition-colors"
                        >
                            <ArrowLeft className="w-3 h-3" />
                            Back to {call.repName}
                        </Link>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-outfit uppercase">
                            {call.title}
                        </h1>
                        <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-slate-500 font-medium text-sm">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-slate-300" />
                                {formatDate(call.date)}
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-slate-300" />
                                {formatDuration(call.duration)}
                            </div>
                            <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-slate-300" />
                                {call.prospectCompany}
                            </div>
                            {analysis?.leadSource && (
                                <div className="flex items-center gap-2">
                                    <Target className="w-4 h-4 text-slate-300" />
                                    Source: {analysis.leadSource}
                                </div>
                            )}
                            <Badge variant="outline" className="border-indigo-100 bg-indigo-50/50 text-indigo-700 font-bold uppercase text-[10px]">
                                {analysis?.callType === 'evaluation' ? 'Business Evaluation (Call 1)' : 'Follow-up (Call 2)'}
                            </Badge>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Card className="border-none shadow-sm bg-indigo-600 text-white p-4 min-w-[140px] text-center">
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">Overall Score</p>
                            <h2 className="text-3xl font-black">{(analysis?.totalScore || 0).toFixed(1)} <span className="text-sm font-medium opacity-50">/ 10</span></h2>
                        </Card>
                        <Card className="border-none shadow-sm bg-white p-4 min-w-[140px] text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Deal Risk</p>
                            <Badge
                                variant={analysis?.dealRisk === 'high' || analysis?.dealRisk === 'critical' ? 'destructive' : analysis?.dealRisk === 'medium' ? 'secondary' : 'default'}
                                className="uppercase text-[10px] font-black px-3 py-1"
                            >
                                {analysis?.dealRisk || 'Low'} Risk
                            </Badge>
                        </Card>
                    </div>
                </div>

                {/* Analysis Summary Card */}
                {analysis?.callAnalysis && (
                    <Card className="border-none shadow-sm bg-white mb-8 border-l-4 border-indigo-600">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                <FileText className="w-4 h-4 text-indigo-600" />
                                Executive Call Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-700 leading-relaxed font-medium">
                                {analysis.callAnalysis}
                            </p>
                            <div className="mt-4 flex flex-wrap gap-4 pt-4 border-t border-slate-50 font-medium text-sm">
                                <div className="text-slate-500">
                                    <span className="text-slate-400 uppercase text-[10px] font-bold block mb-1">Current Outcome</span>
                                    {analysis.outcome}
                                </div>
                                <div className="text-slate-500">
                                    <span className="text-slate-400 uppercase text-[10px] font-bold block mb-1">Script Alignment</span>
                                    <span className={cn(
                                        "font-bold",
                                        analysis.scriptAlignment === 'aligned' ? 'text-green-600' : 'text-amber-600'
                                    )}>
                                        {analysis.scriptAlignment?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                                    </span>
                                </div>
                                {analysis.miscellaneous && (
                                    <div className="text-slate-500">
                                        <span className="text-slate-400 uppercase text-[10px] font-bold block mb-1">Miscellaneous</span>
                                        {analysis.miscellaneous}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Main Content: Sections & Coaching */}
                    <div className="xl:col-span-2 space-y-8">
                        {/* Coaching Priorities */}
                        <Card className="border-none shadow-sm bg-white overflow-hidden">
                            <CardHeader className="bg-slate-900 border-none px-6 py-4">
                                <CardTitle className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-widest">
                                    <Target className="w-4 h-4 text-indigo-400" />
                                    Top Coaching Priorities
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {(analysis?.topCoachingPriorities || []).map((priority, i) => (
                                        <div key={i} className="flex flex-col gap-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                            <span className="text-[10px] font-black text-indigo-600 uppercase">Priority {i + 1}</span>
                                            <p className="text-sm font-bold text-slate-800 leading-snug">{priority}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Section Breakdown */}
                        <div className="space-y-4">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 px-1">
                                <BarChart3 className="w-5 h-5 text-indigo-600" />
                                Detailed Section Breakdown
                            </h2>

                            <Accordion type="single" collapsible className="space-y-3">
                                {sections.map((section) => (
                                    <AccordionItem
                                        key={section.id}
                                        value={section.id}
                                        className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden px-0"
                                    >
                                        <AccordionTrigger className="hover:no-underline px-6 py-4 group">
                                            <div className="flex-1 flex items-center justify-between pr-4">
                                                <div className="flex flex-col items-start text-left">
                                                    <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{section.label}</span>
                                                    <span className="text-[10px] text-slate-400 font-medium">Click to view scorecard and analysis notes</span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="hidden sm:flex flex-col items-end gap-1 w-32">
                                                        <Progress
                                                            value={section.data.score * 10}
                                                            className="h-1 bg-slate-100"
                                                            indicatorClassName={getProgressColor(section.data.score)}
                                                        />
                                                    </div>
                                                    <span className={cn("text-sm font-black min-w-[24px]", getScoreColor(section.data.score))}>
                                                        {section.data.score.toFixed(1)}
                                                    </span>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-6 pb-6 pt-2 border-t border-slate-50 bg-slate-50/30">
                                            <div className="space-y-4 pt-4">
                                                <div className="space-y-2">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                        <MessageSquare className="w-3 h-3" />
                                                        AI Evaluator Notes
                                                    </p>
                                                    <p className="text-sm text-slate-700 leading-relaxed font-medium bg-white p-4 rounded-xl border border-slate-100 italic">
                                                        "{section.data.notes}"
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-1.5 p-2 bg-green-50 rounded-lg text-green-700 text-[10px] font-bold uppercase transition-transform hover:scale-105 cursor-default">
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        Requirement Met
                                                    </div>
                                                    <div className="flex items-center gap-1.5 p-2 bg-red-50 rounded-lg text-red-700 text-[10px] font-bold uppercase transition-transform hover:scale-105 cursor-default">
                                                        <AlertTriangle className="w-3.5 h-3.5" />
                                                        Improvement Identified
                                                    </div>
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </div>
                    </div>

                    {/* Sidebar Area: Transcript / Metadata */}
                    <div className="space-y-8">
                        <Card className="border-none shadow-sm bg-white overflow-hidden sticky top-24">
                            <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-indigo-600" />
                                        Transcript Preview
                                    </CardTitle>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-full">
                                        <ChevronDown className="w-4 h-4 text-slate-400" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="h-[600px] overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
                                    <div className="space-y-4">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-indigo-600 text-[10px] font-black uppercase tracking-tighter rounded px-1.5">Rep</Badge>
                                                <span className="text-[10px] font-bold text-slate-400">00:00 - 01:12</span>
                                            </div>
                                            <p className="text-xs text-slate-600 leading-relaxed pl-2 border-l-2 border-indigo-100">
                                                Hey {call.prospectName}, great to have you here. How's everything going over at {call.prospectCompany}?
                                                I was looking at your application before the call and it looks like you've been doing some interesting things
                                                in the marketing space lately...
                                            </p>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-slate-900 text-[10px] font-black uppercase tracking-tighter rounded px-1.5">Prospect</Badge>
                                                <span className="text-[10px] font-bold text-slate-400">01:12 - 01:45</span>
                                            </div>
                                            <p className="text-xs text-slate-600 leading-relaxed pl-2 border-l-2 border-slate-200">
                                                Things are busy! We're trying to scale up our lead generation but we've hit a bit of a plateau.
                                                I've heard good things about QuantumScaling so I wanted to see if you guys could help us push through.
                                            </p>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-indigo-600 text-[10px] font-black uppercase tracking-tighter rounded px-1.5">Rep</Badge>
                                                <span className="text-[10px] font-bold text-slate-400">01:45 - 03:20</span>
                                            </div>
                                            <p className="text-xs text-slate-600 leading-relaxed pl-2 border-l-2 border-indigo-100 font-medium">
                                                (Setting the frame) Totally understand. Plateauing is super common when you reach that $50k/mo mark.
                                                Usually it's either an offer fatigue issue or a system bottleneck. Today, I'd like to dive into
                                                where you're at now, where you want to be in 6-12 months, and see if we're even the right fit to help.
                                                Sound fair?
                                            </p>
                                        </div>

                                        <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4">Transcript continues...</p>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-[10px] font-bold uppercase tracking-wider h-8 border-indigo-200 text-indigo-600"
                                                onClick={() => window.open(call.transcriptUrl, '_blank')}
                                            >
                                                Full Transcript & Recording
                                                <ExternalLink className="w-3 h-3 ml-2" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
