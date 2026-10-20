/**
 * GET /api/admin/results — hasil suara lengkap untuk admin
 *
 * Mengembalikan jumlah suara per calon dari view 'results'.
 * Diurutkan dari suara terbanyak ke terendah.
 * Calon tanpa suara tetap muncul dengan nilai 0.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { data: results, error: resultsError } = await supabase
    .from('results')
    .select('*');

  if (resultsError) {
    return NextResponse.json({ error: resultsError.message }, { status: 500 });
  }

  const { data: settings } = await supabase
    .from('election_settings')
    .select('status, show_results_public')
    .eq('id', 1)
    .single();

  // Hitung total suara
  const totalVotes = (results ?? []).reduce(
    (sum: number, r: { vote_count: number }) => sum + Number(r.vote_count),
    0
  );

  return NextResponse.json({
    results: results ?? [],
    totalVotes,
    settings,
  });
}
