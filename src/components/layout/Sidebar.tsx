'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Users,
    Search,
    BarChart3,
    ChevronRight,
    ChevronLeft,
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
// Sidebar rep management now uses Prisma via REST API

const getScoreColor = (score: number) => {
    if (score < 5) return 'bg-red-500';
    if (score < 7) return 'bg-amber-500';
    return 'bg-green-500';
};

const getAvatarColor = (name: string) => {
    const char = (name || '?').charAt(0).toUpperCase();
    if (['J', 'A', 'S', 'O', 'N'].includes(char)) return 'bg-indigo-600';
    if (['M', 'E', 'L', 'I'].includes(char)) return 'bg-purple-600';
    return 'bg-slate-400';
};

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
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
            await fetch(`/api/reps/${encodeURIComponent(editRepEmail)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editRepName.trim() }),
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
            await fetch(`/api/reps/${encodeURIComponent(deleteRepEmail)}`, {
                method: 'DELETE',
            });
            setIsDeleteRepOpen(false);
        } catch (e) {
            console.error("Failed to delete rep", e);
        } finally {
            setDeletingRep(false);
        }
    };

    const isManager = user?.role === 'manager' || !user; // default to manager for demo

    const filteredReps = reps.filter(rep =>
        (rep.name || 'Unknown').toLowerCase().includes(search.toLowerCase()) ||
        (rep.email || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <aside
            className={cn(
                "h-screen bg-white border-r border-slate-200 flex flex-col fixed left-0 top-0 z-40 transition-all duration-300 ease-in-out overflow-hidden",
                collapsed ? "w-16" : "w-[240px]"
            )}
        >
            {/* Logo & Headline */}
            <div className={cn("p-4 flex flex-col", collapsed ? "items-center" : "")}>
                <div className={cn("flex items-center gap-2 mb-1", collapsed && "justify-center")}>
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <BarChart3 className="text-white w-5 h-5" />
                    </div>
                    <span
                        className={cn(
                            "text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap transition-all duration-300",
                            collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 w-auto"
                        )}
                    >
                        SalesPulse
                    </span>
                </div>
                <p
                    className={cn(
                        "text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap transition-all duration-300",
                        collapsed ? "opacity-0 h-0 overflow-hidden pl-0" : "opacity-100 h-auto pl-10"
                    )}
                >
                    {isManager ? 'Manager Dashboard' : 'Representative Panel'}
                </p>
            </div>

            {/* Search - Manager Only, hidden when collapsed */}
            {isManager && !collapsed && (
                <div className="px-4 mb-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search reps..."
                            className="pl-10 h-9 bg-slate-50 border-none text-sm placeholder:text-slate-400"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            )}

            <ScrollArea className="flex-1">
                <div className={cn("pb-4", collapsed ? "px-1" : "px-2")}>
                    {/* Main Links */}
                    <div className="mb-4">
                        {isManager ? (
                            <>
                                <NavLink
                                    href="/dashboard"
                                    icon={<LayoutDashboard className="w-4 h-4 flex-shrink-0" />}
                                    label="Team Overview"
                                    active={pathname === '/dashboard'}
                                    collapsed={collapsed}
                                    badge={
                                        !collapsed ? (
                                            <Badge variant="secondary" className="ml-auto bg-slate-200 text-slate-600 text-[10px] px-1.5 py-0">
                                                {reps.length} ACTIVE
                                            </Badge>
                                        ) : undefined
                                    }
                                />
                                <NavLink
                                    href="/knowledge"
                                    icon={<BookOpen className="w-4 h-4 flex-shrink-0" />}
                                    label="Knowledge Base"
                                    active={pathname === '/knowledge'}
                                    collapsed={collapsed}
                                />
                                <NavLink
                                    href="/dashboard/sync"
                                    icon={<RefreshCw className="w-4 h-4 flex-shrink-0" />}
                                    label="Sync Fireflies"
                                    active={pathname === '/dashboard/sync'}
                                    collapsed={collapsed}
                                />
                                <NavLink
                                    href="/dashboard/settings/ai"
                                    icon={<Brain className="w-4 h-4 flex-shrink-0" />}
                                    label="AI Instructions"
                                    active={pathname === '/dashboard/settings/ai'}
                                    collapsed={collapsed}
                                />
                            </>
                        ) : (
                            <>
                                <NavLink
                                    href={`/reps/${user?.email}`}
                                    icon={<BarChart3 className="w-4 h-4 flex-shrink-0" />}
                                    label="My Performance"
                                    active={pathname === `/reps/${user?.email}`}
                                    collapsed={collapsed}
                                />
                                <NavLink
                                    href="/my-calls"
                                    icon={<Phone className="w-4 h-4 flex-shrink-0" />}
                                    label="My Calls"
                                    active={pathname === '/my-calls'}
                                    collapsed={collapsed}
                                />
                            </>
                        )}
                    </div>

                    {/* Representatives Section - Manager Only */}
                    {isManager && (
                        <div>
                            <h3
                                className={cn(
                                    "px-3 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap transition-all duration-300",
                                    collapsed ? "opacity-0 h-0 overflow-hidden" : "opacity-100"
                                )}
                            >
                                Sales Representatives
                            </h3>

                            <div className="space-y-1">
                                {loading ? (
                                    Array.from({ length: 4 }).map((_, i) => (
                                        <div key={i} className={cn("flex items-center gap-3 px-3 py-2 animate-pulse", collapsed && "justify-center px-0")}>
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex-shrink-0" />
                                            {!collapsed && (
                                                <div className="flex-1 space-y-2">
                                                    <div className="h-3 bg-slate-100 rounded w-24" />
                                                    <div className="h-2 bg-slate-100 rounded w-16" />
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    filteredReps.map((rep) => (
                                        <div key={rep.email} className="group relative">
                                            <Link
                                                href={`/reps/${rep.email}`}
                                                className={cn(
                                                    "flex items-center gap-3 rounded-lg transition-colors",
                                                    collapsed ? "justify-center px-0 py-2" : "px-3 py-2",
                                                    pathname === `/reps/${rep.email}`
                                                        ? "bg-slate-100"
                                                        : "hover:bg-slate-50"
                                                )}
                                                title={collapsed ? `${rep.name || 'Unknown'} — ${(rep.avgScore || 0).toFixed(1)} Avg` : undefined}
                                            >
                                                <Avatar className="h-8 w-8 ring-2 ring-white flex-shrink-0">
                                                    <AvatarFallback className={cn("text-white text-[10px] font-bold", getAvatarColor(rep.name || '?'))}>
                                                        {(rep.name || '?').charAt(0)}
                                                    </AvatarFallback>
                                                </Avatar>

                                                {!collapsed && (
                                                    <div className="flex flex-col flex-1 min-w-0">
                                                        <p className={cn(
                                                            "text-sm font-medium truncate",
                                                            pathname === `/reps/${rep.email}` ? "text-slate-900" : "text-slate-600 group-hover:text-slate-900"
                                                        )}>
                                                            <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase truncate max-w-[120px]">{rep.name || 'Unknown'}</span>
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[10px] text-slate-400 font-medium">
                                                                {rep.totalCalls || 0} Calls
                                                            </span>
                                                            <div className={cn("w-1 h-1 rounded-full", getScoreColor(rep.avgScore || 0))} />
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                                                                {(rep.avgScore || 0).toFixed(1)} Avg
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </Link>

                                            {!collapsed && (
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
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Collapse Toggle */}
            <div className="px-2 py-2 border-t border-slate-100">
                <button
                    onClick={onToggle}
                    className={cn(
                        "flex items-center gap-3 w-full rounded-lg text-sm font-medium text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-colors",
                        collapsed ? "justify-center px-2 py-2" : "px-3 py-2"
                    )}
                    title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {collapsed ? (
                        <ChevronRight className="w-4 h-4 flex-shrink-0" />
                    ) : (
                        <>
                            <ChevronLeft className="w-4 h-4 flex-shrink-0" />
                            <span className="text-xs font-bold uppercase tracking-widest whitespace-nowrap">Collapse</span>
                        </>
                    )}
                </button>
            </div>

            {/* Footer / Settings */}
            <div className="px-2 pb-4">
                <NavLink
                    href="/settings"
                    icon={isManager ? <SettingsIcon className="w-4 h-4 flex-shrink-0" /> : <UserIcon className="w-4 h-4 flex-shrink-0" />}
                    label={isManager ? 'Manager Settings' : 'My Account'}
                    active={pathname === '/settings'}
                    collapsed={collapsed}
                />
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

/* ─── Reusable NavLink for expanded / collapsed states ─── */
function NavLink({
    href,
    icon,
    label,
    active,
    collapsed,
    badge,
}: {
    href: string;
    icon: React.ReactNode;
    label: string;
    active: boolean;
    collapsed: boolean;
    badge?: React.ReactNode;
}) {
    return (
        <Link
            href={href}
            title={collapsed ? label : undefined}
            className={cn(
                "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors mb-1",
                collapsed ? "justify-center px-2 py-2" : "px-3 py-2",
                active
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            )}
        >
            {icon}
            {!collapsed && (
                <>
                    <span className="whitespace-nowrap truncate">{label}</span>
                    {badge}
                </>
            )}
        </Link>
    );
}
