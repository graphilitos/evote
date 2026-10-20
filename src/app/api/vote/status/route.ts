/**
 * GET /api/vote/status
 * Kembalikan status pemilihan saat ini.
 * Endpoint publik, tidak memerlukan sesi.
 * Digunakan halaman / untuk menampilkan pesan status yang sesuai.
 */
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  void request;

  // Jika env belum dikonfigurasi, kembalikan status 'unknown' (graceful)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ status: 'unknown' });
  }

  try {
    const { supabase } = await import('@/lib/supabase');

    const { data, error } = await supabase
      .from('election_settings')
      .select('status, show_results_public')
      .eq('id', 1)
      .single();

    if (error || !data) {
      return NextResponse.json({ status: 'unknown' });
    }

    return NextResponse.json({
      status: data.status,
      showResultsPublic: data.show_results_public,
    });
  } catch {
    return NextResponse.json({ status: 'unknown' });
  }
}
