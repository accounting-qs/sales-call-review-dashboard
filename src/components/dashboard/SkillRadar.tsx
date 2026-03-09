'use client';

import React from 'react';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Tooltip
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface SkillRadarProps {
    data: {
        subject: string;
        A: number;
        fullMark: number;
    }[];
}

export function SkillRadar({ data }: SkillRadarProps) {
    return (
        <Card className="border-none shadow-sm h-full bg-white">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-900">Skill Proficiency</CardTitle>
                <CardDescription className="text-xs">
                    Performance across the 11 key call sections
                </CardDescription>
            </CardHeader>
            <CardContent className="h-[350px] pt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                        <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                        <PolarAngleAxis
                            dataKey="subject"
                            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
                            stroke="#cbd5e1"
                        />
                        <PolarRadiusAxis
                            angle={30}
                            domain={[0, 10]}
                            tick={false}
                            axisLine={false}
                        />
                        <Radar
                            name="Avg. Score"
                            dataKey="A"
                            stroke="#6366f1"
                            strokeWidth={2}
                            fill="#6366f1"
                            fillOpacity={0.15}
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
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
