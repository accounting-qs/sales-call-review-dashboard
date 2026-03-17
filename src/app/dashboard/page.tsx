'use client';

import React from 'react';
import {
    Users,
    PhoneCall,
    TrendingUp,
    AlertCircle,
    Filter,
    RefreshCw,
    MoreHorizontal,
    Edit2,
    Trash2
} from 'lucide-react';
import { useReps } from '@/lib/hooks/useReps';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { doc, setDoc, deleteDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { MetricBarChart } from '@/components/dashboard/MetricBarChart';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';

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
    const [isAddRepOpen, setIsAddRepOpen] = React.useState(false);
    const [newRepEmail, setNewRepEmail] = React.useState('');
    const [newRepName, setNewRepName] = React.useState('');
    const [addingRep, setAddingRep] = React.useState(false);

    // Edit Rep State
    const [isEditRepOpen, setIsEditRepOpen] = React.useState(false);
    const [editRepEmail, setEditRepEmail] = React.useState('');
    const [editRepName, setEditRepName] = React.useState('');
    const [edittingRep, setEdittingRep] = React.useState(false);

    // Delete Rep State
    const [isDeleteRepOpen, setIsDeleteRepOpen] = React.useState(false);
    const [deleteRepEmail, setDeleteRepEmail] = React.useState('');
    const [deletingRep, setDeletingRep] = React.useState(false);

    const openEditRep = (rep: any) => {
        setEditRepEmail(rep.email);
        setEditRepName(rep.name);
        setIsEditRepOpen(true);
    };

    const openDeleteRep = (email: string) => {
        setDeleteRepEmail(email);
        setIsDeleteRepOpen(true);
    };

    const handleEditRep = async () => {
        if (!editRepName || !editRepEmail) return;
        setEdittingRep(true);
        try {
            await updateDoc(doc(db, 'reps', editRepEmail), {
                name: editRepName.trim(),
            });
            setIsEditRepOpen(false);
        } catch (e) {
            console.error("Failed to edit rep", e);
        } finally {
            setEdittingRep(false);
        }
    };

    const handleDeleteRep = async () => {
        if (!deleteRepEmail) return;
        setDeletingRep(true);
        try {
            await deleteDoc(doc(db, 'reps', deleteRepEmail));
            setIsDeleteRepOpen(false);
        } catch (e) {
            console.error("Failed to delete rep", e);
        } finally {
            setDeletingRep(false);
        }
    };

    const handleAddRep = async () => {
        if (!newRepEmail || !newRepName) return;
        setAddingRep(true);
        try {
            await setDoc(doc(db, 'reps', newRepEmail.toLowerCase().trim()), {
                name: newRepName.trim(),
                email: newRepEmail.toLowerCase().trim(),
                totalCalls: 0,
                avgScore: 0,
                isActive: true,
                createdAt: Timestamp.now()
            });
            setIsAddRepOpen(false);
            setNewRepEmail('');
            setNewRepName('');
        } catch (e) {
            console.error("Failed to add rep", e);
        } finally {
            setAddingRep(false);
        }
    };

    const avgTeamScore = reps.length > 0
        ? reps.reduce((acc, r) => acc + r.avgScore, 0) / reps.length
        : 0;

    const totalCalls = reps.reduce((acc, r) => acc + r.totalCalls, 0);
    const topPerformer = reps.length > 0 ? [...reps].sort((a, b) => b.avgScore - a.avgScore)[0] : null;

    // Derived metric data for team overview bar chart
    const proficiencyData = [
        { name: 'Intro', score: 7.2 },
        { name: 'Biz Analysis', score: 7.8 },
        { name: 'Challenges', score: 6.9 },
        { name: 'Goals', score: 6.8 },
        { name: 'Transition', score: 7.5 },
        { name: 'Funnel Flow', score: 6.2 },
        { name: 'Timeline', score: 6.5 },
        { name: 'ROI Calc', score: 6.7 },
        { name: 'TC / PD', score: 3.5 },
        { name: 'Objections', score: 5.1 },
        { name: 'Next Steps', score: 4.8 },
    ];

    if (loading) return (
        <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
    );

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50">
            <Header
                breadcrumbs={[{ label: 'Manager Dashboard' }, { label: 'Team Overview' }]}
                actions={
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 gap-2 text-xs font-bold uppercase tracking-wider border-slate-200"
                            onClick={() => window.location.href = '/dashboard/sync'}
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Review Recordings
                        </Button>
                        <Button variant="outline" size="sm" className="h-9 gap-2 text-xs font-bold uppercase tracking-wider border-slate-200">
                            <Filter className="w-3 h-3" />
                            Filter
                        </Button>
                        <Button 
                            size="sm" 
                            className="h-9 gap-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold uppercase tracking-wider"
                            onClick={() => setIsAddRepOpen(true)}
                        >
                            <Users className="w-3 h-3" />
                            Add Representative
                        </Button>
                    </div>
                }
            />

            <Dialog open={isAddRepOpen} onOpenChange={setIsAddRepOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl border-none shadow-xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black uppercase tracking-tight">Add Representative</DialogTitle>
                        <DialogDescription className="text-xs font-bold uppercase tracking-widest text-slate-400">
                            Calls from Fireflies matching this email will be automatically assigned.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-900">Email Address</Label>
                            <Input
                                placeholder="rep@company.com"
                                className="h-11 rounded-xl bg-slate-50 border-slate-100"
                                value={newRepEmail}
                                onChange={(e) => setNewRepEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-900">Full Name</Label>
                            <Input
                                placeholder="Jane Doe"
                                className="h-11 rounded-xl bg-slate-50 border-slate-100"
                                value={newRepName}
                                onChange={(e) => setNewRepName(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            className="rounded-xl font-bold uppercase text-[10px] tracking-widest h-11"
                            onClick={() => setIsAddRepOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button 
                            className="bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold uppercase text-[10px] tracking-widest h-11"
                            onClick={handleAddRep}
                            disabled={addingRep || !newRepEmail || !newRepName}
                        >
                            {addingRep ? 'Adding...' : 'Add Representative'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isEditRepOpen} onOpenChange={setIsEditRepOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl border-none shadow-xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black uppercase tracking-tight">Edit Representative</DialogTitle>
                        <DialogDescription className="text-xs font-bold uppercase tracking-widest text-slate-400">
                            Update the name for {editRepEmail}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-900">Full Name</Label>
                            <Input
                                placeholder="Jane Doe"
                                className="h-11 rounded-xl bg-slate-50 border-slate-100"
                                value={editRepName}
                                onChange={(e) => setEditRepName(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            className="rounded-xl font-bold uppercase text-[10px] tracking-widest h-11"
                            onClick={() => setIsEditRepOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button 
                            className="bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold uppercase text-[10px] tracking-widest h-11"
                            onClick={handleEditRep}
                            disabled={edittingRep || !editRepName}
                        >
                            {edittingRep ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isDeleteRepOpen} onOpenChange={setIsDeleteRepOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl border-none shadow-xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black uppercase tracking-tight">Delete Representative</DialogTitle>
                        <DialogDescription className="text-xs font-bold uppercase tracking-widest text-slate-500">
                            Are you sure you want to completely remove <strong>{deleteRepEmail}</strong>? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4">
                        <Button 
                            variant="outline" 
                            className="rounded-xl font-bold uppercase text-[10px] tracking-widest h-11"
                            onClick={() => setIsDeleteRepOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button 
                            variant="destructive"
                            className="rounded-xl font-bold uppercase text-[10px] tracking-widest h-11 bg-red-600 hover:bg-red-700"
                            onClick={handleDeleteRep}
                            disabled={deletingRep}
                        >
                            {deletingRep ? 'Deleting...' : 'Delete Rep'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="flex-1 overflow-y-auto px-8 py-8 pb-20">
                <div className="mb-8 text-center md:text-left">
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-outfit uppercase">
                        Team Overview
                    </h1>
                    <p className="text-slate-400 text-sm font-medium mt-1 uppercase tracking-widest">Aggregate performance data for all sales representatives</p>
                </div>

                {/* KPI Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                    <KPICard
                        title="Total Team Calls"
                        value={totalCalls.toString()}
                        subtext="Calls Analyzed"
                        icon={<PhoneCall className="w-5 h-5 text-blue-600" />}
                        iconBg="bg-blue-50"
                    />
                    <KPICard
                        title="Team Average Score"
                        value={avgTeamScore.toFixed(1)}
                        suffix="/ 10.0"
                        icon={<TrendingUp className="w-5 h-5 text-indigo-600" />}
                        iconBg="bg-indigo-50"
                    />
                    <KPICard
                        title="Top Performer"
                        value={topPerformer ? topPerformer.name.toLowerCase().replace(/\s+/g, '') : 'N/A'}
                        subtext={topPerformer ? `${topPerformer.avgScore.toFixed(1)} AVG SCORE` : ''}
                        icon={
                            <Avatar className="h-5 w-5">
                                <AvatarFallback className={cn("text-white text-[10px] font-bold", topPerformer ? getAvatarColor(topPerformer.name) : 'bg-slate-200')}>
                                    {topPerformer ? topPerformer.name.charAt(0) : '?'}
                                </AvatarFallback>
                            </Avatar>
                        }
                        iconBg="bg-green-50"
                    />
                </div>

                {/* Charts Area */}
                <div className="grid grid-cols-1 gap-10 mb-10">
                    <MetricBarChart data={proficiencyData} />
                </div>

                {/* Ranking Table */}
                <div className="mb-8">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-6">Representative Ranking</h2>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden px-0">
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow className="hover:bg-transparent border-slate-100 h-12">
                                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-8 w-24">Rank</TableHead>
                                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Representative</TableHead>
                                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Calls</TableHead>
                                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Avg Score</TableHead>
                                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Status</TableHead>
                                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right pr-6 w-16"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reps.sort((a, b) => b.avgScore - a.avgScore).map((rep, i) => (
                                    <TableRow
                                        key={rep.email}
                                        className="border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer group h-16"
                                        onClick={() => window.location.href = `/reps/${rep.email}`}
                                    >
                                        <TableCell className="pl-8">
                                            <div className={cn(
                                                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                                                i === 0 ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-500"
                                            )}>
                                                {i + 1}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9 ring-2 ring-white">
                                                    <AvatarFallback className={cn("text-white text-xs font-bold", getAvatarColor(rep.name))}>
                                                        {rep.name.charAt(0)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase">{rep.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm font-medium text-slate-500">{rep.totalCalls}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3 w-48">
                                                <span className={cn("text-sm font-black min-w-[24px]", getScoreColor(rep.avgScore))}>
                                                    {rep.avgScore.toFixed(1)}
                                                </span>
                                                <Progress
                                                    value={rep.avgScore * 10}
                                                    className="h-1 bg-slate-100 flex-1"
                                                    indicatorClassName={cn(
                                                        rep.avgScore < 5 ? "bg-red-500" : rep.avgScore < 7 ? "bg-amber-500" : "bg-green-500"
                                                    )}
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant="outline" className={cn(
                                                "text-[10px] font-bold uppercase tracking-tight gap-1.5 py-1 px-3 border-none",
                                                rep.avgScore >= 6 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                                            )}>
                                                {rep.avgScore >= 6 ? (
                                                    <><TrendingUp className="w-3 h-3" /> Improving</>
                                                ) : (
                                                    <><AlertCircle className="w-3 h-3" /> Needs Coaching</>
                                                )}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-100 rounded-lg">
                                                        <MoreHorizontal className="h-4 w-4 text-slate-500" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-40 rounded-xl border-slate-100 shadow-xl">
                                                    <DropdownMenuItem 
                                                        className="gap-2 text-xs font-bold cursor-pointer text-slate-700 focus:bg-slate-50"
                                                        onClick={() => openEditRep(rep)}
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                        Edit name
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem 
                                                        className="gap-2 text-xs font-bold cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700"
                                                        onClick={() => openDeleteRep(rep.email)}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
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

function KPICard({ title, value, suffix, subtext, icon, iconBg }: any) {
    return (
        <Card className="border-none shadow-sm bg-white hover:shadow-md transition-all rounded-2xl">
            <CardContent className="p-6">
                <div className="flex items-center gap-4">
                    <div className={cn("p-3 rounded-xl", iconBg)}>
                        {icon}
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
                        <div className="flex items-baseline gap-1">
                            <h3 className="text-2xl font-black text-slate-900 uppercase">{value}</h3>
                            {suffix && <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">{suffix}</span>}
                        </div>
                        {subtext && <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tight">{subtext}</p>}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
