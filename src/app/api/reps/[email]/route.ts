import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, context: { params: Promise<{ email: string }> }) {
    const { email } = await context.params;
    try {
        const decodedEmail = decodeURIComponent(email).toLowerCase();
        const rep = await prisma.rep.findUnique({
            where: { email: decodedEmail },
            include: { calls: { include: { analysis: true } } }
        });
        if (!rep) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const completedCalls = rep.calls.filter(c => c.status === 'completed' && c.analysis);
        const totalScore = completedCalls.reduce((sum, c) => sum + (c.analysis?.totalScore || 0), 0);
        
        return NextResponse.json({
            id: rep.id,
            email: rep.email,
            name: rep.name,
            totalCalls: completedCalls.length,
            avgScore: completedCalls.length > 0 ? totalScore / completedCalls.length : 0,
            createdAt: rep.createdAt,
            isActive: true
        });
    } catch (e) {
        console.error("[API] Error fetching rep:", e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function PUT(request: Request, context: { params: Promise<{ email: string }> }) {
    const { email } = await context.params;
    try {
        const body = await request.json();
        const updated = await prisma.rep.update({
            where: { email: decodeURIComponent(email).toLowerCase() },
            data: { name: body.name.trim() }
        });
        return NextResponse.json(updated);
    } catch (e) {
        console.error("[API] Error updating rep:", e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function DELETE(request: Request, context: { params: Promise<{ email: string }> }) {
    const { email } = await context.params;
    try {
        await prisma.rep.delete({
            where: { email: decodeURIComponent(email).toLowerCase() }
        });
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("[API] Error deleting rep:", e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
