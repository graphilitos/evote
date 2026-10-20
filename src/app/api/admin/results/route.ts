/**
 * GET /api/admin/results — hasil suara lengkap untuk admin
 *
 * Mengembalikan:
 * - results: jumlah suara per calon (aggregate)
 * - voteDetails: daftar "token X memilih Y" (dari view vote_details)
 * - totalVotes: total suara masuk
 * - settings: status pemilihan
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const [resultsRes, detailsRes, settingsRes] = await Promise.all([
    supabase.from('results').select('*'),
    supabase.from('vote_details').select('*').order('token_code', { ascending: true }),
    supabase.from('election_settings').select('status, show_results_public').eq('id', 1).single(),
  ]);

  if (resultsRes.error) {
    return NextResponse.json({ error: resultsRes.error.message }, { status: 500 });
  }

  const results = resultsRes.data ?? [];
  const totalVotes = results.reduce(
    (sum: number, r: { vote_count: number }) => sum + Number(r.vote_count),
    0
  );

  return NextResponse.json({
    results,
    voteDetails: detailsRes.data ?? [],
    totalVotes,
    settings: settingsRes.data,
  });
}
