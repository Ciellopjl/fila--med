import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const calls = await db.call.findMany({
      take: 10,
      orderBy: { calledAt: 'desc' },
      include: {
        patient: {
          select: {
            name: true,
            priority: true,
          },
        },
      },
    });
    return NextResponse.json(calls);
  } catch (error) {
    console.error('Error fetching recent calls:', error);
    return NextResponse.json({ error: 'Failed to fetch recent calls' }, { status: 500 });
  }
}
