/**
 * POST /api/admin/reset
 *
 * Hapus SEMUA data: votes, tokens, candidates, vote_attempts.
 * Reset election_settings ke status 'draft'.
 *
 * ⚠️  Tindakan ini PERMANEN dan tidak bisa dibatalkan.
 * Memerlukan header konfirmasi khusus sebagai lapis keamanan tambahan.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  // Header konfirmasi wajib ada — mencegah reset tidak sengaja
  const confirm = request.headers.get('x-confirm-reset');
  if (confirm !== 'RESET_ALL_DATA') {
    return NextResponse.json(
      { error: 'Header konfirmasi tidak valid.' },
      { status: 400 }
    );
  }

  // Hapus dalam urutan yang aman (foreign key: votes → tokens → candidates)
  const steps: Array<{ name: string; op: () => Promise<{ error: { message: string } | null }> }> = [
    { name: 'votes',          op: () => supabase.from('votes').delete().neq('id', '00000000-0000-0000-0000-000000000000') },
    { name: 'vote_attempts',  op: () => supabase.from('vote_attempts').delete().neq('ip_hash', '') },
    { name: 'tokens',         op: () => supabase.from('tokens').delete().neq('code', '') },
    { name: 'candidates',     op: () => supabase.from('candidates').delete().neq('id', '00000000-0000-0000-0000-000000000000') },
    {
      name: 'election_settings',
      op: () =>
        supabase
          .from('election_settings')
          .update({ status: 'draft', show_results_public: false })
          .eq('id', 1),
    },
  ];

  for (const step of steps) {
    const { error } = await step.op();
    if (error) {
      return NextResponse.json(
        { error: `Gagal menghapus ${step.name}: ${error.message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true, message: 'Semua data berhasil direset.' });
}
