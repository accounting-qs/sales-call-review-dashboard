'use client';

import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface MetricBarChartProps {
    data: {
        name: string;
        score: number;
    }[];
}

export function MetricBarChart({ data }: MetricBarChartProps) {
    return (
        <Card className="border-none shadow-sm h-full bg-white">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-900">Team Proficiency by Metric</CardTitle>
                <CardDescription className="text-xs">
                    Average score across all analyzed calls
                </CardDescription>
            </CardHeader>
            <CardContent className="h-[434px] pt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                        barSize={16}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" domain={[0, 10]} hide />
                        <YAxis
                            dataKey="name"
                            type="category"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                            width={100}
                        />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="bg-white p-2 shadow-lg rounded-lg border border-slate-100 text-[10px] font-bold">
                                            <p className="text-slate-900">{payload[0]!.value.toString()} / 10</p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Bar
                            dataKey="score"
                            radius={[0, 4, 4, 0]}
                            fill="#6366f1"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill="#6366f1" />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
