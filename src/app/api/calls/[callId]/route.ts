import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, context: { params: Promise<{ callId: string }> }) {
    const { callId } = await context.params;
    try {
        const call = await prisma.call.findUnique({
            where: { id: callId },
            include: { analysis: true, rep: true }
        });

        if (!call) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const callData = {
            id: call.id,
            firefliesId: call.id,
            title: call.title,
            date: call.date.toISOString(),
            duration: call.duration,
            repName: call.rep?.name || call.repId || 'Unknown',
            repEmail: call.rep?.email,
            prospectName: call.prospectName,
            prospectCompany: call.prospectCompany,
            transcriptUrl: call.transcriptUrl,
            status: call.status,
        };

        const analysisData = call.analysis ? {
            ...call.analysis,
            callType: call.analysis.callType,
            sections: call.analysis.sections,
            topCoachingPriorities: call.analysis.topCoachingPriorities,
            outcome: call.analysis.outcome,
            scriptAlignment: call.analysis.scriptAlignment,
            dealRisk: call.analysis.dealRisk,
            miscellaneous: call.analysis.miscellaneous
        } : null;

        return NextResponse.json({ call: callData, analysis: analysisData });
    } catch (e) {
        console.error("[API] Error fetching call by ID:", e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
