/**
 * Tes (a): Token yang sama dikirim dua kali secara bersamaan
 * hanya menghasilkan satu suara.
 *
 * Pengujian dilakukan langsung via fungsi Postgres cast_vote()
 * menggunakan Supabase client dengan service role key.
 *
 * PRASYARAT: Jalankan setelah migration dan seed test data.
 * Set environment variable NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

// Skip tes jika env tidak tersedia
const shouldSkip = !supabaseUrl || !serviceKey;

describe('Concurrent vote test', () => {
  const db = shouldSkip
    ? null
    : createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

  let testToken = '';
  let testCandidateId = '';

  beforeAll(async () => {
    if (shouldSkip || !db) return;

    // Pastikan status = 'open' untuk tes
    await db.from('election_settings').update({ status: 'open' }).eq('id', 1);

    // Buat token test unik
    testToken = `TEST${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const tokenCode = testToken.slice(0, 8).toUpperCase().padEnd(8, 'X');
    testToken = tokenCode;

    await db.from('tokens').upsert({
      code: testToken,
      used: false,
      batch: 'TEST',
    });

    // Ambil (atau buat) kandidat test
    const { data: candidates } = await db.from('candidates').select('id').limit(1);
    if (candidates && candidates.length > 0) {
      testCandidateId = candidates[0].id;
    } else {
      const { data } = await db
        .from('candidates')
        .insert({ name: 'Kandidat Test' })
        .select('id')
        .single();
      testCandidateId = data?.id ?? '';
    }
  });

  afterAll(async () => {
    if (shouldSkip || !db || !testToken) return;
    // Cleanup: hapus token test dan vote yang terkait (jika ada)
    await db.from('tokens').delete().eq('code', testToken);
  });

  it(
    shouldSkip
      ? 'SKIPPED — set SUPABASE env vars untuk menjalankan tes ini'
      : 'token yang sama dikirim bersamaan hanya menghasilkan SATU suara',
    async () => {
      if (shouldSkip || !db || !testToken || !testCandidateId) {
        console.warn('Tes dilewati: env Supabase tidak diset.');
        return;
      }

      // Hitung suara sebelum
      const { count: beforeCount } = await db
        .from('votes')
        .select('*', { count: 'exact', head: true });

      // Kirim dua request cast_vote bersamaan dengan token yang sama
      const [result1, result2] = await Promise.all([
        db.rpc('cast_vote', { p_token: testToken, p_candidate_id: testCandidateId }),
        db.rpc('cast_vote', { p_token: testToken, p_candidate_id: testCandidateId }),
      ]);

      const results = [result1.data, result2.data] as Array<{
        ok: boolean;
        reason?: string;
      } | null>;

      // Tepat satu harus berhasil
      const successCount = results.filter((r) => r?.ok === true).length;
      const failCount = results.filter((r) => r?.ok === false).length;

      expect(successCount).toBe(1);
      expect(failCount).toBe(1);

      // Hitung suara sesudah — harus bertambah tepat 1
      const { count: afterCount } = await db
        .from('votes')
        .select('*', { count: 'exact', head: true });

      expect((afterCount ?? 0) - (beforeCount ?? 0)).toBe(1);

      // Token harus sudah ditandai terpakai
      const { data: tokenData } = await db
        .from('tokens')
        .select('used')
        .eq('code', testToken)
        .single();

      expect(tokenData?.used).toBe(true);
    }
  );
});
