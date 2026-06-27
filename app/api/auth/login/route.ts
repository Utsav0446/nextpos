import { NextResponse } from 'next/server';
import { loginAction } from '@/actions/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await loginAction(body);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API login error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
