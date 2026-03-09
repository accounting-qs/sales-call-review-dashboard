'use client';

import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface TrendChartProps {
    data: {
        name: string;
        score: number;
        date: string;
    }[];
}

export function TrendChart({ data }: TrendChartProps) {
    return (
        <Card className="border-none shadow-sm h-full bg-white transition-all">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-900 leading-tight">Performance Trend</CardTitle>
                <CardDescription className="text-xs">
                    Historical analysis scores over recent calls
                </CardDescription>
            </CardHeader>
            <CardContent className="h-[350px] pt-4 pr-6">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="4" />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
                            dy={10}
                        />
                        <YAxis
                            domain={[0, 10]}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
                            dx={-5}
                        />
                        <Tooltip
                            contentStyle={{
                                borderRadius: '8px',
                                border: 'none',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: '#1e293b'
                            }}
                            labelClassName="text-slate-400 font-medium mb-1"
                        />
                        <Area
                            type="monotone"
                            dataKey="score"
                            stroke="#6366f1"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorScore)"
                            dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#fff', shadow: '0 0 10px rgba(99, 102, 241, 0.5)' }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
