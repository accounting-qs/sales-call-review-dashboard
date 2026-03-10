'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
    Brain,
    Clock,
    Target,
    Activity,
    Award,
    ArrowRight
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { Rep, Call, Analysis } from '@/types';
import { cn } from '@/lib/utils';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { SkillRadar } from '@/components/dashboard/SkillRadar';
import { TrendChart } from '@/components/dashboard/TrendChart';

const formatDuration = (minutes: number) => {
    const mins = Math.floor(minutes);
    const secs = Math.round((minutes - mins) * 60);
    return `${mins}m ${secs}s`;
};

const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
};

const getScoreColor = (score: number) => {
    if (score < 5) return 'text-red-500';
    if (score < 7) return 'text-amber-500';
    return 'text-green-500';
};

const getBadgeVariant = (outcome: string) => {
    const low = outcome?.toLowerCase() || '';
    if (low.includes('lost') || low.includes('dec')) return 'destructive';
    if (low.includes('call') || low.includes('demo') || low.includes('won')) return 'default';
    return 'secondary';
};

export default function RepProfilePage() {
    const { email } = useParams();
    const decodedEmail = decodeURIComponent(email as string);

    const [rep, setRep] = useState<Rep | null>(null);
    const [calls, setCalls] = useState<(Call & { analysis?: Analysis })[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!decodedEmail) return;

        const repRef = doc(db, 'reps', decodedEmail);
        const unsubRep = onSnapshot(repRef, (docSnap) => {
            if (docSnap.exists()) {
                setRep(docSnap.data() as Rep);
            }
        });

        // Listen to calls
        const callsRef = collection(db, 'calls');
        const qCalls = query(callsRef, where('repEmail', '==', decodedEmail));

        const unsubCalls = onSnapshot(qCalls, async (snapshot) => {
            const rawCallData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Call[];

            // Sort in memory to avoid needing a composite index
            const callData = rawCallData.sort((a: any, b: any) => {
                const dateA = a.date?.toMillis?.() || (a.date?.seconds * 1000) || 0;
                const dateB = b.date?.toMillis?.() || (b.date?.seconds * 1000) || 0;
                return dateB - dateA;
            });

            // Fetch analyses for these calls
            const analysesRef = collection(db, 'analyses');
            const qAnalyses = query(analysesRef, where('repEmail', '==', decodedEmail));
            const analysesSnap = await getDocs(qAnalyses);
            const analysesMap = new Map();
            analysesSnap.forEach(doc => {
                analysesMap.set(doc.data().callId, { id: doc.id, ...doc.data() });
            });

            const enrichedCalls = callData.map(c => ({
                ...c,
                analysis: analysesMap.get(c.id)
            }));

            setCalls(enrichedCalls);
            setLoading(false);
        }, (error) => {
            console.error("Firebase Error in RepProfilePage:", error);
            setLoading(false);
        });

        return () => {
            unsubRep();
            unsubCalls();
        };
    }, [decodedEmail]);

    if (loading) return (
        <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
    );

    if (!rep) return (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <p className="text-slate-500">Representative not found</p>
            <Button onClick={() => window.location.href = '/dashboard'}>Go to Dashboard</Button>
        </div>
    );

    // Get radar data safely
    const getRadarData = (analysis?: Analysis) => {
        if (!analysis || !analysis.sections) return [];

        const sections = analysis.sections as any;
        if (analysis.callType === 'evaluation') {
            return [
                { subject: 'Intro', A: sections.intro?.score || 0, fullMark: 10 },
                { subject: 'Biz Analysis', A: sections.bizAnalysis?.score || 0, fullMark: 10 },
                { subject: 'Challenges', A: sections.challenges?.score || 0, fullMark: 10 },
                { subject: 'Goals', A: sections.goals?.score || 0, fullMark: 10 },
                { subject: 'Transition', A: sections.transition?.score || 0, fullMark: 10 },
                { subject: 'Funnel Flow', A: sections.funnelFlow?.score || 0, fullMark: 10 },
                { subject: 'Timeline', A: sections.timeline?.score || 0, fullMark: 10 },
                { subject: 'ROI Calc', A: sections.roiCalc?.score || 0, fullMark: 10 },
                { subject: 'TC / PD', A: sections.tempCheck?.score || 0, fullMark: 10 },
                { subject: 'Objections', A: sections.objections?.score || 0, fullMark: 10 },
                { subject: 'Next Steps', A: sections.decisionLeadership?.score || 0, fullMark: 10 },
            ];
        } else {
            return [
                { subject: 'Intro', A: sections.intro?.score || 0, fullMark: 10 },
                { subject: 'Tech Qs', A: sections.technicalQuestions?.score || 0, fullMark: 10 },
                { subject: 'Behaviours', A: sections.sevenBehaviours?.score || 0, fullMark: 10 },
                { subject: 'Refund', A: sections.refundExplanation?.score || 0, fullMark: 10 },
                { subject: 'TC / Objections', A: sections.tempCheckObjections?.score || 0, fullMark: 10 },
                { subject: 'Price Drop', A: sections.rePriceDrop?.score || 0, fullMark: 10 },
                { subject: 'Contract', A: sections.contractReview?.score || 0, fullMark: 10 },
                { subject: 'Closing', A: sections.closing?.score || 0, fullMark: 10 },
            ];
        }
    };

    const radarData = getRadarData(calls[0]?.analysis);
    const lineData = [...calls].reverse().map((c, i) => ({
        name: `Call ${i + 1}`,
        score: c.analysis ? c.analysis.totalScore / 10 : 0,
        date: formatDate(c.date)
    }));

    const sortedRadar = [...radarData].sort((a, b) => b.A - a.A);
    const topMetric = sortedRadar.length > 0 ? sortedRadar[0] : null;
    const growthArea = sortedRadar.length > 0 ? sortedRadar[sortedRadar.length - 1] : null;

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50">
            <Header
                breadcrumbs={[
                    { label: 'Representative Profile' }
                ]}
                actions={
                    <Button
                        className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-bold h-11 px-6 rounded-xl shadow-lg shadow-indigo-100 uppercase text-xs tracking-wider"
                        onClick={() => alert('AI Pipeline: Generating Training Plan...')}
                    >
                        <Brain className="w-4 h-4" />
                        Generate Training Plan
                    </Button>
                }
            />

            <div className="flex-1 overflow-y-auto px-8 py-8 pb-20">
                {/* Profile Header */}
                <div className="mb-10">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight font-outfit uppercase leading-none">
                        {rep.name.toLowerCase().replace(/\s+/g, '')}
                    </h1>
                    <p className="text-slate-400 text-sm font-semibold mt-2 tracking-wide truncate max-w-md">{rep.email}</p>
                </div>

                {/* KPI Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    <KPICard
                        title="OVERALL SCORE"
                        value={`${rep.avgScore.toFixed(1)} / 10`}
                        icon={<Activity className="w-5 h-5 text-indigo-600" />}
                        iconBg="bg-indigo-50"
                        content={
                            <Progress
                                value={rep.avgScore * 10}
                                className="h-1.5 bg-slate-100 mt-4"
                                indicatorClassName={cn(
                                    rep.avgScore < 5 ? "bg-red-500" : rep.avgScore < 7 ? "bg-amber-500" : "bg-green-500"
                                )}
                            />
                        }
                    />

                    <KPICard
                        title="TOTAL CALLS"
                        value={`${rep.totalCalls} Analyzed`}
                        subtext="Last 30 days"
                        icon={<Clock className="w-5 h-5 text-blue-600" />}
                        iconBg="bg-blue-50"
                    />

                    <KPICard
                        title="TOP METRIC"
                        value={topMetric?.subject || 'N/A'}
                        subtext={topMetric ? `Score: ${topMetric.A.toFixed(1)}` : 'N/A'}
                        icon={<Award className="w-5 h-5 text-green-600" />}
                        iconBg="bg-green-50"
                        subtextColor="text-green-600"
                    />

                    <KPICard
                        title="GROWTH AREA"
                        value={growthArea?.subject || 'N/A'}
                        subtext={growthArea ? `Score: ${growthArea.A.toFixed(1)}` : 'N/A'}
                        icon={<Target className="w-5 h-5 text-red-600" />}
                        iconBg="bg-red-50"
                        subtextColor="text-red-600"
                    />
                </div>

                {/* Charts Area */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-12">
                    <SkillRadar data={radarData} />
                    <TrendChart data={lineData} />
                </div>

                {/* AI Banner */}
                <Card className="border-none shadow-xl bg-white mb-16 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                        <Brain className="w-32 h-32 text-indigo-600" />
                    </div>
                    <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
                        <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-8 text-indigo-600 shadow-inner">
                            <Brain className="w-10 h-10" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">AI Insights Ready</h2>
                        <p className="text-slate-500 max-w-xl mb-10 text-base font-medium leading-relaxed">
                            Generate a customized training plan and performance analysis for {rep.name} based on their call history.
                        </p>
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold h-14 px-10 rounded-2xl shadow-2xl shadow-indigo-200 gap-3 text-sm uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98]"
                            onClick={() => alert('AI Analysis Initialized...')}
                        >
                            Generate Analysis Now
                            <ArrowRight className="w-5 h-5" />
                        </Button>
                    </CardContent>
                </Card>

                {/* Recent Call History */}
                <div className="mb-20">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <Activity className="w-5 h-5 text-indigo-600" />
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Recent Call History</h2>
                        </div>
                        <Button variant="ghost" className="text-xs font-bold uppercase tracking-widest h-9 text-slate-400 hover:text-indigo-600">
                            View All Calls
                        </Button>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow className="hover:bg-transparent border-slate-100 h-14">
                                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-8">Date</TableHead>
                                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prospect</TableHead>
                                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Outcome</TableHead>
                                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg Score</TableHead>
                                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right pr-8">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {calls.map((call) => (
                                    <TableRow key={call.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors group h-20">
                                        <TableCell className="pl-8">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-900">{formatDate(call.date)}</span>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase">{formatDuration(call.duration)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-900">{call.prospectName}</span>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-[150px]">{call.prospectCompany || 'Direct'}</span>
                                                    <span className="text-[8px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter ring-1 ring-indigo-200">Direct</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={getBadgeVariant(call.analysis?.outcome || '')}
                                                className="text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-tight"
                                            >
                                                {call.analysis?.outcome || 'Analyzing...'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-4 w-[160px]">
                                                <span className={cn("text-sm font-black min-w-[32px]", getScoreColor((call.analysis?.totalScore || 0) / 10))}>
                                                    {((call.analysis?.totalScore || 0) / 10).toFixed(1)}
                                                </span>
                                                <Progress
                                                    value={call.analysis?.totalScore || 0}
                                                    className="h-1 bg-slate-100 flex-1"
                                                    indicatorClassName={cn(
                                                        (call.analysis?.totalScore || 0) < 50 ? "bg-red-500" : (call.analysis?.totalScore || 0) < 70 ? "bg-amber-500" : "bg-green-500"
                                                    )}
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-8">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-xs font-black text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 gap-2 px-4 h-10 rounded-xl group/btn"
                                                onClick={() => window.location.href = `/calls/${call.id}`}
                                            >
                                                Review
                                                <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
        </div>
    );
}

function KPICard({ title, value, subtext, icon, iconBg, content, subtextColor }: any) {
    return (
        <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden group hover:shadow-md transition-all">
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className={cn("p-2.5 rounded-xl shadow-inner", iconBg)}>
                        {icon}
                    </div>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mb-2">{title}</p>
                <div className="flex flex-col">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">{value}</h3>
                    {subtext && (
                        <p className={cn("text-[10px] font-bold mt-2 uppercase tracking-wide", subtextColor || "text-slate-400")}>
                            {subtext}
                        </p>
                    )}
                </div>
                {content}
            </CardContent>
        </Card>
    );
}
