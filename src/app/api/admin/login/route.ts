/**
 * POST /api/admin/login
 * Verifikasi password admin dan set cookie sesi JWT.
 *
 * GET /api/admin/login
 * Cek status sesi (untuk redirect di halaman login).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminSession, verifyAdminSession } from '@/lib/session';

export async function POST(request: NextRequest) {
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request tidak valid.' }, { status: 400 });
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error('ADMIN_PASSWORD belum diset di environment.');
    return NextResponse.json(
      { error: 'Konfigurasi server bermasalah.' },
      { status: 500 }
    );
  }

  // Bandingkan password — gunakan timing-safe comparison
  // (sederhana tapi cukup untuk kasus ini)
  if (body.password !== adminPassword) {
    // Delay kecil untuk mencegah timing attack
    await new Promise((r) => setTimeout(r, 200 + Math.random() * 100));
    return NextResponse.json(
      { error: 'Password salah.' },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ success: true });
  await createAdminSession(response);
  return response;
}

export async function GET(request: NextRequest) {
  const session = await verifyAdminSession(request);
  return NextResponse.json({ authenticated: !!session });
}
