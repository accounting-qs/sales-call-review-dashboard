'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
    Brain,
    Calendar,
    Clock,
    Target,
    TrendingUp,
    FileText,
    ArrowRight,
    TrendingDown,
    Activity,
    Award
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
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
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const getScoreColor = (score: number) => {
    if (score < 5) return 'text-red-500';
    if (score < 7) return 'text-amber-500';
    return 'text-green-500';
};

const getBadgeVariant = (outcome: string) => {
    const low = outcome.toLowerCase();
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

        // Listen to rep info
        const repRef = doc(db, 'reps', decodedEmail);
        const unsubRep = onSnapshot(repRef, (docSnap) => {
            if (docSnap.exists()) {
                setRep(docSnap.data() as Rep);
            }
        });

        // Listen to calls and analyses
        const callsRef = collection(db, 'calls');
        const qCalls = query(callsRef, where('repEmail', '==', decodedEmail), orderBy('date', 'desc'));

        const unsubCalls = onSnapshot(qCalls, async (snapshot) => {
            const callData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Call[];

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
            <p className="text-slate-500">Representative not found {decodedEmail}</p>
            <Button onClick={() => window.location.href = '/dashboard'}>Go to Dashboard</Button>
        </div>
    );

    // Radar chart data
    const latestAnalysis = calls[0]?.analysis;
    const radarData = latestAnalysis ? [
        { subject: 'Intro', A: latestAnalysis.sections.intro.score, fullMark: 10 },
        { subject: 'Biz Analysis', A: latestAnalysis.sections.bizAnalysis.score, fullMark: 10 },
        { subject: 'Challenges', A: latestAnalysis.sections.challenges.score, fullMark: 10 },
        { subject: 'Goals', A: latestAnalysis.sections.goals.score, fullMark: 10 },
        { subject: 'Transition', A: latestAnalysis.sections.transition.score, fullMark: 10 },
        { subject: 'Funnel Flow', A: latestAnalysis.sections.funnelFlow.score, fullMark: 10 },
        { subject: 'Timeline', A: latestAnalysis.sections.timeline.score, fullMark: 10 },
        { subject: 'ROI Calc', A: latestAnalysis.sections.roiCalc.score, fullMark: 10 },
        { subject: 'TC/PD', A: latestAnalysis.sections.tempCheck.score, fullMark: 10 },
        { subject: 'Objections', A: latestAnalysis.sections.objections.score, fullMark: 10 },
        { subject: 'Next Steps', A: latestAnalysis.sections.nextSteps.score, fullMark: 10 },
    ] : [];

    // Line chart data (call 1 to call 13)
    const lineData = [...calls].reverse().map((c, i) => ({
        name: `Call ${i + 1}`,
        score: c.analysis ? c.analysis.totalScore / 10 : 0,
        date: formatDate(c.date)
    }));

    const overallScore = rep.avgScore;
    const topMetric = radarData.length > 0 ? radarData.sort((a, b) => b.A - a.A)[0] : null;
    const growthArea = radarData.length > 0 ? radarData.sort((a, b) => a.A - b.A)[0] : null;

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50">
            <Header
                breadcrumbs={[
                    { label: 'Representative Profile' },
                    { label: rep.name }
                ]}
                actions={
                    <Button
                        className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-semibold h-9 px-4 rounded-lg"
                        onClick={() => alert('AI Pipeline coming soon: Training Plan Generation')}
                    >
                        <Brain className="w-4 h-4" />
                        Generate Training Plan
                    </Button>
                }
            />

            <div className="flex-1 overflow-y-auto px-8 py-6 pb-20">
                {/* Profile Info */}
                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-outfit uppercase">
                        {rep.name.replace(/\s+/g, '').toLowerCase()}
                    </h1>
                    <p className="text-slate-400 text-sm font-medium mt-1 uppercase tracking-widest">{rep.email}</p>
                </div>

                {/* KPI Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <Card className="border-none shadow-sm bg-white overflow-hidden group">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                    <Activity className="w-5 h-5" />
                                </div>
                                {overallScore > 6 && (
                                    <Badge variant="outline" className="text-[10px] border-green-100 text-green-600 bg-green-50">
                                        +1.2% Growth
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Overall Score</p>
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">{(overallScore).toFixed(1)} / 10</h3>
                            <Progress
                                value={overallScore * 10}
                                className="h-1.5 bg-slate-100"
                                indicatorClassName={cn(
                                    overallScore < 5 ? "bg-red-500" : overallScore < 7 ? "bg-amber-500" : "bg-green-500"
                                )}
                            />
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-white overflow-hidden group">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                    <Clock className="w-5 h-5" />
                                </div>
                            </div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Calls</p>
                            <h3 className="text-2xl font-bold text-slate-900 mb-0">{rep.totalCalls} Analyzed</h3>
                            <p className="text-[10px] text-slate-400 font-medium mt-1">Last 30 days active</p>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-white overflow-hidden group">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-green-50 rounded-lg text-green-600">
                                    <Award className="w-5 h-5" />
                                </div>
                            </div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Top Metric</p>
                            <h3 className="text-2xl font-bold text-slate-900 mb-0">{topMetric?.subject || 'N/A'}</h3>
                            <p className="text-[10px] text-green-600 font-bold mt-1 uppercase">Score: {topMetric?.A.toFixed(1)}</p>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-white overflow-hidden group">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-red-50 rounded-lg text-red-600">
                                    <Target className="w-5 h-5" />
                                </div>
                            </div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Growth Area</p>
                            <h3 className="text-2xl font-bold text-slate-900 mb-0">{growthArea?.subject || 'N/A'}</h3>
                            <p className="text-[10px] text-red-600 font-bold mt-1 uppercase">Score: {growthArea?.A.toFixed(1)}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-12">
                    {radarData.length > 0 ? (
                        <SkillRadar data={radarData} />
                    ) : (
                        <Card className="h-[434px] flex items-center justify-center text-slate-400 font-medium text-sm">
                            No skill data available
                        </Card>
                    )}
                    {lineData.length > 0 ? (
                        <TrendChart data={lineData} />
                    ) : (
                        <Card className="h-[434px] flex items-center justify-center text-slate-400 font-medium text-sm">
                            No trend data available
                        </Card>
                    )}
                </div>

                {/* AI Insight Section */}
                <Card className="border-none shadow-md bg-white mb-12 overflow-hidden bg-gradient-to-br from-indigo-50/50 to-white">
                    <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
                        <div className="w-16 h-16 bg-white shadow-sm border border-slate-100 rounded-2xl flex items-center justify-center mb-6 text-indigo-600">
                            <Brain className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">AI Insights Ready</h2>
                        <p className="text-slate-500 max-w-lg mb-8 text-sm leading-relaxed">
                            We've analyzed {rep.totalCalls} calls for {rep.name}. Generate a customized training plan
                            to focus on {growthArea?.subject} and improve overall conversion rates.
                        </p>
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 px-8 rounded-xl shadow-lg shadow-indigo-200 gap-2 text-sm uppercase tracking-wide"
                            onClick={() => alert('AI Pipeline coming soon: Full Analysis Generation')}
                        >
                            Generate Analysis Now
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </CardContent>
                </Card>

                {/* Recent Call History */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Recent Call History</h2>
                        <Button variant="outline" className="text-xs font-bold uppercase tracking-wider h-8 border-slate-200">
                            View All Calls
                        </Button>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow className="hover:bg-transparent border-slate-100">
                                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-6">Date</TableHead>
                                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Prospect</TableHead>
                                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Outcome</TableHead>
                                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Avg Score</TableHead>
                                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right pr-6">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {calls.map((call) => (
                                    <TableRow key={call.id} className="border-slate-100 hover:bg-slate-50/50 group transition-colors">
                                        <TableCell className="pl-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-900">{formatDate(call.date)}</span>
                                                <span className="text-[10px] text-slate-400 font-medium">{formatDuration(call.duration)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-900">{call.prospectName}</span>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] text-slate-500 font-medium">{call.prospectCompany}</span>
                                                    <span className="text-[8px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded font-bold uppercase tracking-tighter">Direct</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={getBadgeVariant(call.analysis?.outcome || '')}
                                                className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                                            >
                                                {call.analysis?.outcome || 'Analyzing...'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3 w-[120px]">
                                                <span className={cn("text-xs font-bold min-w-[30px]", getScoreColor((call.analysis?.totalScore || 0) / 10))}>
                                                    {(call.analysis?.totalScore || 0) / 10}
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
                                        <TableCell className="text-right pr-6">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 gap-1 px-2"
                                                onClick={() => window.location.href = `/calls/${call.id}`}
                                            >
                                                Review
                                                <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
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
