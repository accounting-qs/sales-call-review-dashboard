'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Users,
    Search,
    BarChart3,
    ChevronRight,
    User as UserIcon,
    LayoutDashboard,
    Settings as SettingsIcon,
    Phone,
    BookOpen,
    Brain,
    RefreshCw,
    MoreHorizontal,
    Edit2,
    Trash2
} from 'lucide-react';
import { useReps } from '@/lib/hooks/useReps';
import { useAuth } from '@/lib/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const getScoreColor = (score: number) => {
    if (score < 5) return 'bg-red-500';
    if (score < 7) return 'bg-amber-500';
    return 'bg-green-500';
};

const getAvatarColor = (name: string) => {
    const char = name.charAt(0).toUpperCase();
    if (['J', 'A', 'S', 'O', 'N'].includes(char)) return 'bg-indigo-600';
    if (['M', 'E', 'L', 'I'].includes(char)) return 'bg-purple-600';
    return 'bg-slate-400';
};

export function Sidebar() {
    const pathname = usePathname();
    const { reps, loading } = useReps();
    const { user } = useAuth();
    const [search, setSearch] = useState('');

    const [isEditRepOpen, setIsEditRepOpen] = useState(false);
    const [editRepEmail, setEditRepEmail] = useState('');
    const [editRepName, setEditRepName] = useState('');
    const [edittingRep, setEdittingRep] = useState(false);

    const [isDeleteRepOpen, setIsDeleteRepOpen] = useState(false);
    const [deleteRepEmail, setDeleteRepEmail] = useState('');
    const [deletingRep, setDeletingRep] = useState(false);

    const openEditRep = (e: React.MouseEvent, rep: any) => {
        e.preventDefault();
        e.stopPropagation();
        setEditRepEmail(rep.email);
        setEditRepName(rep.name);
        setIsEditRepOpen(true);
    };

    const openDeleteRep = (e: React.MouseEvent, email: string) => {
        e.preventDefault();
        e.stopPropagation();
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

    const isManager = user?.role === 'manager' || !user; // default to manager for demo

    const filteredReps = reps.filter(rep =>
        rep.name.toLowerCase().includes(search.toLowerCase()) ||
        rep.email.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <aside className="w-[300px] h-screen bg-white border-r border-slate-200 flex flex-col fixed left-0 top-0 z-40">
            {/* Logo & Headline */}
            <div className="p-6">
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                        <BarChart3 className="text-white w-5 h-5" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-slate-900">SalesPulse</span>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-10">
                    {isManager ? 'Manager Dashboard' : 'Representative Panel'}
                </p>
            </div>

            {/* Search - Manager Only */}
            {isManager && (
                <div className="px-6 mb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search representatives..."
                            className="pl-10 h-9 bg-slate-50 border-none text-sm placeholder:text-slate-400"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            )}

            <ScrollArea className="flex-1">
                <div className="px-3 pb-6">
                    {/* Main Links */}
                    <div className="mb-6">
                        {isManager ? (
                            <>
                                <Link
                                    href="/dashboard"
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1",
                                        pathname === '/dashboard'
                                            ? "bg-slate-100 text-slate-900"
                                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                    )}
                                >
                                    <LayoutDashboard className="w-4 h-4" />
                                    Team Overview
                                    <Badge variant="secondary" className="ml-auto bg-slate-200 text-slate-600 text-[10px] px-1.5 py-0">
                                        {reps.length} ACTIVE
                                    </Badge>
                                </Link>
                                <Link
                                    href="/knowledge"
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1",
                                        pathname === '/knowledge'
                                            ? "bg-slate-100 text-slate-900"
                                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                    )}
                                >
                                    <BookOpen className="w-4 h-4" />
                                    Knowledge Base
                                </Link>
                                <Link
                                    href="/dashboard/sync"
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1",
                                        pathname === '/dashboard/sync'
                                            ? "bg-slate-100 text-slate-900"
                                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                    )}
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Sync Fireflies
                                </Link>
                                <Link
                                    href="/dashboard/settings/ai"
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1",
                                        pathname === '/dashboard/settings/ai'
                                            ? "bg-slate-100 text-slate-900"
                                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                    )}
                                >
                                    <Brain className="w-4 h-4" />
                                    AI Instructions
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link
                                    href={`/reps/${user?.email}`}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1",
                                        pathname === `/reps/${user?.email}`
                                            ? "bg-slate-100 text-slate-900"
                                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                    )}
                                >
                                    <BarChart3 className="w-4 h-4" />
                                    My Performance
                                </Link>
                                <Link
                                    href="/my-calls"
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1 shadow-sm",
                                        pathname === '/my-calls'
                                            ? "bg-slate-100 text-slate-900"
                                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                    )}
                                >
                                    <Phone className="w-4 h-4" />
                                    My Calls
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Representatives Section - Manager Only */}
                    {isManager && (
                        <div>
                            <h3 className="px-3 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Sales Representatives
                            </h3>

                            <div className="space-y-1">
                                {loading ? (
                                    Array.from({ length: 4 }).map((_, i) => (
                                        <div key={i} className="flex items-center gap-3 px-3 py-2 animate-pulse">
                                            <div className="w-8 h-8 rounded-full bg-slate-100" />
                                            <div className="flex-1 space-y-2">
                                                <div className="h-3 bg-slate-100 rounded w-24" />
                                                <div className="h-2 bg-slate-100 rounded w-16" />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    filteredReps.map((rep) => (
                                        <div key={rep.email} className="group relative">
                                            <Link
                                                href={`/reps/${rep.email}`}
                                                className={cn(
                                                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                                                    pathname === `/reps/${rep.email}`
                                                        ? "bg-slate-100"
                                                        : "hover:bg-slate-50"
                                                )}
                                            >
                                                <Avatar className="h-8 w-8 ring-2 ring-white">
                                                    <AvatarFallback className={cn("text-white text-xs font-bold", getAvatarColor(rep.name))}>
                                                        {rep.name.charAt(0)}
                                                    </AvatarFallback>
                                                </Avatar>

                                                <div className="flex-1 min-w-0 pr-6">
                                                    <p className={cn(
                                                        "text-sm font-medium truncate",
                                                        pathname === `/reps/${rep.email}` ? "text-slate-900" : "text-slate-600 group-hover:text-slate-900"
                                                    )}>
                                                        {rep.name}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-slate-400 font-medium">
                                                            {rep.totalCalls} Calls
                                                        </span>
                                                        <div className={cn("w-1 h-1 rounded-full", getScoreColor(rep.avgScore))} />
                                                        <span className="text-[10px] text-slate-400 font-medium">
                                                            {rep.avgScore.toFixed(1)} Avg
                                                        </span>
                                                    </div>
                                                </div>
                                            </Link>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button 
                                                        variant="ghost" 
                                                        className="h-6 w-6 p-0 absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 hover:bg-slate-200 rounded-md transition-opacity"
                                                    >
                                                        <MoreHorizontal className="h-3.5 w-3.5 text-slate-500" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start" side="right" className="w-40 rounded-xl border-slate-100 shadow-xl ml-1">
                                                    <DropdownMenuItem 
                                                        className="gap-2 text-xs font-bold cursor-pointer text-slate-700 focus:bg-slate-50"
                                                        onClick={(e) => openEditRep(e, rep)}
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                        Edit name
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem 
                                                        className="gap-2 text-xs font-bold cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700"
                                                        onClick={(e) => openDeleteRep(e, rep.email)}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Footer / Settings */}
            <div className="p-4 border-t border-slate-100 mt-auto">
                <Link
                    href="/settings"
                    className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        pathname === '/settings'
                            ? "bg-slate-100 text-slate-900"
                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                    )}
                >
                    {isManager ? <SettingsIcon className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                    {isManager ? 'Manager Settings' : 'My Account'}
                </Link>
            </div>

            {/* Edit Rep Dialog */}
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

            {/* Delete Rep Dialog */}
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
        </aside>
    );
}
