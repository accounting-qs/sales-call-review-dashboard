export interface ClickUpMessage {
    content: string;
    content_format?: "text/md";
}

export async function sendClickUpNotification(message: string): Promise<void> {
    const apiKey = process.env.CLICKUP_API_KEY;
    const workspaceId = process.env.CLICKUP_WORKSPACE_ID;
    const channelId = process.env.CLICKUP_CHANNEL_ID;

    if (!apiKey || !workspaceId || !channelId) {
        console.warn('ClickUp credentials missing, skipping notification');
        return;
    }

    const url = `https://api.clickup.com/api/v3/workspaces/${workspaceId}/chat/channels/${channelId}/messages`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': apiKey, // Brief says "API key in header"
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            content: message,
            content_format: "text/md"
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('ClickUp notification failed:', error);
    }
}

export function formatClickUpMessage(
    callType: string,
    repEmail: string,
    title: string,
    date: string,
    duration: number,
    docLink: string,
    transcriptUrl: string
): string {
    const typeLabel = callType === 'evaluation' ? 'Business Evaluation Call' : 'Follow-Up Call (Call 2)';

    return `**[${typeLabel}]**

**Rep:** ${repEmail}
**Prospect:** ${title}
**Date:** ${date}
**Duration:** ${duration} min

**Full Analysis:** ${docLink}
**Transcript:** ${transcriptUrl}`;
}
