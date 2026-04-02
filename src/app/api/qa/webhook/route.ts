import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendClickUpNotification } from '@/lib/services/clickup';

export async function POST() {
    try {
        // Read settings from Prisma
        const settingObj = await prisma.setting.findUnique({ where: { key: 'fireflies_pipeline' } });
        
        if (!settingObj) {
            return NextResponse.json({ error: 'Settings not configured' }, { status: 400 });
        }

        const config = settingObj.value as any;

        // Use the dynamic ClickUp template string
        let payloadString = config.clickupTemplate || 'Test message';
        payloadString = payloadString
            .replace('{{rep}}', 'Jason B (Tester)')
            .replace('{{title}}', 'QA Integration Mock Call')
            .replace('{{date}}', new Date().toLocaleDateString())
            .replace('{{duration}}', '45')
            .replace('{{link}}', `${process.env.NEXT_PUBLIC_APP_URL || 'https://salespulse.onrender.com'}/calls/mock-123`)
            .replace('{{analysis}}', 'This is a mock AI analysis validating that the ClickUp native channel integration correctly parses markdown templates.')
            .replace('{{alignment}}', 'High')
            .replace('{{score}}', '9')
            .replace('{{risk}}', 'Low')
            .replace('{{transcript}}', 'http://app.fireflies.ai');

        console.log("[Webhook QA] Firing native message to ClickUp...");

        await sendClickUpNotification(payloadString);

        return NextResponse.json({ success: true, message: `Successfully fired message to ClickUp Channel.` });
    } catch (error: any) {
        console.error('API Error /qa/webhook:', error);
        return NextResponse.json({ error: error.message || 'Failed to fire test ClickUp message' }, { status: 500 });
    }
}
