import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

/**
 * GET /api/seed — Legacy endpoint (triggers server-side seed)
 */
export async function GET() {
    // Redirect to POST for actual seeding
    return NextResponse.json({ message: 'Use POST method with { calls, analyses } body to seed data.' }, { status: 405 });
}

/**
 * POST /api/seed
 * Batch seed calls and analyses into Prisma.
 * Used by the dev "Reset & Seed Database" button in settings.
 */
export async function POST(request: Request) {
    try {
        const { calls, analyses } = await request.json();

        if (!Array.isArray(calls) || !Array.isArray(analyses)) {
            return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
        }

        // Process each call and analysis in a transaction
        for (let i = 0; i < calls.length; i++) {
            const call = calls[i];
            const analysis = analyses[i];

            await prisma.$transaction(async (tx) => {
                // Ensure rep exists
                if (call.repEmail) {
                    const existingRep = await tx.rep.findUnique({ where: { email: call.repEmail } });
                    if (!existingRep) {
                        const name = call.repEmail.split('@')[0];
                        await tx.rep.create({
                            data: {
                                email: call.repEmail,
                                name: name.charAt(0).toUpperCase() + name.slice(1),
                            }
                        });
                    }
                }

                // Upsert Call
                const rep = call.repEmail ? await tx.rep.findUnique({ where: { email: call.repEmail } }) : null;
                
                await tx.call.upsert({
                    where: { id: call.id },
                    update: {
                        title: call.title,
                        duration: call.duration,
                        status: call.status || 'completed',
                        callCategory: call.callCategory || 'evaluation',
                    },
                    create: {
                        id: call.id,
                        title: call.title,
                        date: new Date(call.date),
                        duration: call.duration,
                        prospectName: call.prospectName || 'Unknown',
                        transcriptUrl: call.transcriptUrl || '',
                        callCategory: call.callCategory || 'evaluation',
                        status: call.status || 'completed',
                        repId: rep?.id || undefined,
                    }
                });

                // Upsert Analysis
                if (analysis) {
                    await tx.analysis.upsert({
                        where: { callId: call.id },
                        update: {
                            callType: analysis.callType || 'evaluation',
                            outcome: analysis.outcome || '',
                            dealRisk: analysis.dealRisk || 'Unknown',
                            scriptAlignment: analysis.scriptAlignment || 'Unknown',
                            callAnalysis: analysis.callAnalysis || '',
                            topCoachingPriorities: analysis.topCoachingPriorities || [],
                            sections: analysis.sections || {},
                            totalScore: analysis.totalScore || 0,
                            leadSource: analysis.leadSource,
                        },
                        create: {
                            callId: call.id,
                            callType: analysis.callType || 'evaluation',
                            outcome: analysis.outcome || '',
                            dealRisk: analysis.dealRisk || 'Unknown',
                            scriptAlignment: analysis.scriptAlignment || 'Unknown',
                            callAnalysis: analysis.callAnalysis || '',
                            topCoachingPriorities: analysis.topCoachingPriorities || [],
                            sections: analysis.sections || {},
                            totalScore: analysis.totalScore || 0,
                            leadSource: analysis.leadSource,
                        }
                    });
                }
            });
        }

        return NextResponse.json({ 
            success: true, 
            seeded: { calls: calls.length, analyses: analyses.length } 
        });
    } catch (error: any) {
        console.error("[API Seed] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
