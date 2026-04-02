import { Rep, Call, Analysis, Call1Sections } from '@/types';

const REPS = [
    {
        name: 'Jason Bernstein',
        email: 'jasonbern@quantum-scaling.com',
        role: 'closer',
    },
    {
        name: 'Ryan K',
        email: 'ryan@ig-institute.com',
        role: 'setter',
    },
    {
        name: 'Melissa',
        email: 'melissa@quantum-scaling.com',
        role: 'closer',
    },
    {
        name: 'Ryan (Test)',
        email: 'ryan@quantum-scaling.com',
        role: 'closer',
    },
];

const generateJasonCalls = () => {
    const calls: any[] = [];
    const analyses: any[] = [];
    const startDay = new Date();
    startDay.setDate(startDay.getDate() - 60);

    const prospects = [
        { name: 'David Gage', company: 'Imagine Growth Institute', baseScore: 3.6, outcome: 'Lost Frame / No Decision', risk: 'high' },
        { name: 'Steve Snyder', company: 'Rivet Web Marketing', baseScore: 8.0, outcome: 'Advanced to Follow-up Call', risk: 'low' },
        { name: 'Elliot Swift', company: 'Imagine Growth Institute', baseScore: 5.3, outcome: 'Disqualified - Early Stage', risk: 'medium' },
        { name: 'Sarah Miller', company: 'CloudScale AI', baseScore: 6.8, outcome: 'Advanced to Demo', risk: 'medium' },
        { name: 'Tom Harris', company: 'Growth Partners', baseScore: 7.2, outcome: 'Follow-up Scheduled', risk: 'low' },
        { name: 'Emma Wilson', company: 'Blue Ocean Agency', baseScore: 4.5, outcome: 'Stalled - Budget Issues', risk: 'high' },
        { name: 'Mark Reed', company: 'Inbound Inc', baseScore: 8.5, outcome: 'Agreement Sent', risk: 'low' },
        { name: 'Lucy Chen', company: 'NextGen Media', baseScore: 6.1, outcome: 'Follow-up Call', risk: 'medium' },
        { name: 'Chris Evans', company: 'Marvel Marketing', baseScore: 5.8, outcome: 'Not Decision Maker', risk: 'medium' },
        { name: 'Nina Simone', company: 'Soulful Scaling', baseScore: 7.5, outcome: 'Onboarding Call Set', risk: 'low' },
        { name: 'Jake Paul', company: 'Hype Scale', baseScore: 4.1, outcome: 'Lost - No Interest', risk: 'high' },
        { name: 'Logan Paul', company: 'Prime Scaling', baseScore: 5.9, outcome: 'Follow-up Call', risk: 'medium' },
        { name: 'Kevin Hart', company: 'Laugh Growth', baseScore: 9.1, outcome: 'Closed Won', risk: 'low' },
    ];

    prospects.forEach((p, i) => {
        const callDate = new Date(startDay);
        callDate.setDate(callDate.getDate() + i * 4.5);
        const callId = `call_jason_${i}`;

        const sectionScores: Call1Sections = {
            intro: { score: Math.round((7 + Math.random() * 2) * 10) / 10, notes: 'Good tone and frame setting.' },
            bizAnalysis: { score: Math.round((7 + Math.random() * 1) * 10) / 10, notes: 'Deep probe into current situation.' },
            challenges: { score: Math.round((5 + Math.random() * 2) * 10) / 10, notes: 'Identified core bottlenecks.' },
            goals: { score: Math.round((5 + Math.random() * 2) * 10) / 10, notes: 'Solid understanding of desired state.' },
            transition: { score: Math.round((7 + Math.random() * 1) * 10) / 10, notes: 'Smooth move to the pitch.' },
            funnelFlow: { score: Math.round((6 + Math.random() * 1) * 10) / 10, notes: 'Explained the process well.' },
            timeline: { score: Math.round((5 + Math.random() * 1) * 10) / 10, notes: 'Pushed for urgency.' },
            roiCalc: { score: Math.round((4 + Math.random() * 2) * 10) / 10, notes: 'Could be clearer on the numbers.' },
            tempCheck: { score: Math.round((5 + Math.random() * 2) * 10) / 10, notes: 'Checked for alignment.' },
            priceDrop: { score: Math.round((6 + Math.random() * 2) * 10) / 10, notes: 'Direct delivery of price.' },
            objections: { score: i === 0 ? 2.1 : Math.round((2 + Math.random() * 3) * 10) / 10, notes: 'Needs major work on handling pushback.' },
            decisionLeadership: { score: Math.round((5 + Math.random() * 2) * 10) / 10, notes: 'Clear action items.' },
            booking: { score: Math.round((8 + Math.random() * 2) * 10) / 10, notes: 'Successfully booked follow up.' },
        };

        const totalScoreRaw = Object.values(sectionScores).reduce((acc: number, s: any) => acc + s.score, 0);
        const totalScore = Math.round((totalScoreRaw / 130) * 100);

        calls.push({
            id: callId,
            title: `Evaluation Call - ${p.name}`,
            date: callDate,
            duration: 35 + Math.random() * 20,
            repEmail: 'jasonbern@quantum-scaling.com',
            prospectName: p.name,
            transcriptUrl: `https://fireflies.ai/c/${callId}`,
            callCategory: 'evaluation',
            status: 'completed',
        });

        analyses.push({
            callId: callId,
            callType: 'evaluation',
            totalScore,
            dealRisk: p.risk,
            scriptAlignment: 'aligned',
            outcome: p.outcome,
            leadSource: 'Paid (Facebook)',
            callAnalysis: `In this evaluation call with ${p.name}, Jason did a solid job establishing the frame. Total score: ${totalScore}/100.`,
            topCoachingPriorities: ['Objection Handling', 'ROI Calculation', 'Urgency Framing'],
            sections: sectionScores,
        });
    });

    return { calls, analyses };
};

/**
 * Seeds the database via Prisma REST APIs.
 * Can be called from the browser (client-side).
 */
export const seedData = async () => {
    // 1. Seed Reps via API
    for (const rep of REPS) {
        try {
            await fetch('/api/reps', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(rep),
            });
        } catch (e) {
            console.warn(`Failed to seed rep ${rep.email}:`, e);
        }
    }

    // 2. Seed calls and analyses
    const { calls, analyses } = generateJasonCalls();
    
    // We need a server-side endpoint for batch seeding
    try {
        const res = await fetch('/api/seed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ calls, analyses }),
        });
        if (!res.ok) {
            throw new Error(`Seed API failed: ${res.status}`);
        }
    } catch (e) {
        console.warn('Failed to seed calls/analyses:', e);
    }

    // 3. Seed default pipeline settings
    try {
        await fetch('/api/settings/pipeline', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                autoAnalysis: false,
                evaluationKeywords: 'Evaluation Call, Business Evaluation',
                followupKeywords: 'Follow-up',
                excludedKeywords: 'Test, Internal',
                defaultAgent: 'none',
                clickupWebhook: '',
                clickupListId: '',
                dailySyncTime: '02:00',
                autoSyncEnabled: true,
                aiModel: 'gemini-2.5-pro'
            }),
        });
    } catch (e) {
        console.warn('Failed to seed pipeline settings:', e);
    }

    console.log('Database seeded successfully via Prisma APIs');
};
