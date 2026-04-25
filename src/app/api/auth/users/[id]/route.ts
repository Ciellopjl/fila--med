import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getServerSession } from 'next-auth';

async function requireMasterAdmin() {
  const session = await getServerSession();
  const userEmail = session?.user?.email?.toLowerCase() || '';
  return userEmail === 'ciellodev@gmail.com';
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const isMaster = await requireMasterAdmin();
    if (!isMaster) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await db.authorizedUser.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete authorized user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
