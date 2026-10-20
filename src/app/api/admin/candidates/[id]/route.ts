/**
 * PUT    /api/admin/candidates/[id] — ubah calon
 * DELETE /api/admin/candidates/[id] — hapus calon
 *
 * Calon hanya bisa diubah/dihapus saat status = 'draft'.
 * Semua endpoint memerlukan sesi admin yang valid.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { supabase } from '@/lib/supabase';

async function checkDraftStatus(): Promise<boolean> {
  const { data } = await supabase
    .from('election_settings')
    .select('status')
    .eq('id', 1)
    .single();
  return data?.status === 'draft';
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  if (!(await checkDraftStatus())) {
    return NextResponse.json(
      { error: 'Calon hanya bisa diubah saat status pemilihan adalah Draft.' },
      { status: 403 }
    );
  }

  const { id } = await params;
  let body: { name?: string; description?: string; age?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request tidak valid.' }, { status: 400 });
  }

  const name = (body.name ?? '').trim();
  if (!name) {
    return NextResponse.json({ error: 'Nama calon wajib diisi.' }, { status: 400 });
  }

  const age = body.age != null ? Number(body.age) : null;
  if (age !== null && (isNaN(age) || age < 17 || age > 100)) {
    return NextResponse.json({ error: 'Usia harus antara 17–100 tahun.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('candidates')
    .update({ name, description: body.description?.trim() ?? null, age })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Calon tidak ditemukan.' }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  if (!(await checkDraftStatus())) {
    return NextResponse.json(
      { error: 'Calon hanya bisa dihapus saat status pemilihan adalah Draft.' },
      { status: 403 }
    );
  }

  const { id } = await params;
  const { error } = await supabase.from('candidates').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
