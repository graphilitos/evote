/**
 * GET /api/vote/candidates
 *
 * Daftar calon untuk halaman pemilih.
 * Hanya tersedia saat status pemilihan = 'open'.
 * Tidak memerlukan sesi admin.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  void request;

  // Cek status pemilihan
  const { data: settings } = await supabase
    .from('election_settings')
    .select('status')
    .eq('id', 1)
    .single();

  if (!settings || settings.status !== 'open') {
    return NextResponse.json(
      { error: 'Pemilihan tidak sedang berlangsung.' },
      { status: 403 }
    );
  }

  const { data: candidates, error } = await supabase
    .from('candidates')
    .select('id, name, age, description')
    .order('name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(candidates ?? []);
}
