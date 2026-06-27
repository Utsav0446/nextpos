import { NextResponse } from 'next/server';
import { logoutAction } from '@/actions/auth';

export async function POST() {
  try {
    await logoutAction();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
