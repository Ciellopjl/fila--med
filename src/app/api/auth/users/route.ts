import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getServerSession } from 'next-auth';
import { AuthUserCreateSchema } from '@/lib/schemas';

// Middleware / auth check helper
async function requireMasterAdmin() {
  const session = await getServerSession();
  const userEmail = session?.user?.email?.toLowerCase() || '';
  const isMaster = userEmail === 'ciellodev@gmail.com';
  
  if (!isMaster) {
    return false;
  }
  return true;
}

export async function GET() {
  try {
    const isMaster = await requireMasterAdmin();
    if (!isMaster) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await db.authorizedUser.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Failed to fetch authorized users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const isMaster = await requireMasterAdmin();
    if (!isMaster) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    
    // Validate request body
    const validation = AuthUserCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { email, role } = validation.data;

    // Check if exists
    const existing = await db.authorizedUser.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (existing) {
      return NextResponse.json({ error: 'Este e-mail já está autorizado.' }, { status: 400 });
    }

    const newUser = await db.authorizedUser.create({
      data: {
        email: email.toLowerCase().trim(),
        role: role || 'RECEPTION'
      }
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('Failed to add authorized user:', error);
    return NextResponse.json({ error: 'Failed to add user' }, { status: 500 });
  }
}
