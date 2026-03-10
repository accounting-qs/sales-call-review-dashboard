'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { cn } from '@/lib/utils';

interface ShellProps {
    children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
    const pathname = usePathname();
    const isLoginPage = pathname === '/login';

    return (
        <div className="flex min-h-screen w-full">
            {!isLoginPage && <Sidebar />}
            <main className={cn(
                "flex-1 flex flex-col relative min-h-screen",
                !isLoginPage ? "ml-[300px]" : "ml-0"
            )}>
                <div className="flex-1 flex flex-col">
                    {children}
                </div>
            </main>
        </div>
    );
}
