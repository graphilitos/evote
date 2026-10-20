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

  // Hapus dalam urutan aman (foreign key: votes → tokens → candidates)
  // neq dengan nilai dummy memastikan semua baris terhapus

  const { error: e1 } = await supabase
    .from('votes')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (e1) return NextResponse.json({ error: 'Gagal hapus votes: ' + e1.message }, { status: 500 });

  const { error: e2 } = await supabase
    .from('vote_attempts')
    .delete()
    .neq('ip_hash', '');
  if (e2) return NextResponse.json({ error: 'Gagal hapus vote_attempts: ' + e2.message }, { status: 500 });

  const { error: e3 } = await supabase
    .from('tokens')
    .delete()
    .neq('code', '');
  if (e3) return NextResponse.json({ error: 'Gagal hapus tokens: ' + e3.message }, { status: 500 });

  const { error: e4 } = await supabase
    .from('candidates')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (e4) return NextResponse.json({ error: 'Gagal hapus candidates: ' + e4.message }, { status: 500 });

  const { error: e5 } = await supabase
    .from('election_settings')
    .update({ status: 'draft', show_results_public: false })
    .eq('id', 1);
  if (e5) return NextResponse.json({ error: 'Gagal reset settings: ' + e5.message }, { status: 500 });

  return NextResponse.json({ success: true, message: 'Semua data berhasil direset.' });
}
