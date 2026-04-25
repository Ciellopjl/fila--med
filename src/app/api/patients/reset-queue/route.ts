import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { emitQueueUpdate } from '@/lib/socket-io';

export async function POST() {
  try {
    await db.call.deleteMany();
    await db.patient.deleteMany();
    
    emitQueueUpdate();
    return NextResponse.json({ message: 'Queue reset successfully' });
  } catch (error) {
    console.error('Error resetting queue:', error);
    return NextResponse.json({ error: 'Failed to reset queue' }, { status: 500 });
  }
}
