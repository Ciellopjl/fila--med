import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const patient = await db.patient.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        status: true,
        priority: true,
        specialty: true,
        createdAt: true,
      }
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Calculate position in queue
    let position = 0;
    if (patient.status === 'WAITING') {
      const waitingPatients = await db.patient.findMany({
        where: { status: 'WAITING' },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' }
        ]
      });
      position = waitingPatients.findIndex(p => p.id === patient.id) + 1;
    }

    return NextResponse.json({
      ...patient,
      position
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
