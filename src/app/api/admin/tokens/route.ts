/**
 * POST /api/admin/tokens — generate token massal
 * GET  /api/admin/tokens — ringkasan token (total, terpakai, belum)
 *
 * KEAMANAN: Ringkasan tidak menampilkan token mana yang sudah dipakai
 * atau oleh siapa — hanya jumlah agregat.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { generateTokens } from '@/lib/token-gen';

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { data: totalData } = await supabase
    .from('tokens')
    .select('*', { count: 'exact', head: true });

  const { count: usedCount } = await supabase
    .from('tokens')
    .select('*', { count: 'exact', head: true })
    .eq('used', true);

  const { count: unusedCount } = await supabase
    .from('tokens')
    .select('*', { count: 'exact', head: true })
    .eq('used', false);

  // Ambil daftar batch yang ada
  const { data: batches } = await supabase
    .from('tokens')
    .select('batch')
    .order('created_at', { ascending: false });

  const uniqueBatches = [...new Set((batches ?? []).map((b: { batch: string }) => b.batch))];

  return NextResponse.json({
    total: totalData ?? 0,
    used: usedCount ?? 0,
    unused: unusedCount ?? 0,
    batches: uniqueBatches,
  });
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  let body: { count?: number; batch?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request tidak valid.' }, { status: 400 });
  }

  const count = Number(body.count);
  const batch = (body.batch ?? '').trim();

  if (!Number.isInteger(count) || count < 1 || count > 500) {
    return NextResponse.json(
      { error: 'Jumlah token harus antara 1 dan 500.' },
      { status: 400 }
    );
  }

  if (!batch) {
    return NextResponse.json(
      { error: 'Label batch wajib diisi.' },
      { status: 400 }
    );
  }

  try {
    const tokens = await generateTokens(count, batch);
    // Token dikembalikan SEKALI — tidak bisa diambil ulang dari API ini
    return NextResponse.json({ tokens, count: tokens.length }, { status: 201 });
  } catch (err) {
    console.error('Generate token error:', err);
    return NextResponse.json(
      { error: 'Gagal generate token. Coba lagi.' },
      { status: 500 }
    );
  }
}
