import { NextResponse } from 'next/server';
import { seedData } from '@/lib/seed';

export async function GET() {
    try {
        await seedData();
        return NextResponse.json({ message: 'Seed data created successfully' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
