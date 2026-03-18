import { Analysis } from "@/types";

export interface ClickUpMessage {
    text: string;
    content?: string;
}

export async function sendClickUpNotification(message: string, _ignoredWebhookUrl?: string) {
    console.log(`[ClickUp] Sending notification directly via ClickUp API v3`);
    return await sendDirectClickUpMessage(message);
}

async function sendDirectClickUpMessage(message: string) {
    const apiKey = process.env.CLICKUP_API_KEY;
    const workspaceId = process.env.CLICKUP_WORKSPACE_ID;
    const channelId = process.env.CLICKUP_CHANNEL_ID;

    if (!apiKey || !workspaceId || !channelId) {
        console.warn("[ClickUp] Missing direct API configuration. Skipping notification.");
        return;
    }

    try {
        const url = `https://api.clickup.com/api/v3/workspaces/${workspaceId}/chat/channels/${channelId}/messages`;
        console.log(`[ClickUp] Sending direct to: ${url}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(url, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                content: message,
                content_format: 'text/md'
            })
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ClickUp API failed (${response.status}): ${errorText}`);
        }
    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.error("[ClickUp] Direct ClickUp API timed out after 10s");
        } else {
            console.error("[ClickUp] Direct API failed:", error.message);
        }
        throw error;
    }
}

export function formatClickUpMessage(
    callType: string,
    repEmail: string,
    title: string,
    date: string,
    duration: number,
    docLink: string,
    transcriptUrl: string,
    analysis?: Analysis,
    template?: string
): string {
    const DEFAULT_TEMPLATE = `==📊 **New Audited Call** ==

👤 **Rep:** {{rep}}
👥 **Prospect:** {{title}}
📅 **Date:** {{date}}
🔗 **Link:** {{link}}
⏱️ **Duration:** {{duration}} min

🔎 **AI Review Summary**
> {{analysis}}

**Quick Stats:**
- **Alignment:** {{alignment}}
- **Score:** {{score}}/10
- **Risk:** {{risk}}

[Full Report]({{link}}) | [Recording]({{transcript}})`;

    let message = template || DEFAULT_TEMPLATE;

    // Placeholders mapping
    const values: Record<string, string> = {
        '{{rep}}': repEmail,
        '{{title}}': title,
        '{{date}}': date,
        '{{link}}': docLink,
        '{{duration}}': Math.round(duration).toString(),
        '{{analysis}}': analysis?.callAnalysis || analysis?.outcome || 'Analysis in progress...',
        '{{score}}': ((analysis?.totalScore || 0) / 10).toFixed(1),
        '{{risk}}': (analysis?.dealRisk || 'N/A').toUpperCase(),
        '{{alignment}}': (analysis?.scriptAlignment || 'N/A').toUpperCase(),
        '{{transcript}}': transcriptUrl
    };

    // Replace all placeholders
    Object.entries(values).forEach(([key, value]) => {
        message = message.split(key).join(value);
    });

    return message;
}


