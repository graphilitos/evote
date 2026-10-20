'use client';

/**
 * Dashboard admin — bagian interaktif (kontrol status, toggle hasil publik,
 * kartu navigasi cepat ke semua fitur admin).
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
  draft: '📝 Draft',
  open: '🟢 Berlangsung',
  closed: '🏁 Selesai',
};

const STATUS_NEXT: Record<string, { label: string; next: string; danger: boolean }> = {
  draft: { label: 'Buka Pemilihan →', next: 'open', danger: false },
  open: { label: 'Tutup Pemilihan', next: 'closed', danger: true },
  closed: { label: 'Pemilihan Sudah Selesai', next: '', danger: false },
};

// Kartu navigasi cepat ke semua fitur admin
const NAV_CARDS = [
  {
    href: '/admin/calon',
    icon: '👤',
    label: 'Kelola Calon',
    desc: 'Tambah, edit, hapus nama calon',
    color: '#818cf8',
  },
  {
    href: '/admin/token',
    icon: '🎫',
    label: 'Generate Token',
    desc: 'Buat & cetak token pemilih',
    color: '#34d399',
  },
  {
    href: '/admin/hasil',
    icon: '📈',
    label: 'Lihat Hasil',
    desc: 'Grafik & tabel suara real-time',
    color: '#f472b6',
  },
];

export default function AdminDashboardClient({
  settings,
  totalTokens,
  usedTokens,
  totalVotes,
}: Props) {
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
    setMsg('✅ Status berhasil diubah ke: ' + STATUS_LABEL[data.status]);
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
    { label: 'Terpakai', value: usedTokens, icon: '✅', color: '#34d399' },
    { label: 'Tersisa', value: unusedTokens, icon: '📨', color: '#fbbf24' },
    { label: 'Total Suara', value: totalVotes, icon: '🗳️', color: '#f472b6' },
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '960px' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.35rem' }}>
        Dashboard Admin
      </h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', fontSize: '0.95rem' }}>
        E-Voting Pemilihan Ketua RT
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

      {/* ───── Navigasi Cepat ───── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        {NAV_CARDS.map((card) => (
          <a
            key={card.href}
            href={card.href}
            id={`nav-card-${card.label.toLowerCase().replace(/\s/g, '-')}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1.25rem',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background =
                'rgba(255,255,255,0.08)';
              (e.currentTarget as HTMLAnchorElement).style.borderColor =
                'rgba(255,255,255,0.2)';
              (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background =
                'rgba(255,255,255,0.04)';
              (e.currentTarget as HTMLAnchorElement).style.borderColor =
                'rgba(255,255,255,0.1)';
              (e.currentTarget as HTMLAnchorElement).style.transform = 'none';
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: `${card.color}20`,
                border: `1px solid ${card.color}40`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              {card.icon}
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '0.95rem', color: card.color }}>
                {card.label}
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                {card.desc}
              </p>
            </div>
          </a>
        ))}
      </div>

      {/* ───── Statistik ───── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
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
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>
              {card.label}
            </div>
          </div>
        ))}
      </div>

      {/* ───── Status pemilihan ───── */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1rem' }}>
          Status Pemilihan
        </h2>
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
            <span
              style={{
                padding: '0.3rem 0.75rem',
                borderRadius: '999px',
                fontSize: '0.82rem',
                fontWeight: 700,
                background:
                  status === 'open'
                    ? 'rgba(16,185,129,0.15)'
                    : status === 'draft'
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(79,70,229,0.15)',
                color:
                  status === 'open'
                    ? '#34d399'
                    : status === 'draft'
                    ? 'var(--color-text-muted)'
                    : '#818cf8',
                border: `1px solid ${
                  status === 'open'
                    ? 'rgba(16,185,129,0.3)'
                    : status === 'draft'
                    ? 'rgba(255,255,255,0.15)'
                    : 'rgba(79,70,229,0.3)'
                }`,
              }}
            >
              {STATUS_LABEL[status]}
            </span>
          </div>

          {nextAction.next &&
            (confirm === 'status' ? (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ color: '#fbbf24', fontSize: '0.85rem' }}>
                  ⚠️ Yakin? Tidak bisa dibalik.
                </span>
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
                className={nextAction.danger ? 'btn-danger' : 'btn-primary'}
                onClick={() => setConfirm('status')}
                style={{ padding: '0.625rem 1.25rem', fontSize: '0.9rem' }}
              >
                {nextAction.label}
              </button>
            ))}
        </div>

        {/* Petunjuk urutan */}
        {status === 'draft' && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              background: 'rgba(251,191,36,0.08)',
              border: '1px solid rgba(251,191,36,0.2)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.82rem',
              color: '#fde68a',
              lineHeight: 1.6,
            }}
          >
            💡 <strong>Urutan yang benar:</strong> Tambah calon → Generate token → Buka pemilihan
          </div>
        )}
      </div>

      {/* ───── Toggle hasil publik ───── */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1.5rem',
          }}
        >
          <div>
            <h2 style={{ fontWeight: 700, marginBottom: '0.25rem', fontSize: '1rem' }}>
              Tampilkan Hasil ke Publik
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
              Aktifkan agar hasil bisa dilihat di{' '}
              <code
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                }}
              >
                /hasil
              </code>{' '}
              tanpa login.
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
