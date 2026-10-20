'use client';

/**
 * Halaman hasil suara admin (/admin/hasil).
 * Menampilkan: grafik, tabel aggregate, tabel detail token→calon.
 * Auto-refresh setiap 10 detik.
 */
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

interface Result {
  id: string;
  name: string;
  age: number | null;
  description: string | null;
  vote_count: number;
}

interface VoteDetail {
  id: string;
  token_code: string;
  candidate_id: string;
  candidate_name: string;
  candidate_age: number | null;
}

export default function AdminHasilPage() {
  const router = useRouter();
  const [results, setResults] = useState<Result[]>([]);
  const [voteDetails, setVoteDetails] = useState<VoteDetail[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [status, setStatus] = useState('draft');
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [detailSearch, setDetailSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'summary' | 'detail'>('summary');

  async function fetchResults() {
    const res = await fetch('/api/admin/results');
    if (res.status === 401) { router.replace('/admin/login'); return; }
    if (!res.ok) return;

    const data = await res.json();
    setResults(data.results ?? []);
    setVoteDetails(data.voteDetails ?? []);
    setTotalVotes(data.totalVotes ?? 0);
    setStatus(data.settings?.status ?? 'draft');
    setLastUpdate(new Date());
    setLoading(false);
  }

  useEffect(() => {
    fetchResults();
    const interval = setInterval(fetchResults, 10000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter detail berdasarkan token atau nama calon
  const filteredDetails = useMemo(() =>
    voteDetails.filter((d) =>
      d.token_code.toLowerCase().includes(detailSearch.toLowerCase()) ||
      d.candidate_name.toLowerCase().includes(detailSearch.toLowerCase())
    ),
  [voteDetails, detailSearch]);

  function exportSummaryCsv() {
    const header = 'Peringkat,Nama Calon,Usia,Jumlah Suara,Persentase\n';
    const rows = results.map((r, i) => {
      const pct = totalVotes > 0 ? ((Number(r.vote_count) / totalVotes) * 100).toFixed(1) : '0.0';
      return `${i + 1},"${r.name}",${r.age ?? ''},${r.vote_count},${pct}%`;
    }).join('\n');
    downloadBlob(header + rows, `hasil_suara_${Date.now()}.csv`);
  }

  function exportDetailCsv() {
    const header = 'Token,Calon Yang Dipilih,Usia Calon\n';
    const rows = voteDetails.map((d) =>
      `${d.token_code},"${d.candidate_name}",${d.candidate_age ?? ''}`
    ).join('\n');
    downloadBlob(header + rows, `detail_suara_${Date.now()}.csv`);
  }

  function downloadBlob(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  const maxVotes = Math.max(...results.map((r) => Number(r.vote_count)), 1);

  if (loading) {
    return (
      <div style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--color-text-muted)' }}>
        <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--color-primary-light)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
        Memuat hasil...
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '960px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Hasil Suara</h1>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button id="btn-ekspor-csv" className="btn-secondary" onClick={exportSummaryCsv} style={{ padding: '0.5rem 1rem', fontSize: '0.82rem' }}>
            📥 CSV Rekapitulasi
          </button>
          {voteDetails.length > 0 && (
            <button id="btn-ekspor-detail-csv" className="btn-secondary" onClick={exportDetailCsv} style={{ padding: '0.5rem 1rem', fontSize: '0.82rem' }}>
              📥 CSV Detail Token
            </button>
          )}
        </div>
      </div>

      {/* Meta info */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span className={`badge badge-${status}`}>
          {status === 'draft' ? '📝 Draft' : status === 'open' ? '🟢 Berlangsung' : '🏁 Selesai'}
        </span>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
          Total: <strong style={{ color: 'var(--color-text)' }}>{totalVotes}</strong> suara
        </span>
        {lastUpdate && (
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginLeft: 'auto' }}>
            ↻ {lastUpdate.toLocaleTimeString('id-ID')}
          </span>
        )}
      </div>

      {results.length === 0 ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-muted)' }}>Belum ada suara masuk.</p>
        </div>
      ) : (
        <>
          {/* Grafik */}
          <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontWeight: 700, marginBottom: '1.25rem', fontSize: '1rem' }}>Grafik Perolehan Suara</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {results.map((r, i) => {
                const pct = totalVotes > 0 ? Math.round((Number(r.vote_count) / totalVotes) * 100) : 0;
                const barWidth = (Number(r.vote_count) / maxVotes) * 100;
                return (
                  <div key={r.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, background: i === 0 ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : 'rgba(255,255,255,0.08)', padding: '0.15rem 0.4rem', borderRadius: '999px', color: i === 0 ? '#fff' : 'var(--color-text-muted)' }}>
                          #{i + 1}
                        </span>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.name}</span>
                        {r.age && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>· {r.age} thn</span>}
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--color-primary-light)' }}>
                        {r.vote_count} <span style={{ color: 'var(--color-text-muted)', fontWeight: 400, fontSize: '0.8rem' }}>({pct}%)</span>
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${barWidth}%` }} role="progressbar" aria-valuenow={Number(r.vote_count)} aria-valuemin={0} aria-valuemax={maxVotes} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tab: Rekapitulasi | Detail Token */}
          <div style={{ display: 'flex', gap: '0', marginBottom: '0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            {(['summary', 'detail'] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ padding: '0.625rem 1.25rem', border: 'none', background: 'none', cursor: 'pointer', fontWeight: activeTab === tab ? 700 : 400, fontSize: '0.875rem', color: activeTab === tab ? 'var(--color-primary-light)' : 'var(--color-text-muted)', borderBottom: activeTab === tab ? '2px solid var(--color-primary-light)' : '2px solid transparent', marginBottom: '-1px', transition: 'all 0.15s ease' }}>
                {tab === 'summary' ? `📊 Rekapitulasi (${results.length} calon)` : `🔍 Detail Token (${voteDetails.length} suara)`}
              </button>
            ))}
          </div>

          {/* Tab: Rekapitulasi */}
          {activeTab === 'summary' && (
            <div className="glass-card" style={{ overflow: 'hidden', borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Peringkat</th>
                    <th>Nama Calon</th>
                    <th>Usia</th>
                    <th>Keterangan</th>
                    <th style={{ textAlign: 'right' }}>Suara</th>
                    <th style={{ textAlign: 'right' }}>Persentase</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => {
                    const pct = totalVotes > 0 ? ((Number(r.vote_count) / totalVotes) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={r.id}>
                        <td>
                          <span style={{ fontWeight: 700, color: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#f97316' : 'var(--color-text-muted)' }}>
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{r.name}</td>
                        <td style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>{r.age ? `${r.age} thn` : '—'}</td>
                        <td style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>{r.description ?? '—'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '1.1rem' }}>{r.vote_count}</td>
                        <td style={{ textAlign: 'right', color: 'var(--color-text-muted)' }}>{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab: Detail Token */}
          {activeTab === 'detail' && (
            <div className="glass-card" style={{ overflow: 'hidden', borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
              {voteDetails.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  Belum ada data detail. Pastikan migration 003 sudah dijalankan di Supabase.
                </div>
              ) : (
                <>
                  <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="🔍 Cari token atau nama calon..."
                      value={detailSearch}
                      onChange={(e) => setDetailSearch(e.target.value)}
                      style={{ padding: '0.5rem 0.875rem', fontSize: '0.875rem' }}
                    />
                  </div>
                  <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ position: 'sticky', top: 0, background: 'var(--color-surface)', width: '36px' }}>No</th>
                          <th style={{ position: 'sticky', top: 0, background: 'var(--color-surface)' }}>Token</th>
                          <th style={{ position: 'sticky', top: 0, background: 'var(--color-surface)' }}>Calon Yang Dipilih</th>
                          <th style={{ position: 'sticky', top: 0, background: 'var(--color-surface)', width: '70px' }}>Usia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDetails.map((d, i) => (
                          <tr key={d.id}>
                            <td style={{ color: 'var(--color-text-muted)' }}>{i + 1}</td>
                            <td>
                              <code style={{ fontFamily: 'Courier New, monospace', fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.15em', color: 'var(--color-primary-light)' }}>
                                {d.token_code}
                              </code>
                            </td>
                            <td style={{ fontWeight: 600 }}>{d.candidate_name}</td>
                            <td style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                              {d.candidate_age ? `${d.candidate_age} thn` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {filteredDetails.length < voteDetails.length && (
                    <div style={{ padding: '0.5rem 1rem', fontSize: '0.78rem', color: 'var(--color-text-muted)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      Menampilkan {filteredDetails.length} dari {voteDetails.length} entri
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
