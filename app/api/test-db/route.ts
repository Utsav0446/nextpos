import { NextResponse } from 'next/server';
import { supabase } from '@/db';

export async function GET() {
  try {
    const start = Date.now();
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, password_hash');

    if (error) throw error;
    const duration = Date.now() - start;

    return NextResponse.json({
      success: true,
      time: new Date().toISOString(),
      duration: `${duration}ms`,
      usersCount: users?.length || 0,
      users: users,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
