import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const repEmail = searchParams.get('repEmail');

    try {
        const calls = await prisma.call.findMany({
            where: repEmail ? { rep: { email: repEmail } } : undefined,
            orderBy: { date: 'desc' },
            include: { analysis: true, rep: true }
        });

        const formattedCalls = calls.map(c => ({
            id: c.id,
            firefliesId: c.id,
            title: c.title,
            date: c.date,
            duration: c.duration,
            repName: c.rep?.name || c.repId || 'Unknown',
            repEmail: c.rep?.email,
            prospectName: c.prospectName,
            prospectCompany: c.prospectCompany,
            transcriptUrl: c.transcriptUrl,
            status: c.status,
            type: c.analysis?.callType || c.callCategory || 'other',
            score: c.analysis?.totalScore || 0,
            outcome: c.analysis?.outcome || 'Analyzed',
            createdAt: c.createdAt,
            analyzedAt: c.analysis?.updatedAt
        }));

        return NextResponse.json(formattedCalls);
    } catch (e) {
        console.error("[API] Error fetching calls:", e);
        return NextResponse.json({ error: 'Failed to load calls' }, { status: 500 });
    }
}
