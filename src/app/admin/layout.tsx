/**
 * Layout admin — cek sesi server-side.
 * Sidebar hanya ditampilkan jika sesi admin valid.
 *
 * `instant = false` menyatakan ke Next.js 16 (dengan cacheComponents)
 * bahwa semua route admin boleh blocking — tidak diharapkan instant.
 * Ini menghapus prerender warning untuk cookies() di admin layout.
 */
import { Suspense } from 'react';
import { getAdminSessionFromCookies } from '@/lib/session';
import AdminSidebar from './AdminSidebar';

export const metadata = {
  title: 'Admin — E-Voting Ketua RT',
};

// Semua route admin boleh blocking (tidak instant) karena membaca cookie sesi
export const instant = false;

// Komponen server terpisah agar Suspense bisa membungkusnya
async function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const session = await getAdminSessionFromCookies();

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
