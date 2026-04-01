import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const reps = await prisma.rep.findMany({
            orderBy: { name: 'asc' },
            include: {
                calls: {
                    include: { analysis: true }
                }
            }
        });

        const formattedReps = reps.map(rep => {
            const completedCalls = rep.calls.filter(c => c.status === 'completed' && c.analysis);
            const totalScore = completedCalls.reduce((sum, c) => sum + (c.analysis?.totalScore || 0), 0);
            
            return {
                id: rep.id,
                email: rep.email,
                name: rep.name,
                totalCalls: completedCalls.length,
                avgScore: completedCalls.length > 0 ? totalScore / completedCalls.length : 0,
                createdAt: rep.createdAt,
                isActive: true
            };
        });

        return NextResponse.json(formattedReps);
    } catch (e) {
        console.error("[API] Error fetching reps:", e);
        return NextResponse.json({ error: 'Failed to load reps' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const rep = await prisma.rep.create({
            data: {
                email: body.email.toLowerCase().trim(),
                name: body.name.trim()
            }
        });
        return NextResponse.json(rep);
    } catch (e) {
        console.error("[API] Error creating rep:", e);
        return NextResponse.json({ error: 'Failed to create rep' }, { status: 500 });
    }
}
