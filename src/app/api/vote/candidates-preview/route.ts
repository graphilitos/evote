/**
 * GET /api/vote/candidates-preview
 *
 * Daftar bakal calon yang bisa dilihat oleh publik (voter) kapan saja,
 * tanpa perlu status pemilihan = 'open'.
 * Hanya mengembalikan id, name, age, description — tidak ada data sensitif.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  void request;

  const { data: candidates, error } = await supabase
    .from('candidates')
    .select('id, name, age, description')
    .order('name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(candidates ?? []);
}
