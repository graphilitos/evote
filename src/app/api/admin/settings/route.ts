/**
 * GET /api/admin/settings — ambil pengaturan pemilihan
 * PUT /api/admin/settings — ubah status atau show_results_public
 *
 * Transisi status yang valid: draft → open → closed (tidak bisa balik)
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { supabase } from '@/lib/supabase';

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['open'],
  open: ['closed'],
  closed: [],
};

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { data, error } = await supabase
    .from('election_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  let body: { status?: string; show_results_public?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request tidak valid.' }, { status: 400 });
  }

  // Ambil status saat ini
  const { data: current } = await supabase
    .from('election_settings')
    .select('status, show_results_public')
    .eq('id', 1)
    .single();

  if (!current) {
    return NextResponse.json({ error: 'Pengaturan tidak ditemukan.' }, { status: 500 });
  }

  const updates: Record<string, unknown> = {};

  // Validasi transisi status
  if (body.status !== undefined) {
    const allowed = VALID_TRANSITIONS[current.status] ?? [];
    if (!allowed.includes(body.status)) {
      return NextResponse.json(
        {
          error: `Tidak bisa mengubah status dari '${current.status}' ke '${body.status}'.`,
        },
        { status: 400 }
      );
    }
    updates.status = body.status;
  }

  if (body.show_results_public !== undefined) {
    updates.show_results_public = Boolean(body.show_results_public);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Tidak ada perubahan.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('election_settings')
    .update(updates)
    .eq('id', 1)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
