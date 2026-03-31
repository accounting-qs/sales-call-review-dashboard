'use client';

import React from 'react';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator
} from '@/components/ui/breadcrumb';

interface HeaderProps {
    breadcrumbs: { label: string; href?: string }[];
    actions?: React.ReactNode;
}

export function Header({ breadcrumbs, actions }: HeaderProps) {
    return (
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-slate-100 bg-white/80 px-6 backdrop-blur-md gap-4">
            <div className="flex flex-1 items-center gap-4 min-w-0">
                <Breadcrumb>
                    <BreadcrumbList>
                        {breadcrumbs.map((bc, i) => (
                            <React.Fragment key={bc.label}>
                                <BreadcrumbItem>
                                    {bc.href ? (
                                        <BreadcrumbLink href={bc.href} className="text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors">
                                            {bc.label}
                                        </BreadcrumbLink>
                                    ) : (
                                        <BreadcrumbPage className="text-xs font-semibold text-slate-900">
                                            {bc.label}
                                        </BreadcrumbPage>
                                    )}
                                </BreadcrumbItem>
                                {i < breadcrumbs.length - 1 && <BreadcrumbSeparator className="text-slate-300" />}
                            </React.Fragment>
                        ))}
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            <div className="flex items-center gap-4 flex-shrink-0">
                {actions}
                <div className="h-4 w-[1px] bg-slate-200" />
                <UserNav />
            </div>
        </header>
    );
}

function UserNav() {
    return (
        <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-900 leading-none">Admin Manager</p>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">admin@quantum-scaling.com</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                <span className="text-xs font-bold text-slate-500">M</span>
            </div>
        </div>
    );
}
