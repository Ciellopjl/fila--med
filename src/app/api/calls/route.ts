import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { emitQueueUpdate, emitPatientCalled } from '@/lib/socket-io';
import { CallCreateSchema } from '@/lib/schemas';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Validate request body
    const validation = CallCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { patientId, room } = validation.data;

    const patient = await db.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    const [call] = await db.$transaction([
      db.call.create({
        data: {
          patientId,
          room,
          userId,
        },
      }),
      db.patient.update({
        where: { id: patientId },
        data: { status: 'CALLED' },
      }),
      ...(userId ? [
        db.auditLog.create({
          data: {
            userId,
            action: 'PATIENT_CALLED',
            details: `Chamou paciente ${patient.name} para ${room}`
          }
        })
      ] : [])
    ]);

    emitQueueUpdate();
    emitPatientCalled({
      patientName: patient.name,
      room,
      priority: patient.priority,
    });

    return NextResponse.json(call);
  } catch (error) {
    console.error('Error creating call:', error);
    return NextResponse.json({ error: 'Failed to create call' }, { status: 500 });
  }
}
