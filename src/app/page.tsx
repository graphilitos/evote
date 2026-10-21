'use client';

/**
 * Halaman utama pemilih: input token 8 karakter.
 * Mobile-first. Token divalidasi di server sebelum lanjut ke /pilih.
 * Token disimpan sementara di sessionStorage (dihapus setelah voting).
 * Status pemilihan dicek otomatis saat halaman dimuat.
 */
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';

type ElectionStatus = 'loading' | 'draft' | 'open' | 'closed' | 'unknown';

type Candidate = {
  id: number;
  name: string;
  age: number | null;
  description: string | null;
};

const AGE_FILTERS = [
  { label: 'Semua Usia', min: 0, max: 999 },
  { label: '25–34 thn', min: 25, max: 34 },
  { label: '35–44 thn', min: 35, max: 44 },
  { label: '45–60 thn', min: 45, max: 60 },
];

export default function HomePage() {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [electionStatus, setElectionStatus] = useState<ElectionStatus>('loading');
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // State modal bakal calon
  const [showCandidates, setShowCandidates] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidatesError, setCandidatesError] = useState('');
  const [previewSearch, setPreviewSearch] = useState('');
  const [previewAgeFilter, setPreviewAgeFilter] = useState(0);
  const previewSearchRef = useRef<HTMLInputElement>(null);

  const filteredPreview = useMemo(() => {
    const af = AGE_FILTERS[previewAgeFilter];
    return candidates.filter((c) => {
      const matchSearch = c.name.toLowerCase().includes(previewSearch.toLowerCase());
      const matchAge =
        previewAgeFilter === 0 ||
        (c.age != null && c.age >= af.min && c.age <= af.max);
      return matchSearch && matchAge;
    });
  }, [candidates, previewSearch, previewAgeFilter]);

  const openCandidatesModal = useCallback(async () => {
    setShowCandidates(true);
    if (candidates.length > 0) return; // sudah pernah di-fetch
    setCandidatesLoading(true);
    setCandidatesError('');
    try {
      const res = await fetch('/api/vote/candidates-preview');
      const data = await res.json();
      if (!res.ok) {
        setCandidatesError(data.error ?? 'Gagal memuat daftar bakal calon.');
      } else {
        setCandidates(data);
      }
    } catch {
      setCandidatesError('Terjadi kesalahan jaringan.');
    } finally {
      setCandidatesLoading(false);
    }
  }, [candidates.length]);

  const closeCandidatesModal = useCallback(() => {
    setShowCandidates(false);
    setPreviewSearch('');
    setPreviewAgeFilter(0);
  }, []);

  // Cek status pemilihan saat halaman dimuat
  useEffect(() => {
    fetch('/api/vote/status')
      .then((r) => r.json())
      .then((d) => setElectionStatus(d.status ?? 'unknown'))
      .catch(() => setElectionStatus('unknown'));
  }, []);

  function handleTokenChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    setToken(val);
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (token.length !== 8) {
      setError('Token harus 8 karakter.');
      inputRef.current?.focus();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/vote/validate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403) {
          setError(data.error ?? 'Pemilihan tidak sedang berlangsung.');
          setElectionStatus(data.status ?? 'unknown');
        } else if (res.status === 429) {
          setError('Terlalu banyak percobaan. Coba lagi dalam 15 menit.');
        } else {
          setError(data.error ?? 'Token tidak valid atau sudah digunakan.');
        }
        setLoading(false);
        inputRef.current?.focus();
        return;
      }

      if (data.valid) {
        sessionStorage.setItem('evote_token', token);
        router.push('/pilih');
      }
    } catch {
      setError('Terjadi kesalahan jaringan. Coba lagi.');
      setLoading(false);
    }
  }

  // Tampilan status pemilihan belum/sudah dibuka
  if (electionStatus === 'draft' || electionStatus === 'closed') {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '400px' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }} aria-hidden="true">
            {electionStatus === 'draft' ? '🕐' : '🏁'}
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>
            {electionStatus === 'draft' ? 'Pemilihan Belum Dibuka' : 'Pemilihan Telah Selesai'}
          </h1>
          <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.7, marginBottom: '2rem' }}>
            {electionStatus === 'draft'
              ? 'Pemilihan Bakal Calon Ketua RT 01/RW 05 belum dimulai. Harap menunggu informasi lebih lanjut dari panitia.'
              : 'Periode pemilihan Bakal Calon Ketua RT 01/RW 05 telah ditutup. Terima kasih atas partisipasi Anda.'}
          </p>
          {electionStatus === 'closed' && (
            <a href="/hasil" className="btn-secondary" style={{ display: 'inline-flex' }}>
              Lihat Hasil Pemilihan →
            </a>
          )}
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: '440px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '72px',
              height: '72px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              marginBottom: '1.25rem',
              fontSize: '2rem',
              boxShadow: '0 8px 32px rgba(79, 70, 229, 0.4)',
            }}
            aria-hidden="true"
          >
            🗳️
          </div>
          <h1
            className="voter-h1"
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              marginBottom: '0.5rem',
              lineHeight: 1.2,
            }}
          >
            E-Voting{' '}
            <span className="gradient-text">Bakal Calon Ketua RT 01/RW 05</span>
          </h1>
        </div>

        {/* Banner lihat bakal calon */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: '1.5rem',
            padding: '1rem 1.25rem',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: '14px',
          }}
        >
          <p style={{ margin: '0 0 0.75rem', fontSize: '1rem', lineHeight: 1.6, color: 'var(--color-text-muted)' }}>
            Sudah punya pilihan? Mau lihat nama bakal calon terlebih dahulu?
          </p>
          <button
            id="btn-lihat-calon"
            type="button"
            onClick={openCandidatesModal}
            style={{
              background: 'rgba(79, 70, 229, 0.18)',
              border: '2px solid rgba(99, 88, 255, 0.55)',
              color: '#a5b4fc',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: 'pointer',
              padding: '0.65rem 1.5rem',
              borderRadius: '10px',
              letterSpacing: '0.01em',
              transition: 'background 0.18s ease, border-color 0.18s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(79, 70, 229, 0.32)';
              e.currentTarget.style.borderColor = 'rgba(99, 88, 255, 0.85)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(79, 70, 229, 0.18)';
              e.currentTarget.style.borderColor = 'rgba(99, 88, 255, 0.55)';
            }}
          >
            👁️ Klik di sini
          </button>
        </div>

        {/* Form card */}
        <div className="glass-card voter-card-padding" style={{ padding: '2rem' }}>
          {electionStatus === 'loading' ? (
            // Loading skeleton
            <div style={{ textAlign: 'center', padding: '1.5rem' }}>
              <div
                style={{
                  width: '36px', height: '36px',
                  border: '3px solid rgba(255,255,255,0.1)',
                  borderTopColor: 'var(--color-primary-light)',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  margin: '0 auto',
                }}
              />
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <p
                style={{
                  textAlign: 'center',
                  color: 'var(--color-text-muted)',
                  fontSize: '0.95rem',
                  marginBottom: '1.25rem',
                  lineHeight: 1.6,
                }}
              >
                Masukkan token yang Anda terima untuk memulai pemilihan
              </p>

              <label
                htmlFor="token-input"
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--color-text-muted)',
                  marginBottom: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Token Pemilihan
              </label>

              <input
                ref={inputRef}
                id="token-input"
                type="text"
                className="input-field token-input"
                value={token}
                onChange={handleTokenChange}
                placeholder="XXXXXXXX"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
                disabled={loading}
                maxLength={8}
                aria-describedby={error ? 'token-error' : undefined}
                aria-invalid={!!error}
                style={{ marginBottom: '0.5rem' }}
              />

              {/* Indikator panjang token */}
              <div
                style={{
                  display: 'flex',
                  gap: '4px',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                }}
                aria-hidden="true"
              >
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: '8px',
                      height: '4px',
                      borderRadius: '2px',
                      background:
                        i < token.length
                          ? 'var(--color-primary-light)'
                          : 'rgba(255,255,255,0.15)',
                      transition: 'background 0.15s ease',
                    }}
                  />
                ))}
              </div>

              {/* Pesan error */}
              {error && (
                <div
                  id="token-error"
                  role="alert"
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.75rem 1rem',
                    color: '#fca5a5',
                    fontSize: '0.875rem',
                    marginBottom: '1.25rem',
                    textAlign: 'center',
                  }}
                >
                  {error}
                </div>
              )}

              <button
                id="btn-lanjut"
                type="submit"
                className="btn-primary"
                disabled={loading || token.length !== 8}
                style={{ width: '100%', fontSize: '1.05rem', padding: '1rem' }}
              >
                {loading ? (
                  <>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '18px',
                        height: '18px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: '#fff',
                        borderRadius: '50%',
                        animation: 'spin 0.7s linear infinite',
                      }}
                      aria-hidden="true"
                    />
                    Memeriksa...
                  </>
                ) : (
                  'Lanjut →'
                )}
              </button>
            </form>
          )}
        </div>



        <p
          style={{
            textAlign: 'center',
            color: 'var(--color-text-muted)',
            fontSize: '0.8rem',
            marginTop: '1rem',
          }}
        >
          Token bersifat rahasia dan hanya bisa digunakan satu kali.
        </p>
      </div>

      {/* ===== MODAL BAKAL CALON ===== */}
      {showCandidates && (
        <div
          id="modal-bakal-calon"
          role="dialog"
          aria-modal="true"
          aria-label="Daftar Bakal Calon"
          onClick={closeCandidatesModal}
          className="candidates-modal-overlay"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="candidates-modal-panel"
          >
            {/* Header modal */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.4rem' }}>🗳️</span>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                  Daftar Bakal Calon
                </h2>
              </div>
              <button
                id="btn-tutup-modal-calon"
                type="button"
                onClick={closeCandidatesModal}
                aria-label="Tutup"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: 'none',
                  color: 'inherit',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.15s ease',
                  flexShrink: 0,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
              >
                ✕
              </button>
            </div>

            {/* Body modal */}
            <div style={{ overflowY: 'auto', padding: '1.25rem 1.5rem', flex: 1 }}>

              {/* Kotak panduan */}
              <div
                style={{
                  background: 'rgba(79, 70, 229, 0.12)',
                  border: '1px solid rgba(99, 88, 255, 0.35)',
                  borderRadius: '12px',
                  padding: '1rem 1.125rem',
                  marginBottom: '1.25rem',
                }}
              >
                <p style={{ fontWeight: 700, fontSize: '0.95rem', margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>💡</span> Panduan sebelum memilih
                </p>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: '1.2rem',
                    color: 'var(--color-text-muted)',
                    fontSize: '0.9rem',
                    lineHeight: 1.75,
                  }}
                >
                  <li>Baca nama-nama bakal calon di bawah ini dengan seksama.</li>
                  <li>Tentukan siapa pilihan Anda, lalu <strong style={{ color: '#c4b5fd' }}>catat atau ingat namanya</strong>.</li>
                  <li>Saat memilih nanti, ketik nama tersebut di <strong style={{ color: '#c4b5fd' }}>kotak pencarian</strong> agar lebih mudah ditemukan.</li>
                </ul>
              </div>

              {candidatesLoading && (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div
                    style={{
                      width: '32px', height: '32px',
                      border: '3px solid rgba(255,255,255,0.1)',
                      borderTopColor: 'var(--color-primary-light)',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                      margin: '0 auto 0.75rem',
                    }}
                  />
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Memuat...</p>
                </div>
              )}

              {candidatesError && (
                <div
                  style={{
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '10px',
                    padding: '1rem',
                    color: '#fca5a5',
                    fontSize: '0.875rem',
                    textAlign: 'center',
                  }}
                >
                  {candidatesError}
                </div>
              )}

              {!candidatesLoading && !candidatesError && candidates.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
                  <p style={{ fontSize: '0.9rem' }}>Belum ada bakal calon yang terdaftar.</p>
                </div>
              )}

              {!candidatesLoading && candidates.length > 0 && (
                <>
                  {/* ── Search + Chip Filter ── */}
                  <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {/* Search */}
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.95rem', pointerEvents: 'none' }}>🔍</span>
                      <input
                        ref={previewSearchRef}
                        type="text"
                        className="input-field"
                        placeholder="Cari nama bakal calon..."
                        value={previewSearch}
                        onChange={(e) => setPreviewSearch(e.target.value)}
                        style={{ paddingLeft: '2.25rem', paddingRight: previewSearch ? '2.25rem' : '0.875rem', fontSize: '0.95rem' }}
                        aria-label="Cari bakal calon"
                      />
                      {previewSearch && (
                        <button
                          type="button"
                          onClick={() => { setPreviewSearch(''); previewSearchRef.current?.focus(); }}
                          style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '1rem', padding: '0.2rem' }}
                          aria-label="Hapus pencarian"
                        >✕</button>
                      )}
                    </div>

                    {/* Chip filter usia + counter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>Usia:</span>
                      {AGE_FILTERS.map((f, i) => (
                        <button
                          key={f.label}
                          type="button"
                          onClick={() => setPreviewAgeFilter(i)}
                          style={{
                            padding: '0.25rem 0.65rem',
                            borderRadius: '999px',
                            border: '1px solid',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            borderColor: previewAgeFilter === i ? 'var(--color-primary-light)' : 'rgba(255,255,255,0.12)',
                            background: previewAgeFilter === i ? 'rgba(129,140,248,0.2)' : 'transparent',
                            color: previewAgeFilter === i ? 'var(--color-primary-light)' : 'var(--color-text-muted)',
                          }}
                          aria-pressed={previewAgeFilter === i}
                        >
                          {f.label}
                        </button>
                      ))}
                      <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>
                        {filteredPreview.length}/{candidates.length} calon
                      </span>
                    </div>
                  </div>

                  {/* ── Hasil filter kosong ── */}
                  {filteredPreview.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--color-text-muted)' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
                      <p style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>Tidak ada calon yang cocok.</p>
                      <button
                        type="button"
                        onClick={() => { setPreviewSearch(''); setPreviewAgeFilter(0); }}
                        style={{ background: 'none', border: 'none', color: 'var(--color-primary-light)', cursor: 'pointer', fontSize: '0.875rem', textDecoration: 'underline' }}
                      >
                        Reset filter
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {filteredPreview.map((c, idx) => (
                        <div
                          key={c.id}
                          style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '12px',
                            padding: '1rem 1.125rem',
                            display: 'flex',
                            gap: '1rem',
                            alignItems: 'flex-start',
                          }}
                        >
                          {/* Nomor urut */}
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.95rem',
                              flexShrink: 0,
                              boxShadow: '0 4px 12px rgba(79,70,229,0.35)',
                            }}
                          >
                            {idx + 1}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontWeight: 700, fontSize: '1rem', margin: '0 0 0.2rem' }}>
                              {c.name}
                            </p>
                            {c.age != null && (
                              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0 0 0.35rem' }}>
                                Usia: {c.age} tahun
                              </p>
                            )}
                            {c.description && (
                              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.55 }}>
                                {c.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>


            {/* Footer modal */}
            <div
              style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem',
                alignItems: 'center',
              }}
            >
              <button
                id="btn-kembali-modal-calon"
                type="button"
                onClick={closeCandidatesModal}
                style={{
                  width: '100%',
                  padding: '0.85rem 1.5rem',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(79,70,229,0.4)',
                  transition: 'opacity 0.15s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                ← Kembali &amp; Masukkan Token
              </button>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>
                Data disediakan oleh panitia pemilihan.
              </p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(24px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </main>
  );
}
