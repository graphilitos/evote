'use client';

/**
 * Halaman login admin.
 * Mengirim password ke /api/admin/login → set cookie sesi JWT.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Login gagal.');
        setLoading(false);
        return;
      }

      router.replace('/admin');
    } catch {
      setError('Terjadi kesalahan jaringan.');
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, #1e293b, #334155)',
              border: '1px solid rgba(255,255,255,0.1)',
              fontSize: '1.75rem',
              marginBottom: '1rem',
            }}
            aria-hidden="true"
          >
            🔐
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.4rem' }}>
            Admin E-Voting
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Masukkan password admin untuk melanjutkan
          </p>
        </div>

        <div className="glass-card" style={{ padding: '2rem' }}>
          <form onSubmit={handleSubmit}>
            <label
              htmlFor="admin-password"
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '0.6rem',
              }}
            >
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="••••••••••••"
              autoComplete="current-password"
              disabled={loading}
              style={{ marginBottom: '1rem' }}
            />

            {error && (
              <div
                role="alert"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.75rem 1rem',
                  color: '#fca5a5',
                  fontSize: '0.875rem',
                  marginBottom: '1rem',
                  textAlign: 'center',
                }}
              >
                {error}
              </div>
            )}

            <button
              id="btn-login"
              type="submit"
              className="btn-primary"
              disabled={loading || !password}
              style={{ width: '100%' }}
            >
              {loading ? 'Masuk...' : 'Masuk ke Dashboard'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <a
            href="/"
            style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', textDecoration: 'none' }}
          >
            ← Kembali ke halaman pemilih
          </a>
        </p>
      </div>
    </main>
  );
}
