/**
 * POST /api/admin/candidates/import
 *
 * Import calon secara massal dari data CSV yang sudah di-parse di client.
 * Body: { candidates: Array<{ name: string; age?: number; description?: string }> }
 *
 * Hanya tersedia saat status pemilihan = 'draft'.
 * Memerlukan sesi admin yang valid.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { supabase } from '@/lib/supabase';

interface ImportRow {
  name: string;
  age?: number | null;
  description?: string | null;
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  // Cek status — hanya draft yang boleh import
  const { data: settings } = await supabase
    .from('election_settings')
    .select('status')
    .eq('id', 1)
    .single();

  if (settings && settings.status !== 'draft') {
    return NextResponse.json(
      { error: 'Import hanya bisa dilakukan saat status pemilihan adalah Draft.' },
      { status: 403 }
    );
  }

  let body: { candidates?: ImportRow[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request tidak valid.' }, { status: 400 });
  }

  const rows = body.candidates;
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'Tidak ada data calon untuk diimport.' }, { status: 400 });
  }

  if (rows.length > 500) {
    return NextResponse.json({ error: 'Maksimal 500 calon per import.' }, { status: 400 });
  }

  // Validasi tiap baris
  const errors: string[] = [];
  const validated: ImportRow[] = [];

  rows.forEach((row, i) => {
    const name = (row.name ?? '').trim();
    if (!name) {
      errors.push(`Baris ${i + 1}: nama kosong.`);
      return;
    }
    const age = row.age != null ? Number(row.age) : null;
    if (age !== null && (isNaN(age) || age < 17 || age > 100)) {
      errors.push(`Baris ${i + 1} (${name}): usia ${row.age} tidak valid (harus 17–100).`);
      return;
    }
    validated.push({ name, age, description: row.description?.trim() || null });
  });

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(' '), errors }, { status: 400 });
  }

  // Bulk insert
  const { data, error } = await supabase
    .from('candidates')
    .insert(validated)
    .select('id, name, age');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    imported: data?.length ?? 0,
    candidates: data,
  }, { status: 201 });
}
