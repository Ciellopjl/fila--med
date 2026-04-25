import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalToday, totalAll, done, priorities] = await Promise.all([
      db.patient.count({ where: { createdAt: { gte: today } } }),
      db.patient.count(),
      db.patient.count({ where: { status: 'DONE' } }),
      db.patient.count({ where: { priority: 'PRIORITY' } }),
    ]);

    // Simple real flow calculation for the last 6 hours
    const dailyFlow = await Promise.all(
      Array.from({ length: 6 }).map(async (_, i) => {
        const hour = new Date();
        hour.setHours(new Date().getHours() - (5 - i), 0, 0, 0);
        const nextHour = new Date(hour);
        nextHour.setHours(hour.getHours() + 1);

        const count = await db.patient.count({
          where: {
            createdAt: {
              gte: hour,
              lt: nextHour,
            },
          },
        });

        return { 
          name: hour.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), 
          value: count 
        };
      }),
    );

    return NextResponse.json({
      total: totalAll,
      done,
      priorities,
      avgWaitTime: 12, // Mocked or calculated
      dailyFlow,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
