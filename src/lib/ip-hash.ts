/**
 * Hash IP address menggunakan SHA-256.
 * IP asli TIDAK pernah disimpan ke database — hanya hash-nya.
 * Ini menjaga privasi pemilih sekaligus memungkinkan rate limiting.
 */
import { createHash } from 'crypto';

export function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

/**
 * Mengambil IP dari request Next.js.
 * Mendukung proxy/CDN (Vercel menggunakan x-forwarded-for).
 */
export function getIpFromRequest(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // Ambil IP pertama (client asli) dari daftar yang dipisah koma
    return forwarded.split(',')[0].trim();
  }
  // Fallback: tidak diketahui
  return 'unknown';
}
