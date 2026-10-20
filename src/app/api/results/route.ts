/**
 * GET /api/results — hasil suara publik
 *
 * Hanya bisa diakses jika:
 * - show_results_public = true, ATAU
 * - status = 'closed'
 *
 * Tidak memerlukan sesi admin.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  void request;

  const { data: settings, error: settingsError } = await supabase
    .from('election_settings')
    .select('status, show_results_public')
    .eq('id', 1)
    .single();

  if (settingsError || !settings) {
    return NextResponse.json({ error: 'Konfigurasi tidak ditemukan.' }, { status: 500 });
  }

  // Cek akses publik
  const canView =
    settings.show_results_public === true || settings.status === 'closed';

  if (!canView) {
    return NextResponse.json(
      { error: 'Hasil belum tersedia untuk umum.', status: settings.status },
      { status: 403 }
    );
  }

  const { data: results, error: resultsError } = await supabase
    .from('results')
    .select('id, name, description, vote_count');

  if (resultsError) {
    return NextResponse.json({ error: resultsError.message }, { status: 500 });
  }

  const totalVotes = (results ?? []).reduce(
    (sum: number, r: { vote_count: number }) => sum + Number(r.vote_count),
    0
  );

  return NextResponse.json({
    results: results ?? [],
    totalVotes,
    status: settings.status,
  });
}
