import { Timestamp } from 'firebase/firestore';

export type UserRole = 'manager' | 'rep';

export interface User {
    uid: string;
    email: string;
    name: string;
    role: UserRole;
    avatarUrl?: string;
    createdAt: Timestamp;
}

export type CallType = 'evaluation' | 'followup';

export interface Call {
    id: string; // firefliesId
    firefliesId: string;
    title: string;
    date: Timestamp;
    duration: number; // minutes
    repEmail: string;
    repName: string;
    prospectName: string;
    prospectCompany: string;
    transcriptUrl: string;
    type: CallType;
    status: 'pending' | 'analyzing' | 'completed' | 'failed';
    rawTranscript: string;
    createdAt: Timestamp;
    analyzedAt: Timestamp | null;
}

export interface SectionScore {
    score: number; // 0-10
    notes: string;
}

export interface Call1Sections {
    intro: SectionScore;
    bizAnalysis: SectionScore;
    challenges: SectionScore;
    goals: SectionScore;
    transition: SectionScore;
    funnelFlow: SectionScore;
    timeline: SectionScore;
    roiCalc: SectionScore;
    tempCheck: SectionScore;
    priceDrop: SectionScore;
    objections: SectionScore;
    decisionLeadership: SectionScore;
    booking: SectionScore;
}

export interface Call2Sections {
    intro: SectionScore;
    technicalQuestions: SectionScore;
    sevenBehaviours: SectionScore;
    refundExplanation: SectionScore;
    tempCheckObjections: SectionScore;
    rePriceDrop: SectionScore;
    contractReview: SectionScore;
    closing: SectionScore;
}

export interface Analysis {
    id: string;
    callId: string;
    repEmail: string;
    callType: CallType;
    totalScore: number;
    dealRisk: 'low' | 'medium' | 'high' | 'critical';
    scriptAlignment: 'aligned' | 'partially_aligned' | 'non_aligned';
    outcome: string;
    leadSource?: string;
    miscellaneous?: string;
    callAnalysis?: string; // Summary of the call
    topCoachingPriorities: string[];
    globalCapsTriggered: string[];
    analyzedAt: Timestamp;
    sections: Call1Sections | Call2Sections;
}

export interface Rep {
    id: string; // usually repEmail
    name: string;
    email: string;
    role: 'closer' | 'setter';
    totalCalls: number;
    avgScore: number;
    strengths: string[];
    weaknesses: string[];
    lastUpdated: Timestamp;
}

export interface TrainingPlan {
    id: string;
    repEmail: string;
    generatedAt: Timestamp;
    generatedBy: string;
    status: 'active' | 'completed' | 'archived';
    plan: {
        focusAreas: Array<{ area: string; currentAvg: number; targetScore: number }>;
        weeklyGoals: string[];
        resources: string[];
        reviewDate: Timestamp;
    };
}

export interface ReferenceDoc {
    id: string;
    name: string;
    fileName: string;
    type: 'pdf' | 'docx' | 'txt';
    status: 'uploading' | 'indexing' | 'indexed' | 'error';
    geminiDocId?: string;
    enabledForCall1: boolean;
    enabledForCall2: boolean;
    uploadedAt: Timestamp;
    size?: number;
    chunksCount?: number;
}

export interface Prompt {
    id: string; // stepId
    name: string;
    systemPrompt: string;
    model: string;
    provider: 'gemini' | 'openai' | 'anthropic';
    useRag: boolean;
    version: number;
    lastModifiedAt: Timestamp;
}
