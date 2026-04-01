import { prisma } from "../prisma";
import { CALL_1_SYSTEM_PROMPT, CALL_2_SYSTEM_PROMPT } from "./prompts";

export interface PromptSettings {
    call1Prompt: string;
    call2Prompt: string;
    lastUpdated?: Date;
}

const SETTINGS_KEY = "ai_prompts";

export async function getPromptSettings(): Promise<PromptSettings> {
    try {
        const setting = await prisma.setting.findUnique({
            where: { key: SETTINGS_KEY }
        });

        if (setting && setting.value) {
            const data = setting.value as unknown as PromptSettings;
            return {
                ...data,
                lastUpdated: setting.updatedAt
            };
        }

        return {
            call1Prompt: CALL_1_SYSTEM_PROMPT,
            call2Prompt: CALL_2_SYSTEM_PROMPT,
            lastUpdated: new Date()
        };
    } catch (error) {
        console.error("Error fetching prompt settings:", error);
        return {
            call1Prompt: CALL_1_SYSTEM_PROMPT,
            call2Prompt: CALL_2_SYSTEM_PROMPT,
            lastUpdated: new Date()
        };
    }
}

export async function updatePromptSettings(settings: Partial<PromptSettings>) {
    const current = await getPromptSettings();
    const updated = {
        call1Prompt: settings.call1Prompt ?? current.call1Prompt,
        call2Prompt: settings.call2Prompt ?? current.call2Prompt,
    };

    await prisma.setting.upsert({
        where: { key: SETTINGS_KEY },
        update: { value: updated as any },
        create: {
            key: SETTINGS_KEY,
            value: updated as any,
        }
    });
}
