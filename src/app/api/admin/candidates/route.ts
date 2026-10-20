/**
 * GET  /api/admin/candidates — ambil semua calon
 * POST /api/admin/candidates — tambah calon baru
 *
 * Calon hanya bisa ditambah saat status = 'draft'.
 * Semua endpoint memerlukan sesi admin yang valid.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  // Cek status — calon hanya bisa ditambah saat draft
  // Jika settings null (tabel belum ada/migration belum jalan), izinkan sebagai fallback
  const { data: settings, error: settingsError } = await supabase
    .from('election_settings')
    .select('status')
    .eq('id', 1)
    .single();

  // Jika ada error DB selain "not found", laporkan
  if (settingsError && settingsError.code !== 'PGRST116') {
    return NextResponse.json(
      { error: 'Gagal membaca status pemilihan: ' + settingsError.message },
      { status: 500 }
    );
  }

  // Jika settings ada DAN statusnya bukan draft, tolak
  if (settings && settings.status !== 'draft') {
    return NextResponse.json(
      { error: 'Calon hanya bisa ditambah saat status pemilihan adalah Draft.' },
      { status: 403 }
    );
  }

  let body: { name?: string; description?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request tidak valid.' }, { status: 400 });
  }

  const name = (body.name ?? '').trim();
  if (!name) {
    return NextResponse.json({ error: 'Nama calon wajib diisi.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('candidates')
    .insert({ name, description: body.description?.trim() ?? null })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
