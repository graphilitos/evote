'use client';

/**
 * Halaman hasil suara admin (/admin/hasil).
 * Tabel + bar chart. Auto-refresh setiap 10 detik.
 * Ekspor CSV hanya berisi nama calon dan jumlah suara.
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Result {
  id: string;
  name: string;
  description: string | null;
  vote_count: number;
}

export default function AdminHasilPage() {
  const router = useRouter();
  const [results, setResults] = useState<Result[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [status, setStatus] = useState('draft');
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  async function fetchResults() {
    const res = await fetch('/api/admin/results');
    if (res.status === 401) { router.replace('/admin/login'); return; }
    if (!res.ok) return;

    const data = await res.json();
    setResults(data.results ?? []);
    setTotalVotes(data.totalVotes ?? 0);
    setStatus(data.settings?.status ?? 'draft');
    setLastUpdate(new Date());
    setLoading(false);
  }

  useEffect(() => {
    fetchResults();
    // Auto-refresh setiap 10 detik
    const interval = setInterval(fetchResults, 10000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exportCsv() {
    const header = 'Nama Calon,Jumlah Suara\n';
    const rows = results.map((r) => `"${r.name}",${r.vote_count}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hasil_voting_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const maxVotes = Math.max(...results.map((r) => Number(r.vote_count)), 1);

  if (loading) {
    return <div style={{ padding: '2rem', color: 'var(--color-text-muted)' }}>Memuat hasil...</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '900px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '0.5rem',
        }}
      >
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Hasil Suara</h1>
        <button
          id="btn-ekspor-csv"
          className="btn-secondary"
          onClick={exportCsv}
          style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
        >
          📥 Ekspor CSV
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <span className={`badge badge-${status}`}>
          {status === 'draft' ? '📝 Draft' : status === 'open' ? '🟢 Berlangsung' : '🏁 Selesai'}
        </span>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
          Total: <strong style={{ color: 'var(--color-text)' }}>{totalVotes}</strong> suara
        </span>
        {lastUpdate && (
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginLeft: 'auto' }}>
            ↻ Diperbarui: {lastUpdate.toLocaleTimeString('id-ID')}
          </span>
        )}
      </div>

      {results.length === 0 ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-muted)' }}>Belum ada suara masuk.</p>
        </div>
      ) : (
        <>
          {/* Bar chart */}
          <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontWeight: 700, marginBottom: '1.25rem', fontSize: '1rem' }}>
              Grafik Suara
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {results.map((r, i) => {
                const pct = totalVotes > 0
                  ? Math.round((Number(r.vote_count) / totalVotes) * 100)
                  : 0;
                const barWidth = (Number(r.vote_count) / maxVotes) * 100;

                return (
                  <div key={r.id}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        marginBottom: '0.4rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            background:
                              i === 0
                                ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
                                : 'rgba(255,255,255,0.08)',
                            padding: '0.15rem 0.4rem',
                            borderRadius: '999px',
                            color: i === 0 ? '#fff' : 'var(--color-text-muted)',
                          }}
                        >
                          #{i + 1}
                        </span>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.name}</span>
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--color-primary-light)' }}>
                        {r.vote_count}{' '}
                        <span style={{ color: 'var(--color-text-muted)', fontWeight: 400, fontSize: '0.8rem' }}>
                          ({pct}%)
                        </span>
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${barWidth}%` }}
                        role="progressbar"
                        aria-valuenow={Number(r.vote_count)}
                        aria-valuemin={0}
                        aria-valuemax={maxVotes}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tabel detail */}
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Peringkat</th>
                  <th>Nama Calon</th>
                  <th>Deskripsi</th>
                  <th style={{ textAlign: 'right' }}>Suara</th>
                  <th style={{ textAlign: 'right' }}>Persentase</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => {
                  const pct = totalVotes > 0
                    ? ((Number(r.vote_count) / totalVotes) * 100).toFixed(1)
                    : '0.0';
                  return (
                    <tr key={r.id}>
                      <td>
                        <span
                          style={{
                            fontWeight: 700,
                            color: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#f97316' : 'var(--color-text-muted)',
                          }}
                        >
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{r.name}</td>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                        {r.description ?? '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '1.1rem' }}>
                        {r.vote_count}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--color-text-muted)' }}>
                        {pct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
