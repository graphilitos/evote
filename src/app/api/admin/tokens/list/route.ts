/**
 * GET /api/admin/tokens/list
 *
 * Mengembalikan daftar semua token beserta statusnya untuk ditampilkan
 * di dashboard admin — tanpa harus download CSV.
 *
 * Query params:
 *   batch  — filter per batch (opsional)
 *   status — 'used' | 'unused' | 'all' (default: 'all')
 *   page   — nomor halaman (default: 1)
 *   limit  — per halaman (default: 50, maks: 200)
 *
 * KEAMANAN: Endpoint ini memerlukan sesi admin yang valid.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const batch  = searchParams.get('batch') ?? '';
  const status = searchParams.get('status') ?? 'all';   // 'used' | 'unused' | 'all'
  const page   = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const limit  = Math.min(200, Math.max(1, Number(searchParams.get('limit') ?? '50')));
  const offset = (page - 1) * limit;

  let query = supabase
    .from('tokens')
    .select('token, batch, used, used_at, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (batch) query = query.eq('batch', batch);
  if (status === 'used')   query = query.eq('used', true);
  if (status === 'unused') query = query.eq('used', false);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    tokens: data ?? [],
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  });
}
