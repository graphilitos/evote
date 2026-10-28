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
 *
 * Strategi:
 * - Setiap iterasi insert TEPAT sejumlah yang masih dibutuhkan (tidak ada buffer).
 * - Jika ada konflik unik (23505), seluruh batch gagal → coba lagi dengan token baru.
 * - Ini memastikan jumlah token di DB == jumlah yang diminta, tidak lebih.
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

    // Generate TEPAT sejumlah yang masih dibutuhkan — tanpa buffer.
    // Buffer menyebabkan token ekstra masuk DB tanpa dikembalikan ke user.
    const candidates = Array.from({ length: needed }, generateRawToken);

    // Hapus duplikat internal dan token yang sudah ada di sesi ini
    const uniqueNew = [...new Set(candidates)].filter(
      (c) => !allInserted.includes(c)
    );

    if (uniqueNew.length === 0) {
      // Sangat jarang: seluruh kandidat duplikat internal → coba lagi
      rounds++;
      continue;
    }

    // INSERT — tidak pakai upsert agar .select() hanya kembalikan baris BARU.
    // Jika ada konflik di DB (23505), seluruh batch gagal → loop lanjut dengan token baru.
    const { data, error } = await supabase
      .from('tokens')
      .insert(uniqueNew.map((code) => ({ code, batch, used: false })))
      .select('code');

    if (error) {
      if (error.code !== '23505') {
        // Error lain yang tidak terduga
        throw new Error(`Gagal insert token: ${error.message}`);
      }
      // Konflik unik → generate ulang token baru di iterasi berikutnya
      rounds++;
      continue;
    }

    if (data && data.length > 0) {
      allInserted.push(...data.map((r: { code: string }) => r.code));
    }

    rounds++;
  }

  // Kembalikan tepat sejumlah yang diminta.
  // Karena uniqueNew bisa < needed (ada duplikat internal), allInserted
  // mungkin sedikit kurang dari count → loop sudah handle itu.
  return allInserted;
}
