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

export interface Call {
    id: string;
    firefliesId: string;
    title: string;
    date: Timestamp;
    duration: number; // minutes
    repEmail: string;
    repName: string;
    prospectName: string;
    prospectCompany: string;
    transcriptUrl: string;
    status: 'pending' | 'analyzing' | 'completed' | 'failed';
    rawTranscript: string;
    createdAt: Timestamp;
    analyzedAt: Timestamp | null;
}

export interface Analysis {
    id: string;
    callId: string;
    repEmail: string;
    totalScore: number; // 0-100 rescaled from 0-10 sections
    dealRisk: 'low' | 'medium' | 'high';
    outcome: string;
    topCoachingPriorities: string[];
    analyzedAt: Timestamp;
    sections: {
        intro: SectionScore;
        bizAnalysis: SectionScore;
        challenges: SectionScore;
        goals: SectionScore;
        transition: SectionScore;
        funnelFlow: SectionScore;
        timeline: SectionScore;
        roiCalc: SectionScore;
        tempCheck: SectionScore;
        objections: SectionScore;
        nextSteps: SectionScore;
    };
}

export interface SectionScore {
    score: number; // 0-10
    notes: string;
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
    geminiDocId: string;
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
