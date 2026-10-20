/**
 * Layout admin — cek sesi server-side.
 *
 * Jika tidak ada sesi → redirect ke /admin/login.
 * Sidebar navigasi ditampilkan untuk semua route admin yang terautentikasi.
 *
 * `instant = false` agar Next.js 16 tidak memvalidasi route ini sebagai
 * instant navigation (admin routes sengaja blocking karena baca cookie).
 */
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getAdminSessionFromCookies } from '@/lib/session';
import AdminSidebar from './AdminSidebar';

export const metadata = {
  title: 'Admin — E-Voting Ketua RT',
};

export const instant = false;

// Halaman login tidak butuh sesi — daftar path yang dikecualikan dari guard
const PUBLIC_ADMIN_PATHS = ['/admin/login'];

async function AdminLayoutInner({
  children,
  pathname,
}: {
  children: React.ReactNode;
  pathname?: string;
}) {
  const session = await getAdminSessionFromCookies();

  // Jika bukan halaman publik dan tidak ada sesi → redirect ke login
  const isPublicPath = PUBLIC_ADMIN_PATHS.some((p) => pathname?.startsWith(p));
  if (!session && !isPublicPath) {
    redirect('/admin/login');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {session && <AdminSidebar />}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              border: '3px solid rgba(255,255,255,0.1)',
              borderTopColor: 'var(--color-primary-light)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
            aria-label="Memuat..."
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      }
    >
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </Suspense>
  );
}
