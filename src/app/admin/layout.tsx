/**
 * Layout admin — tampilkan sidebar jika sesi valid.
 *
 * CATATAN: Redirect ke /admin/login TIDAK dilakukan di sini karena
 * layout tidak bisa membaca pathname secara reliabel di Server Component.
 * Setiap halaman protected (/admin, /admin/calon, dll) sudah menangani
 * redirect sendiri via getAdminSessionFromCookies().
 * Halaman /admin/login adalah public dan tidak butuh sesi.
 */
import { Suspense } from 'react';
import { getAdminSessionFromCookies } from '@/lib/session';
import AdminSidebar from './AdminSidebar';

export const metadata = {
  title: 'Admin — E-Voting Ketua RT',
};

export const instant = false;

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
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      }
    >
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </Suspense>
  );
}
