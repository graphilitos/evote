'use client';

/**
 * Halaman utama pemilih: input token 8 karakter.
 * Mobile-first. Token divalidasi di server sebelum lanjut ke /pilih.
 * Token disimpan sementara di sessionStorage (dihapus setelah voting).
 * Status pemilihan dicek otomatis saat halaman dimuat.
 */
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type ElectionStatus = 'loading' | 'draft' | 'open' | 'closed' | 'unknown';

export default function HomePage() {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [electionStatus, setElectionStatus] = useState<ElectionStatus>('loading');
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

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
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
            Masukkan token yang Anda terima untuk memulai pemilihan
          </p>
        </div>

        {/* Form card */}
        <div className="glass-card" style={{ padding: '2rem' }}>
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
            marginTop: '1.5rem',
          }}
        >
          Token bersifat rahasia dan hanya bisa digunakan satu kali.
        </p>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}
