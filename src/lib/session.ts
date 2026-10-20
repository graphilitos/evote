/**
 * Manajemen sesi admin menggunakan JWT (jose).
 *
 * Keamanan cookie:
 * - httpOnly: tidak bisa diakses JavaScript browser
 * - secure: hanya dikirim lewat HTTPS
 * - sameSite=strict: proteksi CSRF
 * - Ditandatangani dengan SESSION_SECRET (HS256)
 * - Kedaluwarsa 12 jam
 */
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'evote_admin_session';
const SESSION_DURATION = 60 * 60 * 12; // 12 jam dalam detik

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET wajib diisi dan minimal 32 karakter.');
  }
  return new TextEncoder().encode(secret);
}

interface AdminPayload extends JWTPayload {
  role: 'admin';
}

/**
 * Buat JWT sesi admin dan simpan ke cookie httpOnly.
 */
export async function createAdminSession(response: NextResponse): Promise<void> {
  const secret = getSecret();
  const token = await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(secret);

  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_DURATION,
    path: '/',
  });
}

/**
 * Hapus cookie sesi admin (logout).
 */
export function clearAdminSession(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
}

/**
 * Verifikasi sesi admin dari request.
 * Digunakan sebagai guard di semua API route admin.
 * @returns payload JWT jika valid, null jika tidak valid
 */
export async function verifyAdminSession(
  request: NextRequest
): Promise<AdminPayload | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const secret = getSecret();
    const { payload } = await jwtVerify<AdminPayload>(token, secret);
    if (payload.role !== 'admin') return null;
    return payload;
  } catch {
    // Token expired, invalid signature, dsb.
    return null;
  }
}

/**
 * Helper untuk Server Components: cek sesi dari cookies() Next.js.
 */
export async function getAdminSessionFromCookies(): Promise<AdminPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const secret = getSecret();
    const { payload } = await jwtVerify<AdminPayload>(token, secret);
    if (payload.role !== 'admin') return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Guard untuk API route admin.
 * Kembalikan Response 401 jika sesi tidak valid.
 * Gunakan: const authError = await requireAdmin(request); if (authError) return authError;
 */
export async function requireAdmin(
  request: NextRequest
): Promise<NextResponse | null> {
  const session = await verifyAdminSession(request);
  if (!session) {
    return NextResponse.json(
      { error: 'Sesi tidak valid. Silakan login kembali.' },
      { status: 401 }
    );
  }
  return null;
}
