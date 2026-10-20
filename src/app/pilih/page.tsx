'use client';

/**
 * Halaman pilih calon.
 * Token diambil dari sessionStorage (dikirim saat cast vote).
 * Jika tidak ada token → redirect ke halaman utama.
 * Dialog konfirmasi ditampilkan sebelum suara dikirim.
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Candidate {
  id: string;
  name: string;
  description: string | null;
}

export default function PilihPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Ambil token dari sessionStorage
    const savedToken = sessionStorage.getItem('evote_token');
    if (!savedToken) {
      router.replace('/');
      return;
    }
    setToken(savedToken);
    fetchCandidates();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchCandidates() {
    try {
      // Ambil calon dari API publik sementara (pakai results view yang tidak ada admin guard)
      // Kita buat endpoint khusus voter
      const res = await fetch('/api/vote/candidates');
      if (!res.ok) throw new Error('Gagal memuat daftar calon.');
      const data = await res.json();
      setCandidates(data);
    } catch {
      setError('Gagal memuat daftar calon. Muat ulang halaman.');
    } finally {
      setLoading(false);
    }
  }

  function handleSelectCandidate(candidate: Candidate) {
    setSelected(candidate);
    setShowConfirm(true);
  }

  async function handleConfirmVote() {
    if (!selected || !token) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/vote/cast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, candidateId: selected.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        setShowConfirm(false);
        setSubmitting(false);
        setError(data.error ?? 'Terjadi kesalahan. Silakan coba lagi.');
        return;
      }

      if (data.success) {
        // Hapus token dari sessionStorage — tidak perlu lagi setelah voting
        sessionStorage.removeItem('evote_token');
        router.replace('/sukses');
      }
    } catch {
      setShowConfirm(false);
      setSubmitting(false);
      setError('Terjadi kesalahan jaringan. Coba lagi.');
    }
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              border: '3px solid rgba(255,255,255,0.1)',
              borderTopColor: 'var(--color-primary-light)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 1rem',
            }}
          />
          <p style={{ color: 'var(--color-text-muted)' }}>Memuat daftar calon...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '1.5rem',
        paddingBottom: '4rem',
        maxWidth: '640px',
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <div style={{ paddingTop: '2rem', marginBottom: '2rem' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
          Langkah 2 dari 2
        </p>
        <h1
          style={{ fontSize: '1.6rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '0.5rem' }}
        >
          Pilih <span className="gradient-text">Calon Ketua RT</span>
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          Ketuk kartu calon pilihan Anda. Pilihan tidak bisa diubah setelah dikonfirmasi.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.875rem 1rem',
            color: '#fca5a5',
            fontSize: '0.875rem',
            marginBottom: '1.5rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Daftar calon */}
      {candidates.length === 0 ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Belum ada calon yang terdaftar.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {candidates.map((candidate, index) => (
            <button
              key={candidate.id}
              id={`candidate-${candidate.id}`}
              className={`candidate-card${selected?.id === candidate.id ? ' selected' : ''}`}
              onClick={() => handleSelectCandidate(candidate)}
              disabled={submitting}
              style={{
                width: '100%',
                textAlign: 'left',
                cursor: 'pointer',
                border: 'none',
                background: 'none',
                font: 'inherit',
              }}
              aria-pressed={selected?.id === candidate.id}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {/* Nomor urut */}
                <div
                  style={{
                    flexShrink: 0,
                    width: '52px',
                    height: '52px',
                    borderRadius: '14px',
                    background:
                      selected?.id === candidate.id
                        ? 'linear-gradient(135deg, #4f46e5, #7c3aed)'
                        : 'rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    fontWeight: 800,
                    color: selected?.id === candidate.id ? '#fff' : 'var(--color-text-muted)',
                    transition: 'all 0.25s ease',
                  }}
                >
                  {index + 1}
                </div>

                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: '1.15rem',
                      fontWeight: 700,
                      marginBottom: '0.25rem',
                      color: 'var(--color-text)',
                    }}
                  >
                    {candidate.name}
                  </div>
                  {candidate.description && (
                    <div
                      style={{
                        fontSize: '0.875rem',
                        color: 'var(--color-text-muted)',
                        lineHeight: 1.5,
                      }}
                    >
                      {candidate.description}
                    </div>
                  )}
                </div>

                {/* Checkmark jika terpilih */}
                {selected?.id === candidate.id && (
                  <div
                    style={{
                      flexShrink: 0,
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1rem',
                      color: '#fff',
                      animation: 'pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                    aria-hidden="true"
                  >
                    ✓
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Dialog konfirmasi */}
      {showConfirm && selected && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <div className="modal-panel">
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🗳️</div>
              <h2
                id="confirm-title"
                style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}
              >
                Konfirmasi Pilihan
              </h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                Anda akan memilih:
              </p>
              <div
                style={{
                  margin: '1rem 0',
                  padding: '0.875rem 1.25rem',
                  background: 'rgba(79, 70, 229, 0.15)',
                  border: '1px solid rgba(129, 140, 248, 0.3)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{selected.name}</p>
              </div>
              <p
                style={{
                  color: '#fbbf24',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  background: 'rgba(245, 158, 11, 0.1)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                }}
              >
                ⚠️ Pilihan tidak bisa diubah setelah dikonfirmasi
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                id="btn-konfirmasi"
                className="btn-primary"
                onClick={handleConfirmVote}
                disabled={submitting}
                style={{ width: '100%' }}
              >
                {submitting ? (
                  <>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: '#fff',
                        borderRadius: '50%',
                        animation: 'spin 0.7s linear infinite',
                      }}
                      aria-hidden="true"
                    />
                    Mengirim suara...
                  </>
                ) : (
                  'Ya, Konfirmasi Pilihan Saya'
                )}
              </button>
              <button
                id="btn-batal"
                className="btn-secondary"
                onClick={() => {
                  setShowConfirm(false);
                  setSelected(null);
                }}
                disabled={submitting}
                style={{ width: '100%' }}
              >
                Batalkan
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pop {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </main>
  );
}
