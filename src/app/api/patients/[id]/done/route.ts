import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { emitQueueUpdate } from '@/lib/socket-io';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    const patient = await db.patient.update({
      where: { id },
      data: { status: 'DONE' },
    });

    if (userId) {
      await db.auditLog.create({
        data: {
          userId,
          action: 'PATIENT_DONE',
          details: `Finalizou atendimento do paciente: ${patient.name}`
        }
      });
    }

    emitQueueUpdate();
    return NextResponse.json(patient);
  } catch (error) {
    console.error('Error marking patient as done:', error);
    return NextResponse.json({ error: 'Failed to update patient' }, { status: 500 });
  }
}
