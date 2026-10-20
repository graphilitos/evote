/**
 * Generator token sekali pakai untuk pemilihan.
 *
 * Alfabet yang digunakan menghilangkan karakter yang membingungkan:
 *   0 (nol)  → mirip O
 *   O        → mirip 0
 *   1 (satu) → mirip I dan L
 *   I        → mirip 1 dan L
 *   L        → mirip 1 dan I
 *
 * Hasil: 8 karakter dari 32 karakter alfabet yang jelas.
 */
import { randomBytes } from 'crypto';
import { supabase } from './supabase';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const TOKEN_LENGTH = 8;
const MAX_ROUNDS = 10; // batas putaran untuk mencegah loop tak terbatas

/**
 * Generate satu token raw (8 karakter, belum tentu unik).
 * Menggunakan crypto.randomBytes untuk keacakan kriptografis.
 */
function generateRawToken(): string {
  const bytes = randomBytes(TOKEN_LENGTH);
  return Array.from(bytes)
    .map((b) => ALPHABET[b % ALPHABET.length])
    .join('');
}

/**
 * Generate sejumlah token unik dan insert ke database.
 * Menggunakan INSERT ON CONFLICT DO NOTHING sehingga duplikat
 * diabaikan secara diam-diam. Jika belum cukup, generate lebih.
 *
 * @param count Jumlah token yang diinginkan (1–500)
 * @param batch Label angkatan/batch
 * @returns Array token yang berhasil dibuat
 */
export async function generateTokens(
  count: number,
  batch: string
): Promise<string[]> {
  const allInserted: string[] = [];
  let rounds = 0;

  while (allInserted.length < count) {
    if (rounds >= MAX_ROUNDS) {
      throw new Error(
        'Terlalu banyak bentrok saat generate token. Kemungkinan tabel token sudah sangat penuh.'
      );
    }

    const needed = count - allInserted.length;
    // Generate sedikit lebih banyak dari yang dibutuhkan sebagai buffer
    const candidates = Array.from(
      { length: Math.ceil(needed * 1.1) + 5 },
      generateRawToken
    );

    // Hapus duplikat dalam batch kandidat itu sendiri
    const unique = [...new Set(candidates)];

    // Upsert dengan ignoreDuplicates — token yang sudah ada di DB diabaikan
    // Ini setara dengan INSERT ... ON CONFLICT DO NOTHING
    const { data, error } = await supabase
      .from('tokens')
      .upsert(
        unique.map((code) => ({ code, batch, used: false })),
        { onConflict: 'code', ignoreDuplicates: true }
      )
      .select('code');

    if (error) {
      throw new Error(`Gagal insert token: ${error.message}`);
    }

    if (data && data.length > 0) {
      allInserted.push(...data.map((r: { code: string }) => r.code));
    }

    rounds++;
  }

  // Kembalikan tepat sejumlah yang diminta (tidak lebih)
  return allInserted.slice(0, count);
}
