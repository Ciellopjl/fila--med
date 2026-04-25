import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const patients = await db.patient.findMany({
      where: {
        status: {
          in: ['WAITING', 'CALLED'],
        },
      },
      orderBy: [
        { priority: 'desc' }, // PRIORITY first
        { createdAt: 'asc' }, // Older first
      ],
    });
    return NextResponse.json(patients);
  } catch (error) {
    console.error('Error fetching waiting patients:', error);
    return NextResponse.json({ error: 'Failed to fetch waiting patients' }, { status: 500 });
  }
}
