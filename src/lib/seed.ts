import { db } from './firebase';
import {
    collection,
    doc,
    setDoc,
    writeBatch,
    Timestamp,
    collectionGroup,
    query,
    getDocs
} from 'firebase/firestore';
import { Rep, Call, Analysis, TrainingPlan } from '@/types';

const REPS: Rep[] = [
    {
        id: 'jasonbern@quantum-scaling.com',
        name: 'Jason Bernstein',
        email: 'jasonbern@quantum-scaling.com',
        role: 'closer',
        totalCalls: 13,
        avgScore: 6.4,
        strengths: ['Biz Analysis', 'Intro'],
        weaknesses: ['Objections'],
        lastUpdated: Timestamp.now(),
    },
    {
        id: 'ryan@ig-institute.com',
        name: 'Ryan K',
        email: 'ryan@ig-institute.com',
        role: 'setter',
        totalCalls: 34,
        avgScore: 5.7,
        strengths: ['Timeline', 'Funnel Flow'],
        weaknesses: ['ROI Calc'],
        lastUpdated: Timestamp.now(),
    },
    {
        id: 'melissa@quantum-scaling.com',
        name: 'Melissa',
        email: 'melissa@quantum-scaling.com',
        role: 'closer',
        totalCalls: 1,
        avgScore: 3.3,
        strengths: ['Intro'],
        weaknesses: ['Biz Analysis', 'Challenges'],
        lastUpdated: Timestamp.now(),
    },
    {
        id: 'ryan@quantum-scaling.com',
        name: 'Ryan (Test)',
        email: 'ryan@quantum-scaling.com',
        role: 'closer',
        totalCalls: 1,
        avgScore: 0.0,
        strengths: [],
        weaknesses: [],
        lastUpdated: Timestamp.now(),
    },
];

const generateJasonCalls = (): { calls: Call[]; analyses: Analysis[] } => {
    const calls: Call[] = [];
    const analyses: Analysis[] = [];
    const startDay = new Date();
    startDay.setDate(startDay.getDate() - 60);

    const prospects = [
        { name: 'David Gage', company: 'Imagine Growth Institute', baseScore: 3.6, outcome: 'Lost Frame / No Decision', risk: 'high' as const },
        { name: 'Steve Snyder', company: 'Rivet Web Marketing', baseScore: 8.0, outcome: 'Advanced to Follow-up Call (Logistics/Financing focus)', risk: 'low' as const },
        { name: 'Elliot Swift', company: 'Imagine Growth Institute', baseScore: 5.3, outcome: 'Disqualified - Early Stage / New Offer', risk: 'medium' as const },
        { name: 'Sarah Miller', company: 'CloudScale AI', baseScore: 6.8, outcome: 'Advanced to Demo', risk: 'medium' as const },
        { name: 'Tom Harris', company: 'Growth Partners', baseScore: 7.2, outcome: 'Follow-up Scheduled', risk: 'low' as const },
        { name: 'Emma Wilson', company: 'Blue Ocean Agency', baseScore: 4.5, outcome: 'Stalled - Budget Issues', risk: 'high' as const },
        { name: 'Mark Reed', company: 'Inbound Inc', baseScore: 8.5, outcome: 'Agreement Sent', risk: 'low' as const },
        { name: 'Lucy Chen', company: 'NextGen Media', baseScore: 6.1, outcome: 'Follow-up Call', risk: 'medium' as const },
        { name: 'Chris Evans', company: 'Marvel Marketing', baseScore: 5.8, outcome: 'Maybe - Not Decision Maker', risk: 'medium' as const },
        { name: 'Nina Simone', company: 'Soulful Scaling', baseScore: 7.5, outcome: 'Onboarding Call Set', risk: 'low' as const },
        { name: 'Jake Paul', company: 'Hype Scale', baseScore: 4.1, outcome: 'Lost - No Interest', risk: 'high' as const },
        { name: 'Logan Paul', company: 'Prime Scaling', baseScore: 5.9, outcome: 'Follow-up Call', risk: 'medium' as const },
        { name: 'Kevin Hart', company: 'Laugh Growth', baseScore: 9.1, outcome: 'Closed Won', risk: 'low' as const },
    ];

    prospects.forEach((p, i) => {
        const callDate = new Date(startDay);
        callDate.setDate(callDate.getDate() + i * 4.5);
        const callId = `call_jason_${i}`;

        const call: Call = {
            id: callId,
            firefliesId: `ff_${callId}`,
            title: `Evaluation Call - ${p.name}`,
            date: Timestamp.fromDate(callDate),
            duration: 35 + Math.random() * 20,
            repEmail: 'jasonbern@quantum-scaling.com',
            repName: 'Jason Bernstein',
            prospectName: p.name,
            prospectCompany: p.company,
            transcriptUrl: `https://fireflies.ai/c/${callId}`,
            status: 'completed',
            rawTranscript: 'Example transcript content...',
            createdAt: Timestamp.fromDate(callDate),
            analyzedAt: Timestamp.fromDate(callDate),
        };

        const sectionScores = {
            intro: { score: Math.round((7 + Math.random() * 2) * 10) / 10, notes: 'Good tone and frame setting.' },
            bizAnalysis: { score: Math.round((7 + Math.random() * 1) * 10) / 10, notes: 'Deep probe into current situation.' },
            challenges: { score: Math.round((5 + Math.random() * 2) * 10) / 10, notes: 'Identified core bottlenecks.' },
            goals: { score: Math.round((5 + Math.random() * 2) * 10) / 10, notes: 'Solid understanding of desired state.' },
            transition: { score: Math.round((7 + Math.random() * 1) * 10) / 10, notes: 'Smooth move to the pitch.' },
            funnelFlow: { score: Math.round((6 + Math.random() * 1) * 10) / 10, notes: 'Explained the process well.' },
            timeline: { score: Math.round((5 + Math.random() * 1) * 10) / 10, notes: 'Pushed for urgency.' },
            roiCalc: { score: Math.round((4 + Math.random() * 2) * 10) / 10, notes: 'Could be clearer on the numbers.' },
            tempCheck: { score: Math.round((5 + Math.random() * 2) * 10) / 10, notes: 'Checked for alignment.' },
            objections: { score: i === 0 ? 2.1 : Math.round((2 + Math.random() * 3) * 10) / 10, notes: 'Needs major work on handling pushback.' },
            nextSteps: { score: Math.round((5 + Math.random() * 2) * 10) / 10, notes: 'Clear action items.' },
        };

        // Rescale score to 0-100 total
        const totalScoreRaw = Object.values(sectionScores).reduce((acc, s) => acc + s.score, 0);
        const totalScore = Math.round((totalScoreRaw / 110) * 100);

        const analysis: Analysis = {
            id: callId,
            callId: callId,
            repEmail: 'jasonbern@quantum-scaling.com',
            totalScore: totalScore,
            dealRisk: p.risk,
            outcome: p.outcome,
            topCoachingPriorities: ['Objection Handling', 'ROI Calculation', 'Urgency Framing'],
            analyzedAt: Timestamp.fromDate(callDate),
            sections: sectionScores,
        };

        calls.push(call);
        analyses.push(analysis);
    });

    return { calls, analyses };
};

export const seedData = async () => {
    const batch = writeBatch(db);

    // Seed Reps
    REPS.forEach((rep) => {
        const repRef = doc(db, 'reps', rep.email);
        batch.set(repRef, rep);

        // Also create Users for auth link
        const userRef = doc(db, 'users', rep.email); // simplification
        batch.set(userRef, {
            uid: rep.email,
            email: rep.email,
            name: rep.name,
            role: 'rep',
            createdAt: Timestamp.now(),
        });
    });

    // Manager account
    const managerRef = doc(db, 'users', 'admin@quantum-scaling.com');
    batch.set(managerRef, {
        uid: 'admin@quantum-scaling.com',
        email: 'admin@quantum-scaling.com',
        name: 'Admin Manager',
        role: 'manager',
        createdAt: Timestamp.now(),
    });

    // Seed Jason's Calls
    const { calls, analyses } = generateJasonCalls();
    calls.forEach((call) => {
        const callRef = doc(db, 'calls', call.id);
        batch.set(callRef, call);
    });
    analyses.forEach((analysis) => {
        const analysisRef = doc(db, 'analyses', analysis.callId);
        batch.set(analysisRef, analysis);
    });

    // Seed Training Plan for Melissa
    const melissaPlan: TrainingPlan = {
        id: 'melissa-plan',
        repEmail: 'melissa@quantum-scaling.com',
        generatedAt: Timestamp.now(),
        generatedBy: 'admin@quantum-scaling.com',
        status: 'active',
        plan: {
            focusAreas: [
                { area: 'Intro', currentAvg: 3.0, targetScore: 6.0 },
                { area: 'Biz Analysis', currentAvg: 2.5, targetScore: 5.0 },
                { area: 'Challenges', currentAvg: 3.5, targetScore: 6.0 },
            ],
            weeklyGoals: [
                'Practice opening framework 5 times daily',
                'Use the 3-question probing sequence in every call',
                'Record 1 practice transition per day'
            ],
            resources: [
                'Sales School Module 1: The Intro',
                'Quantum Probing Guide v2'
            ],
            reviewDate: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
        }
    };
    const planRef = doc(db, 'training_plans', melissaPlan.repEmail);
    batch.set(planRef, melissaPlan);

    await batch.commit();
    console.log('Seed data committed successfully');
};
