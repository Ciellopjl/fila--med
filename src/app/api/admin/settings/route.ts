import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

async function isAdmin() {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email?.toLowerCase() || '';
  const isMaster = userEmail === process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL;
  return !!((session?.user as any)?.isAdmin || isMaster);
}

export async function GET() {
  try {
    if (!await isAdmin()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let settings = await db.systemSettings.findFirst();
    
    if (!settings) {
      settings = await db.systemSettings.create({
        data: { id: 'default' }
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!await isAdmin()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rooms, specialties } = await req.json();

    const settings = await db.systemSettings.upsert({
      where: { id: 'default' },
      update: { rooms, specialties, updatedAt: new Date() },
      create: { id: 'default', rooms, specialties }
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Failed to update settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
