// Staff Reports API - Definitive Version
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email?.toLowerCase().trim() || '';
  const isAdmin = userEmail === process.env.MASTER_ADMIN_EMAIL?.toLowerCase().trim();

  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const staffStats = await db.authorizedUser.findMany({
      include: {
        _count: {
          select: {
            calls: true,
            logs: true
          }
        },
        calls: {
          take: 10,
          orderBy: { calledAt: 'desc' },
          include: {
            patient: true
          }
        }
      }
    });

    const report = staffStats.map(s => ({
      id: s.id,
      name: s.name,
      email: s.email,
      image: s.image,
      role: s.role,
      isOnline: s.isOnline,
      lastSeen: s.lastSeen,
      totalCalls: s._count.calls,
      recentActivity: s.calls.map(c => ({
        patient: c.patient.name,
        room: c.room,
        at: c.calledAt
      }))
    }));

    return NextResponse.json(report);
  } catch (error) {
    console.error('Error fetching staff report:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
