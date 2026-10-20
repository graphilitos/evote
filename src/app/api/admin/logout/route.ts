/**
 * POST /api/admin/logout
 * Hapus cookie sesi admin.
 */
import { NextRequest, NextResponse } from 'next/server';
import { clearAdminSession } from '@/lib/session';

export async function POST(request: NextRequest) {
  void request; // parameter wajib ada meski tidak digunakan
  const response = NextResponse.json({ success: true });
  clearAdminSession(response);
  return response;
}
