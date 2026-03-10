'use client';

import React from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
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
        <Card className="border-none shadow-sm h-full bg-white">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-900">Performance Trend</CardTitle>
                <CardDescription className="text-xs">
                    Average call scores over time
                </CardDescription>
            </CardHeader>
            <CardContent className="h-[350px] pt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
                            padding={{ left: 10, right: 10 }}
                        />
                        <YAxis
                            domain={[0, 10]}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
                        />
                        <CartesianGrid vertical={false} stroke="#f1f5f9" />
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="bg-white p-3 shadow-xl rounded-xl border border-slate-50">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-0.5">{payload[0]!.payload.name}</p>
                                            <p className="text-sm font-black text-indigo-600 uppercase">score : {payload[0]!.value!.toString()}</p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="score"
                            stroke="#6366f1"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorScore)"
                            dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
