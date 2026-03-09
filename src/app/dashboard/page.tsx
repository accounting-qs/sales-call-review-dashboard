'use client';

import React from 'react';
import {
    Users,
    PhoneCall,
    TrendingUp,
    AlertCircle,
    Search,
    ArrowUpRight,
    ArrowDownRight,
    Filter
} from 'lucide-react';
import { useReps } from '@/lib/hooks/useReps';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const getScoreColor = (score: number) => {
    if (score < 5) return 'text-red-500';
    if (score < 7) return 'text-amber-500';
    return 'text-green-500';
};

const getAvatarColor = (name: string) => {
    const char = name.charAt(0).toUpperCase();
    if (['J', 'A', 'S', 'O', 'N'].includes(char)) return 'bg-indigo-600';
    if (['M', 'E', 'L', 'I'].includes(char)) return 'bg-purple-600';
    return 'bg-slate-400';
};

export default function Dashboard() {
    const { reps, loading } = useReps();

    const avgTeamScore = reps.length > 0
        ? reps.reduce((acc, r) => acc + r.avgScore, 0) / reps.length
        : 0;

    const totalCalls = reps.reduce((acc, r) => acc + r.totalCalls, 0);

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50">
            <Header
                breadcrumbs={[{ label: 'Team Overview' }]}
                actions={
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-9 gap-2 text-xs font-bold uppercase tracking-wider border-slate-200">
                            <Filter className="w-3 h-3" />
                            Filter
                        </Button>
                        <Button size="sm" className="h-9 gap-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold uppercase tracking-wider">
                            <Users className="w-3 h-3" />
                            Add Representative
                        </Button>
                    </div>
                }
            />

            <div className="flex-1 overflow-y-auto px-8 py-6 pb-20">
                {/* KPI Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <KPICard
                        title="Avg Team Score"
                        value={avgTeamScore.toFixed(1)}
                        suffix="/ 10"
                        subtext="+0.4 from last month"
                        icon={<TrendingUp className="w-5 h-5 text-indigo-600" />}
                        trend="up"
                    />
                    <KPICard
                        title="Total Calls"
                        value={totalCalls.toString()}
                        subtext="Analyzed this period"
                        icon={<PhoneCall className="w-5 h-5 text-blue-600" />}
                    />
                    <KPICard
                        title="Active Reps"
                        value={reps.length.toString()}
                        subtext="Currently tracking"
                        icon={<Users className="w-5 h-5 text-green-600" />}
                    />
                    <KPICard
                        title="Priority Coaching"
                        value="3"
                        subtext="Reps below target score"
                        icon={<AlertCircle className="w-5 h-5 text-amber-600" />}
                    />
                </div>

                {/* Rep List Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <Card className="border-none shadow-sm bg-white overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 px-6 py-4">
                            <div>
                                <CardTitle className="text-base font-bold text-slate-900">Representative Rankings</CardTitle>
                                <CardDescription className="text-xs">Based on average call performance</CardDescription>
                            </div>
                            <Button variant="ghost" size="sm" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
                                Full Rankings
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-50">
                                {reps.sort((a, b) => b.avgScore - a.avgScore).map((rep, i) => (
                                    <Link
                                        key={rep.email}
                                        href={`/reps/${rep.email}`}
                                        className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/80 transition-colors group"
                                    >
                                        <span className="text-xs font-bold text-slate-300 w-4">{i + 1}</span>
                                        <Avatar className="h-10 w-10 ring-2 ring-white">
                                            <AvatarFallback className={cn("text-white text-sm font-bold", getAvatarColor(rep.name))}>
                                                {rep.name.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{rep.name}</h4>
                                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">{rep.role}</p>
                                        </div>
                                        <div className="text-right flex flex-col items-end gap-1">
                                            <span className={cn("text-sm font-extrabold", getScoreColor(rep.avgScore))}>
                                                {rep.avgScore.toFixed(1)}
                                            </span>
                                            <Progress
                                                value={rep.avgScore * 10}
                                                className="h-1 w-20 bg-slate-100"
                                                indicatorClassName={cn(
                                                    rep.avgScore < 5 ? "bg-red-500" : rep.avgScore < 7 ? "bg-amber-500" : "bg-green-500"
                                                )}
                                            />
                                        </div>
                                        <ArrowUpRight className="w-4 h-4 text-slate-200 group-hover:text-indigo-400 transition-all opacity-0 group-hover:opacity-100 translate-x-[-4px] group-hover:translate-x-0" />
                                    </Link>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-white overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 px-6 py-4">
                            <div>
                                <CardTitle className="text-base font-bold text-slate-900">Coaching Priorities</CardTitle>
                                <CardDescription className="text-xs">Identified areas for immediate improvement</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="space-y-6">
                                {reps.filter(r => r.avgScore < 7).slice(0, 3).map(rep => (
                                    <div key={rep.email} className="flex flex-col gap-3 p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarFallback className={cn("text-white text-[10px] font-bold", getAvatarColor(rep.name))}>
                                                        {rep.name.charAt(0)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-xs font-bold text-slate-900">{rep.name}</span>
                                            </div>
                                            <Badge variant="outline" className="text-[8px] bg-white border-slate-200 text-slate-500 font-bold uppercase tracking-tight">
                                                Growth Area Found
                                            </Badge>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Critical Weakness</p>
                                            <p className="text-sm font-bold text-slate-800">{rep.weaknesses[0] || 'Objection Handling'}</p>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-wider px-3 bg-white hover:bg-slate-50">
                                                View Calls
                                            </Button>
                                            <Button size="sm" className="h-7 text-[10px] font-bold uppercase tracking-wider px-3 bg-indigo-600 hover:bg-indigo-700">
                                                Assign Training
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function KPICard({ title, value, suffix, subtext, icon, trend }: any) {
    return (
        <Card className="border-none shadow-sm bg-white group hover:shadow-md transition-all">
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-2.5 bg-slate-50 rounded-xl text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                        {icon}
                    </div>
                    {trend && (
                        <div className={cn(
                            "flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full",
                            trend === 'up' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                        )}>
                            {trend === 'up' ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                            12%
                        </div>
                    )}
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
                <div className="flex items-baseline gap-1">
                    <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
                    {suffix && <span className="text-sm font-bold text-slate-400">{suffix}</span>}
                </div>
                <p className="text-[10px] text-slate-400 font-medium mt-2">{subtext}</p>
            </CardContent>
        </Card>
    );
}
