import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const patients = await db.patient.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        calls: true,
      },
    });
    return NextResponse.json(patients);
  } catch (error) {
    console.error('Error fetching patient history:', error);
    return NextResponse.json({ error: 'Failed to fetch patient history' }, { status: 500 });
  }
}
