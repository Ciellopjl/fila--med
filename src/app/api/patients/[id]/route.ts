import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { emitQueueUpdate } from '@/lib/socket-io';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Delete related calls first to maintain integrity
    await db.call.deleteMany({ where: { patientId: id } });
    const patient = await db.patient.delete({ where: { id } });
    
    emitQueueUpdate();
    return NextResponse.json(patient);
  } catch (error) {
    console.error('Error deleting patient:', error);
    return NextResponse.json({ error: 'Failed to delete patient' }, { status: 500 });
  }
}
