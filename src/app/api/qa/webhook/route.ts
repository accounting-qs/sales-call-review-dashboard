import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { sendClickUpNotification } from '@/lib/services/clickup';

export async function POST() {
    try {
        const settingsRef = doc(db, 'settings', 'fireflies_pipeline');
        const settingsSnap = await getDoc(settingsRef);
        
        if (!settingsSnap.exists()) {
            return NextResponse.json({ error: 'Settings not configured' }, { status: 400 });
        }

        const config = settingsSnap.data();

        // Use the dynamic ClickUp template string
        let payloadString = config.clickupTemplate || 'Test message';
        payloadString = payloadString
            .replace('{{rep}}', 'Jason B (Tester)')
            .replace('{{title}}', 'QA Integration Mock Call')
            .replace('{{date}}', new Date().toLocaleDateString())
            .replace('{{duration}}', '45')
            .replace('{{link}}', 'https://sales-call-review-dashboard--sales-review-dashboard.us-east4.hosted.app/calls/mock-123')
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
