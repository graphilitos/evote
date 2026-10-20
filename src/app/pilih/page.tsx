'use client';

/**
 * Halaman pemilihan calon (/pilih).
 * Fitur: search nama, filter rentang usia, grid responsif, dialog konfirmasi.
 * Dirancang untuk menangani 50–100 calon dengan nyaman.
 */
import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Candidate {
  id: string;
  name: string;
  age: number | null;
  description: string | null;
}

const AGE_FILTERS = [
  { label: 'Semua Usia', min: 0, max: 999 },
  { label: '25–34 thn', min: 25, max: 34 },
  { label: '35–44 thn', min: 35, max: 44 },
  { label: '45–60 thn', min: 45, max: 60 },
];

export default function PilihPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [ageFilter, setAgeFilter] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = sessionStorage.getItem('evote_token');
    if (!token) {
      router.replace('/');
      return;
    }

    fetch('/api/vote/candidates')
      .then(async (res) => {
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setError(d.error ?? 'Gagal memuat daftar calon.');
        } else {
          const data = await res.json();
          // Acak urutan calon agar tidak ada bias posisi
          setCandidates(data.sort(() => Math.random() - 0.5));
        }
      })
      .catch(() => setError('Kesalahan jaringan. Coba muat ulang halaman.'))
      .finally(() => setLoading(false));
  }, [router]);

  const af = AGE_FILTERS[ageFilter];
  const filtered = useMemo(() => {
    return candidates.filter((c) => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
      const matchAge =
        ageFilter === 0 ||
        (c.age != null && c.age >= af.min && c.age <= af.max);
      return matchSearch && matchAge;
    });
  }, [candidates, search, ageFilter, af.min, af.max]);

  const selectedCandidate = candidates.find((c) => c.id === selected);

  async function handleVote() {
    if (!selected) return;
    const token = sessionStorage.getItem('evote_token');
    if (!token) { router.replace('/'); return; }

    setSubmitting(true);

    try {
      const res = await fetch('/api/vote/cast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, candidateId: selected }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Gagal mengirim suara. Coba lagi.');
        setConfirm(false);
        setSubmitting(false);
        return;
      }

      sessionStorage.removeItem('evote_token');
      router.replace('/sukses');
    } catch {
      setError('Kesalahan jaringan. Coba lagi.');
      setConfirm(false);
      setSubmitting(false);
    }
  }

  // ─── Loading ───
  if (loading) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--color-primary-light)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--color-text-muted)' }}>Memuat daftar calon...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </main>
    );
  }

  // ─── Error ───
  if (error && candidates.length === 0) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '380px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Tidak dapat memuat calon</h1>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>{error}</p>
          <button className="btn-secondary" onClick={() => window.location.reload()}>Muat Ulang</button>
        </div>
      </main>
    );
  }

  return (
    <>
      {/* ─── Dialog Konfirmasi ─── */}
      {confirm && selectedCandidate && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setConfirm(false); }}>
          <div className="modal-panel">
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🗳️</div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem' }}>Konfirmasi Pilihan</h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                Suara Anda bersifat final dan tidak dapat diubah.
              </p>
            </div>

            {/* Kartu calon terpilih di modal — tanpa avatar, hanya teks */}
            <div style={{ background: 'rgba(79,70,229,0.06)', border: '2px solid rgba(79,70,229,0.25)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'center' }}>
              <p style={{ fontWeight: 800, fontSize: '1.15rem', marginBottom: '0.25rem', color: 'var(--color-text)' }}>{selectedCandidate.name}</p>
              {selectedCandidate.age && (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{selectedCandidate.age} tahun</p>
              )}
              {selectedCandidate.description && (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>{selectedCandidate.description}</p>
              )}
            </div>

            {error && (
              <div role="alert" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', color: '#dc2626', fontSize: '0.875rem', marginBottom: '1rem', textAlign: 'center' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn-secondary" onClick={() => { setConfirm(false); setError(''); }} style={{ flex: 1 }} disabled={submitting}>
                Batal
              </button>
              <button id="btn-kirim-suara" className="btn-primary" onClick={handleVote} style={{ flex: 2 }} disabled={submitting}>
                {submitting
                  ? <><span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Mengirim...</>
                  : '✓ Ya, Kirim Suara Saya'}
              </button>
            </div>
          </div>
        </div>
      )}

      <main style={{ minHeight: '100vh', padding: '1.5rem 1rem 4rem' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>

          {/* ─── Header ─── */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.35rem' }}>
              Pilih <span className="gradient-text">Bakal Calon Ketua RT 01/RW 05</span>
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              {candidates.length} calon terdaftar · Pilih satu, lalu konfirmasi
            </p>
          </div>

          {/* ─── Search + Filter ─── */}
          <div
            style={{
              position: 'sticky',
              top: '0.75rem',
              zIndex: 10,
              background: 'rgba(15,15,26,0.85)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 'var(--radius-md)',
              padding: '0.875rem 1rem',
              marginBottom: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', pointerEvents: 'none' }}>🔍</span>
              <input
                ref={searchRef}
                type="text"
                className="input-field"
                placeholder="Cari nama calon..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '2.5rem', fontSize: '0.95rem' }}
                aria-label="Cari calon"
              />
              {search && (
                <button
                  onClick={() => { setSearch(''); searchRef.current?.focus(); }}
                  style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '1rem', padding: '0.25rem' }}
                  aria-label="Hapus pencarian"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter usia + counter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginRight: '0.25rem', flexShrink: 0 }}>Rentang usia:</span>
              {AGE_FILTERS.map((f, i) => (
                <button
                  key={f.label}
                  onClick={() => setAgeFilter(i)}
                  style={{
                    padding: '0.3rem 0.75rem',
                    borderRadius: '999px',
                    border: '1px solid',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    borderColor: ageFilter === i ? 'var(--color-primary-light)' : 'rgba(255,255,255,0.12)',
                    background: ageFilter === i ? 'rgba(129,140,248,0.2)' : 'transparent',
                    color: ageFilter === i ? 'var(--color-primary-light)' : 'var(--color-text-muted)',
                  }}
                  aria-pressed={ageFilter === i}
                >
                  {f.label}
                </button>
              ))}
              <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                {filtered.length} dari {candidates.length} calon
              </span>
            </div>
          </div>

          {/* ─── Error (non-fatal) ─── */}
          {error && candidates.length > 0 && (
            <div role="alert" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', color: '#fca5a5', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              {error}
            </div>
          )}

          {/* ─── Grid Calon ─── */}
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--color-text-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔍</div>
              <p>Tidak ada calon yang cocok dengan pencarian atau filter.</p>
              <button
                onClick={() => { setSearch(''); setAgeFilter(0); }}
                style={{ marginTop: '1rem', background: 'none', border: 'none', color: 'var(--color-primary-light)', cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline' }}
              >
                Reset filter
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '0.875rem',
              }}
            >
              {filtered.map((c) => {
                const isSelected = selected === c.id;
                return (
                  <button
                    key={c.id}
                    id={`candidate-${c.id}`}
                    onClick={() => setSelected(c.id)}
                    className={`candidate-card${isSelected ? ' selected' : ''}`}
                    style={{ textAlign: 'left', width: '100%', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                    aria-pressed={isSelected}
                  >
                    <div style={{ padding: '1rem' }}>
                      {/* Nama — tanpa avatar */}
                      <p style={{
                        fontWeight: 700,
                        fontSize: '0.925rem',
                        lineHeight: 1.3,
                        marginBottom: '0.3rem',
                        color: 'var(--color-text)',
                      }}>
                        {c.name}
                      </p>

                      {/* Usia + keterangan */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        {c.age != null && (
                          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                            {c.age} tahun
                          </span>
                        )}
                        {c.description && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                            {c.description}
                          </span>
                        )}
                      </div>

                      {/* Checkmark selected */}
                      {isSelected && (
                        <div style={{ marginTop: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                          <span style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(79,70,229,0.1)', border: '2px solid var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem' }}>✓</span>
                          Terpilih
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ─── Floating tombol konfirmasi ─── */}
      <div
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          padding: '1rem 1.5rem',
          background: 'rgba(15,15,26,0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          zIndex: 20,
        }}
      >
        <div style={{ minWidth: 0 }}>
          {selectedCandidate ? (
            <>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.1rem' }}>Pilihan Anda:</p>
              <p style={{ fontWeight: 700, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedCandidate.name}
                {selectedCandidate.age ? ` · ${selectedCandidate.age} thn` : ''}
              </p>
            </>
          ) : (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              Belum ada calon yang dipilih
            </p>
          )}
        </div>
        <button
          id="btn-konfirmasi"
          className="btn-primary"
          disabled={!selected}
          onClick={() => { setError(''); setConfirm(true); }}
          style={{ flexShrink: 0, padding: '0.75rem 1.5rem' }}
        >
          Konfirmasi →
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .candidate-card {
          transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1) !important;
        }
        .candidate-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 32px rgba(79,70,229,0.2);
        }
      `}</style>
    </>
  );
}
