/**
 * Rate limiter berbasis database (tabel vote_attempts).
 *
 * Aturan: maksimal 10 percobaan token gagal per IP (dalam hash)
 * dalam window 15 menit. Percobaan berhasil tidak dihitung.
 *
 * IP disimpan sebagai hash SHA-256 — bukan IP asli.
 */
import { supabase } from './supabase';

const MAX_ATTEMPTS = 10;
const WINDOW_MINUTES = 15;

/**
 * Cek apakah IP sudah melewati batas percobaan.
 * @returns true jika sudah kena rate limit
 */
export async function isRateLimited(ipHash: string): Promise<boolean> {
  const windowStart = new Date(
    Date.now() - WINDOW_MINUTES * 60 * 1000
  ).toISOString();

  const { count, error } = await supabase
    .from('vote_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('attempted_at', windowStart);

  if (error) {
    // Gagal cek rate limit → izinkan (fail open, lebih baik daripada blokir semua)
    console.error('Rate limit check error:', error);
    return false;
  }

  return (count ?? 0) >= MAX_ATTEMPTS;
}

/**
 * Catat satu percobaan gagal untuk IP ini.
 */
export async function recordFailedAttempt(ipHash: string): Promise<void> {
  await supabase.from('vote_attempts').insert({ ip_hash: ipHash });
  // Bersihkan data lama secara async (tidak blocking)
  cleanupOldAttempts().catch(console.error);
}

/**
 * Hapus record percobaan yang sudah lebih dari WINDOW_MINUTES.
 * Dipanggil secara async untuk menjaga tabel tetap kecil.
 */
async function cleanupOldAttempts(): Promise<void> {
  const windowStart = new Date(
    Date.now() - WINDOW_MINUTES * 60 * 1000
  ).toISOString();

  await supabase
    .from('vote_attempts')
    .delete()
    .lt('attempted_at', windowStart);
}
