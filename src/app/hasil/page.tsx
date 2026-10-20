'use client';

/**
 * Halaman hasil publik (/hasil).
 * Hanya tampil jika show_results_public = true atau status = 'closed'.
 * Auto-refresh setiap 30 detik saat status = 'open'.
 */
import { useState, useEffect } from 'react';

interface Result {
  id: string;
  name: string;
  description: string | null;
  vote_count: number;
}

interface Data {
  results: Result[];
  totalVotes: number;
  status: string;
}

export default function HasilPublikPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function fetchResults() {
    try {
      const res = await fetch('/api/results');
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Hasil belum tersedia.');
        return;
      }
      const d = await res.json();
      setData(d);
      setError('');
    } catch {
      setError('Gagal memuat hasil. Muat ulang halaman.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchResults();
    const interval = setInterval(fetchResults, 30000);
    return () => clearInterval(interval);
  }, []);

  const maxVotes = data ? Math.max(...data.results.map((r) => Number(r.vote_count)), 1) : 1;

  return (
    <main style={{ minHeight: '100vh', padding: '1.5rem', maxWidth: '640px', margin: '0 auto' }}>
      <div style={{ paddingTop: '2.5rem', marginBottom: '2rem' }}>
        <a
          href="/"
          style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', textDecoration: 'none' }}
        >
          ← Kembali
        </a>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '1rem', lineHeight: 1.2 }}>
          Hasil <span className="gradient-text">Pemilihan</span>
        </h1>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(255,255,255,0.1)',
              borderTopColor: 'var(--color-primary-light)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto',
            }}
          />
        </div>
      )}

      {!loading && error && (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '1rem' }}>{error}</p>
        </div>
      )}

      {!loading && data && (
        <>
          {/* Ringkasan */}
          <div
            className="glass-card"
            style={{
              padding: '1.25rem 1.5rem',
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Total Suara</p>
              <p style={{ fontSize: '2rem', fontWeight: 800 }}>{data.totalVotes}</p>
            </div>
            <span
              className={`badge badge-${data.status}`}
              style={{ textTransform: 'capitalize' }}
            >
              {data.status === 'open' ? '🟢 Berlangsung' : '🏁 Selesai'}
            </span>
          </div>

          {/* Hasil per calon */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {data.results.map((r, i) => {
              const pct = data.totalVotes > 0
                ? Math.round((Number(r.vote_count) / data.totalVotes) * 100)
                : 0;
              return (
                <div
                  key={r.id}
                  className="glass-card"
                  style={{ padding: '1.25rem 1.5rem' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '0.875rem',
                      gap: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: i === 0 ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : 'rgba(255,255,255,0.08)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '999px',
                          color: i === 0 ? '#fff' : 'var(--color-text-muted)',
                        }}
                      >
                        #{i + 1}
                      </span>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: '1rem' }}>{r.name}</p>
                        {r.description && (
                          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                            {r.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: '1.5rem', fontWeight: 800 }}>{r.vote_count}</p>
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{pct}%</p>
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${(Number(r.vote_count) / maxVotes) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
