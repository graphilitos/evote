/**
 * POST /api/vote/validate-token
 *
 * Validasi token sebelum pemilih memilih calon.
 * Hanya mengecek keabsahan token — TIDAK merekam suara.
 *
 * Keamanan:
 * - Rate limit: maks 10 percobaan gagal per IP per 15 menit
 * - Token dinormalisasi (trim + uppercase) di server
 * - Pesan error generik — tidak membedakan "tidak ada" vs "sudah terpakai"
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { isRateLimited, recordFailedAttempt } from '@/lib/rate-limit';
import { hashIp, getIpFromRequest } from '@/lib/ip-hash';

export async function POST(request: NextRequest) {
  const ip = getIpFromRequest(request);
  const ipHash = hashIp(ip);

  // 1. Cek rate limit
  if (await isRateLimited(ipHash)) {
    return NextResponse.json(
      { error: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' },
      { status: 429 }
    );
  }

  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request tidak valid.' }, { status: 400 });
  }

  // 2. Normalisasi token di server (trim + uppercase)
  const token = (body.token ?? '').trim().toUpperCase();

  if (!token || token.length !== 8) {
    await recordFailedAttempt(ipHash);
    return NextResponse.json(
      { error: 'Token tidak valid atau sudah digunakan.' },
      { status: 400 }
    );
  }

  // 3. Cek status pemilihan
  const { data: settings } = await supabase
    .from('election_settings')
    .select('status')
    .eq('id', 1)
    .single();

  if (!settings || settings.status !== 'open') {
    return NextResponse.json(
      {
        error:
          settings?.status === 'draft'
            ? 'Pemilihan belum dibuka.'
            : 'Pemilihan sudah ditutup.',
        status: settings?.status ?? 'unknown',
      },
      { status: 403 }
    );
  }

  // 4. Cek token ada dan belum dipakai
  // Pesan error sengaja dibuat generik — tidak membedakan
  // "token tidak ada" vs "token sudah dipakai"
  const { data: tokenData } = await supabase
    .from('tokens')
    .select('code')
    .eq('code', token)
    .eq('used', false)
    .single();

  if (!tokenData) {
    await recordFailedAttempt(ipHash);
    return NextResponse.json(
      { error: 'Token tidak valid atau sudah digunakan.' },
      { status: 400 }
    );
  }

  // Token valid — kembalikan konfirmasi (jangan kembalikan info sensitif)
  return NextResponse.json({ valid: true });
}
