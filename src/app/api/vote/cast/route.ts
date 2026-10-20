/**
 * POST /api/vote/cast
 *
 * Rekam suara. Memanggil fungsi Postgres cast_vote() yang atomik.
 *
 * Keamanan:
 * - Rate limit dicek ulang (tidak mengandalkan validate-token)
 * - Token dinormalisasi di server
 * - cast_vote() berjalan dalam satu transaksi:
 *   jika insert vote gagal, token TIDAK hangus (rollback otomatis)
 * - Pesan error generik untuk pemilih
 * - Daftar calon diambil dari DB saat ini untuk validasi candidate_id
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { isRateLimited, recordFailedAttempt } from '@/lib/rate-limit';
import { hashIp, getIpFromRequest } from '@/lib/ip-hash';

export async function POST(request: NextRequest) {
  const ip = getIpFromRequest(request);
  const ipHash = hashIp(ip);

  // 1. Cek rate limit (sekali lagi — tidak mengandalkan langkah sebelumnya)
  if (await isRateLimited(ipHash)) {
    return NextResponse.json(
      { error: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' },
      { status: 429 }
    );
  }

  let body: { token?: string; candidateId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request tidak valid.' }, { status: 400 });
  }

  // 2. Normalisasi token
  const token = (body.token ?? '').trim().toUpperCase();
  const candidateId = (body.candidateId ?? '').trim();

  if (!token || token.length !== 8 || !candidateId) {
    await recordFailedAttempt(ipHash);
    return NextResponse.json(
      { error: 'Token tidak valid atau sudah digunakan.' },
      { status: 400 }
    );
  }

  // 3. Validasi candidate_id ada di DB
  const { data: candidate } = await supabase
    .from('candidates')
    .select('id')
    .eq('id', candidateId)
    .single();

  if (!candidate) {
    return NextResponse.json(
      { error: 'Calon tidak ditemukan.' },
      { status: 400 }
    );
  }

  // 4. Panggil fungsi atomik cast_vote di Postgres
  // Fungsi ini: cek status → update token → insert vote (satu transaksi)
  const { data, error } = await supabase.rpc('cast_vote', {
    p_token: token,
    p_candidate_id: candidateId,
  });

  if (error) {
    console.error('cast_vote error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan. Silakan coba lagi.' },
      { status: 500 }
    );
  }

  const result = data as { ok: boolean; reason?: string };

  if (!result.ok) {
    // Token tidak valid atau sudah dipakai → catat percobaan gagal
    if (result.reason === 'invalid_token') {
      await recordFailedAttempt(ipHash);
      return NextResponse.json(
        { error: 'Token tidak valid atau sudah digunakan.' },
        { status: 400 }
      );
    }
    if (result.reason === 'not_open') {
      return NextResponse.json(
        { error: 'Pemilihan tidak sedang berlangsung.' },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: 'Terjadi kesalahan. Silakan coba lagi.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
