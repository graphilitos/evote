/**
 * GET /api/ping
 *
 * Endpoint ringan untuk cron job — query ke Supabase agar project
 * tidak ter-pause karena inaktivitas (Supabase free tier: pause setelah 7 hari).
 *
 * Dipanggil otomatis oleh Vercel Cron Job setiap hari pukul 08.00 WIB (01:00 UTC).
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'edge';

export async function GET() {
  const start = Date.now();

  // Query ringan — hanya ambil status dari election_settings
  const { data, error } = await supabase
    .from('election_settings')
    .select('status')
    .eq('id', 1)
    .single();

  const elapsed = Date.now() - start;

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message, elapsed },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    status: data?.status ?? 'unknown',
    elapsed,
    timestamp: new Date().toISOString(),
  });
}
