'use client';

/**
 * Sidebar navigasi admin.
 * Komponen client untuk interaksi (logout, navigasi aktif).
 */
import { usePathname, useRouter } from 'next/navigation';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: '📊', exact: true },
  { href: '/admin/calon', label: 'Calon', icon: '👤', exact: false },
  { href: '/admin/token', label: 'Token', icon: '🎫', exact: false },
  { href: '/admin/hasil', label: 'Hasil', icon: '📈', exact: false },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.replace('/admin/login');
  }

  return (
    <aside
      style={{
        width: '220px',
        flexShrink: 0,
        background: 'rgba(255,255,255,0.03)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem 1rem',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
      }}
    >
      {/* Logo */}
      <div style={{ marginBottom: '2rem', paddingLeft: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <span style={{ fontSize: '1.25rem' }}>🗳️</span>
          <span style={{ fontWeight: 800, fontSize: '1rem' }}>E-Voting</span>
        </div>
        <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', paddingLeft: '1.75rem' }}>
          Panel Admin
        </p>
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1 }}>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                <a
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
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#fff' : 'var(--color-text-muted)',
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(79,70,229,0.4), rgba(124,58,237,0.2))'
                      : 'transparent',
                    border: isActive ? '1px solid rgba(129,140,248,0.2)' : '1px solid transparent',
                    transition: 'all 0.15s ease',
                  }}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Tombol logout */}
      <button
        id="btn-logout"
        onClick={handleLogout}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          padding: '0.625rem 0.75rem',
          borderRadius: 'var(--radius-sm)',
          background: 'transparent',
          border: '1px solid transparent',
          color: 'var(--color-text-muted)',
          fontSize: '0.9rem',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          width: '100%',
          fontFamily: 'inherit',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = '#fca5a5';
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-muted)';
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
        }}
      >
        <span aria-hidden="true">🚪</span>
        Keluar
      </button>
    </aside>
  );
}
