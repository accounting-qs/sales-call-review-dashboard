'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { cn } from '@/lib/utils';

const SIDEBAR_STORAGE_KEY = 'salespulse-sidebar-collapsed';

interface ShellProps {
    children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
    const pathname = usePathname();
    const isLoginPage = pathname === '/login';

    const [collapsed, setCollapsed] = useState(false);

    // Hydrate from localStorage after mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
            if (stored === 'true') setCollapsed(true);
        } catch {}
    }, []);

    const toggleCollapsed = () => {
        setCollapsed(prev => {
            const next = !prev;
            try { localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next)); } catch {}
            return next;
        });
    };

    return (
        <div className="flex min-h-screen w-full">
            {!isLoginPage && (
                <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} />
            )}
            <main
                className={cn(
                    "flex-1 flex flex-col relative min-h-screen transition-[margin-left] duration-300 ease-in-out",
                    !isLoginPage
                        ? collapsed ? "ml-16" : "ml-[240px]"
                        : "ml-0"
                )}
            >
                <div className="flex-1 flex flex-col">
                    {children}
                </div>
            </main>
        </div>
    );
}
