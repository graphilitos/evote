'use client';

/**
 * Sidebar navigasi admin (desktop) + Bottom navbar (mobile).
 */
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: '🏠', exact: true },
  { href: '/admin/calon', label: 'Calon', icon: '👤', exact: false },
  { href: '/admin/token', label: 'Token', icon: '🎫', exact: false },
  { href: '/admin/hasil', label: 'Hasil', icon: '📊', exact: false },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.replace('/admin/login');
  }

  return (
    <>
      {/* ─── Sidebar desktop ─── */}
      <aside
        className="admin-sidebar"
        style={{
          width: '220px',
          flexShrink: 0,
          background: '#fff',
          borderRight: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.5rem 1rem',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
          boxShadow: '1px 0 8px rgba(0,0,0,0.04)',
        }}
      >
        {/* Logo */}
        <div style={{ marginBottom: '2rem', paddingLeft: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🗳️</span>
            <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--color-primary)', lineHeight: 1.2 }}>
              E-Voting
            </span>
          </div>
          <p style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', paddingLeft: '1.75rem', lineHeight: 1.4 }}>
            Bakal Calon Ketua RT 01 / RW 05<br />Panel Admin
          </p>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1 }}>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {navItems.map((item) => {
              const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    id={`nav-${item.label.toLowerCase()}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.625rem',
                      padding: '0.625rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      textDecoration: 'none',
                      fontSize: '0.9rem',
                      fontWeight: isActive ? 700 : 400,
                      color: isActive ? '#fff' : 'var(--color-text-muted)',
                      background: isActive
                        ? 'linear-gradient(135deg, #4f46e5, #7c3aed)'
                        : 'transparent',
                      transition: 'all 0.15s ease',
                    }}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span aria-hidden="true">{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <button
          id="btn-logout"
          onClick={handleLogout}
          style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem 0.75rem', borderRadius: 'var(--radius-sm)', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.875rem', cursor: 'pointer', width: '100%', fontFamily: 'inherit' }}
        >
          <span aria-hidden="true">🚪</span>
          Keluar
        </button>
      </aside>

      {/* ─── Bottom navbar mobile ─── */}
      <nav className="admin-bottom-nav" aria-label="Navigasi admin">
        {navItems.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`admin-bottom-nav-item${isActive ? ' active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          );
        })}
        {/* Tombol logout di tengah */}
        <button
          onClick={handleLogout}
          className="admin-bottom-nav-item"
          style={{ flex: '0 0 auto', width: '48px', height: '48px', background: '#ef4444', borderRadius: '50%', padding: 0, marginTop: '-16px', boxShadow: '0 4px 16px rgba(239,68,68,0.4)' }}
          aria-label="Keluar"
        >
          <span className="nav-icon" style={{ fontSize: '1rem' }}>🚪</span>
        </button>
      </nav>
    </>
  );
}
