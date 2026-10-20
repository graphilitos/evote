'use client';

/**
 * Dashboard admin — bagian interaktif (kontrol status, toggle hasil publik).
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Settings {
  status: string;
  show_results_public: boolean;
}

interface Props {
  settings: Settings | null;
  totalTokens: number;
  usedTokens: number;
  totalVotes: number;
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  open: 'Berlangsung',
  closed: 'Selesai',
};

const STATUS_NEXT: Record<string, { label: string; next: string }> = {
  draft: { label: 'Buka Pemilihan →', next: 'open' },
  open: { label: 'Tutup Pemilihan', next: 'closed' },
  closed: { label: 'Pemilihan Selesai', next: '' },
};

export default function AdminDashboardClient({ settings, totalTokens, usedTokens, totalVotes }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(settings?.status ?? 'draft');
  const [showPublic, setShowPublic] = useState(settings?.show_results_public ?? false);
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const nextAction = STATUS_NEXT[status];
  const unusedTokens = totalTokens - usedTokens;

  async function handleStatusChange() {
    if (!nextAction?.next) return;
    setLoading(true);
    setMsg('');

    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextAction.next }),
    });

    const data = await res.json();
    setLoading(false);
    setConfirm('');

    if (!res.ok) {
      setMsg('❌ ' + (data.error ?? 'Gagal mengubah status.'));
      return;
    }

    setStatus(data.status);
    setMsg('✅ Status berhasil diubah.');
    router.refresh();
  }

  async function handleTogglePublic() {
    const newVal = !showPublic;
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ show_results_public: newVal }),
    });
    if (res.ok) setShowPublic(newVal);
  }

  const statCards = [
    { label: 'Total Token', value: totalTokens, icon: '🎫', color: '#818cf8' },
    { label: 'Token Terpakai', value: usedTokens, icon: '✅', color: '#34d399' },
    { label: 'Token Tersisa', value: unusedTokens, icon: '📨', color: '#fbbf24' },
    { label: 'Total Suara', value: totalVotes, icon: '🗳️', color: '#f472b6' },
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '900px' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>
        Dashboard
      </h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
        Ringkasan status pemilihan Ketua RT
      </p>

      {msg && (
        <div
          role="status"
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            background: msg.startsWith('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${msg.startsWith('✅') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: msg.startsWith('✅') ? '#34d399' : '#fca5a5',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
          }}
        >
          {msg}
        </div>
      )}

      {/* Stat cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        {statCards.map((card) => (
          <div
            key={card.label}
            className="glass-card"
            style={{ padding: '1.25rem', textAlign: 'center' }}
          >
            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }} aria-hidden="true">
              {card.icon}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: card.color }}>
              {card.value}
            </div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
              {card.label}
            </div>
          </div>
        ))}
      </div>

      {/* Status control */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontWeight: 700, marginBottom: '1rem' }}>Kontrol Status</h2>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              Status saat ini:
            </span>
            <span className={`badge badge-${status}`}>{STATUS_LABEL[status]}</span>
          </div>

          {nextAction.next && (
            confirm === 'status' ? (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ color: '#fbbf24', fontSize: '0.85rem' }}>Yakin?</span>
                <button
                  id="btn-confirm-status"
                  className="btn-primary"
                  onClick={handleStatusChange}
                  disabled={loading}
                  style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                >
                  {loading ? 'Memproses...' : 'Ya, Lanjutkan'}
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setConfirm('')}
                  style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                >
                  Batal
                </button>
              </div>
            ) : (
              <button
                id="btn-change-status"
                className={status === 'open' ? 'btn-danger' : 'btn-primary'}
                onClick={() => setConfirm('status')}
                style={{ padding: '0.625rem 1.25rem', fontSize: '0.9rem' }}
              >
                {nextAction.label}
              </button>
            )
          )}
        </div>
      </div>

      {/* Toggle hasil publik */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Tampilkan Hasil ke Publik</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              Aktifkan agar hasil bisa dilihat di halaman <code>/hasil</code> tanpa login.
            </p>
          </div>
          <button
            id="btn-toggle-public"
            onClick={handleTogglePublic}
            style={{
              flexShrink: 0,
              width: '52px',
              height: '28px',
              borderRadius: '999px',
              background: showPublic
                ? 'linear-gradient(135deg, #4f46e5, #7c3aed)'
                : 'rgba(255,255,255,0.12)',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.2s ease',
            }}
            role="switch"
            aria-checked={showPublic}
            aria-label="Toggle tampilkan hasil publik"
          >
            <span
              style={{
                position: 'absolute',
                top: '4px',
                left: showPublic ? '26px' : '4px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#fff',
                transition: 'left 0.2s ease',
                boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
              }}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
