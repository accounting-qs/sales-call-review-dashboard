import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SETTING_KEY = "fireflies_pipeline";

const DEFAULT_SETTINGS = {
    autoAnalysis: false,
    evaluationKeywords: "Evaluation Call, Business Evaluation",
    followupKeywords: "Follow-up",
    excludedKeywords: "Test, Internal",
    defaultAgent: "none",
    clickupWebhook: "",
    clickupListId: "",
    clickupTemplate: `==📊 **New Audited Call** ==\n\n👤 **Rep:** {{rep}}\n👥 **Prospect:** {{title}}\n📅 **Date:** {{date}}\n🔗 **Link:** {{link}}\n⏱️ **Duration:** {{duration}} min\n\n🔎 **AI Review Summary**\n> {{analysis}}\n\n**Quick Stats:**\n- **Alignment:** {{alignment}}\n- **Score:** {{score}}/10\n- **Risk:** {{risk}}\n\n[Full Report]({{link}}) | [Recording]({{transcript}})`,
    dailySyncTime: "02:00",
    autoSyncEnabled: true,
    aiModel: "gemini-2.5-pro",
    lastSyncedAt: "",
};

/**
 * GET /api/settings/pipeline
 * Read pipeline settings from Prisma Setting table
 */
export async function GET() {
    try {
        const setting = await prisma.setting.findUnique({
            where: { key: SETTING_KEY },
        });

        if (setting) {
            return NextResponse.json({ ...DEFAULT_SETTINGS, ...(setting.value as any) });
        }

        return NextResponse.json(DEFAULT_SETTINGS);
    } catch (error: any) {
        console.error("[API Settings Pipeline] GET error:", error);
        return NextResponse.json(DEFAULT_SETTINGS);
    }
}

/**
 * POST /api/settings/pipeline
 * Save pipeline settings to Prisma Setting table
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();

        await prisma.setting.upsert({
            where: { key: SETTING_KEY },
            update: { value: body },
            create: { key: SETTING_KEY, value: body },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[API Settings Pipeline] POST error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
