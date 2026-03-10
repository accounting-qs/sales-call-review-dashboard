import { NextResponse } from "next/server";
import { getPromptSettings, updatePromptSettings } from "@/lib/services/promptSettings";

export async function GET() {
    try {
        const settings = await getPromptSettings();
        return NextResponse.json(settings);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { call1Prompt, call2Prompt } = body;

        await updatePromptSettings({
            call1Prompt,
            call2Prompt
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
