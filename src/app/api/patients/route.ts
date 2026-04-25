import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { emitQueueUpdate } from '@/lib/socket-io';
import { PatientCreateSchema } from '@/lib/schemas';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Validate request body
    const validation = PatientCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { name, symptoms, priority, specialty } = validation.data;

    const patient = await db.patient.create({
      data: {
        name,
        symptoms,
        priority,
        specialty,
        status: 'WAITING',
      },
    });

    emitQueueUpdate();
    return NextResponse.json(patient);
  } catch (error) {
    console.error('Error creating patient:', error);
    return NextResponse.json({ error: 'Failed to create patient' }, { status: 500 });
  }
}
