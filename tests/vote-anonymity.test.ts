/**
 * Tes (b): Tabel `votes` tidak mempunyai jalur ke token atau pemilih.
 *
 * Memastikan skema database menjaga anonimitas suara:
 * - Tidak ada kolom token_code / token / token_id
 * - Tidak ada kolom created_at (tidak bisa dicocokkan lewat waktu)
 * - Tidak ada foreign key ke tabel tokens
 *
 * Tes ini berjalan langsung ke Supabase menggunakan information_schema.
 */
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const shouldSkip = !supabaseUrl || !serviceKey;

describe('Vote anonymity — skema tabel votes', () => {
  const db = shouldSkip
    ? null
    : createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

  it(
    shouldSkip
      ? 'SKIPPED — set SUPABASE env vars'
      : 'tabel votes tidak memiliki kolom token, token_code, atau created_at',
    async () => {
      if (shouldSkip || !db) {
        console.warn('Tes dilewati: env Supabase tidak diset.');
        return;
      }

      // Ambil semua kolom tabel votes dari information_schema
      const { data, error } = await db
        .from('information_schema.columns' as string)
        .select('column_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'votes');

      expect(error).toBeNull();
      expect(data).toBeTruthy();

      const columnNames = (data ?? []).map((r: { column_name: string }) =>
        r.column_name.toLowerCase()
      );

      // Kolom yang TIDAK BOLEH ada
      const forbidden = ['token', 'token_code', 'token_id', 'created_at', 'voted_at', 'timestamp'];

      for (const col of forbidden) {
        expect(
          columnNames,
          `Kolom '${col}' tidak boleh ada di tabel votes (melanggar privasi)`
        ).not.toContain(col);
      }

      // Kolom yang HARUS ada (hanya ini)
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('candidate_id');

      console.log('Kolom di tabel votes:', columnNames);
    }
  );

  it(
    shouldSkip ? 'SKIPPED' : 'tabel votes tidak punya foreign key ke tabel tokens',
    async () => {
      if (shouldSkip || !db) return;

      // Cek foreign key constraints
      const { data, error } = await db
        .from('information_schema.table_constraints' as string)
        .select('constraint_name, constraint_type')
        .eq('table_schema', 'public')
        .eq('table_name', 'votes')
        .eq('constraint_type', 'FOREIGN KEY');

      expect(error).toBeNull();

      // Ambil daftar kolom yang menjadi FK target
      const { data: fkData } = await db
        .from('information_schema.key_column_usage' as string)
        .select('column_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'votes');

      const fkColumns = (fkData ?? []).map((r: { column_name: string }) =>
        r.column_name.toLowerCase()
      );

      // Pastikan tidak ada FK yang mereferensi kolom bertanda 'token'
      const tokenRelatedFk = fkColumns.filter((col) => col.includes('token'));
      expect(tokenRelatedFk.length).toBe(0);
    }
  );
});
