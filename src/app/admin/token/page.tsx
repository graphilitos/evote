'use client';

/**
 * Halaman generate dan ringkasan token (/admin/token).
 * Token ditampilkan SEKALI setelah generate.
 * Fitur: unduh CSV, cetak kartu token (layout A4, 8 kartu per halaman).
 */
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface TokenSummary {
  total: number;
  used: number;
  unused: number;
  batches: string[];
}

export default function AdminTokenPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<TokenSummary | null>(null);
  const [form, setForm] = useState({ count: 50, batch: '' });
  const [generatedTokens, setGeneratedTokens] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  async function fetchSummary() {
    const res = await fetch('/api/admin/tokens');
    if (res.status === 401) { router.replace('/admin/login'); return; }
    if (res.ok) setSummary(await res.json());
    setLoading(false);
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.batch.trim()) { setMsg('❌ Label batch wajib diisi.'); return; }
    setGenerating(true);
    setMsg('');
    setGeneratedTokens([]);

    const res = await fetch('/api/admin/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: form.count, batch: form.batch.trim() }),
    });

    const data = await res.json();
    setGenerating(false);

    if (!res.ok) { setMsg('❌ ' + data.error); return; }
    setGeneratedTokens(data.tokens);
    setMsg(`✅ ${data.count} token berhasil dibuat untuk batch "${form.batch}".`);
    fetchSummary();
  }

  function downloadCsv() {
    // BOM UTF-8 agar Excel Windows baca karakter khusus dengan benar
    const BOM = '\uFEFF';
    // "sep=;" memberitahu Excel pakai titik-koma sebagai pemisah kolom
    const sepHint = 'sep=;\n';
    const header = 'No;Token;Batch;Status\n';
    const rows = generatedTokens
      .map((t, i) => `${i + 1};${t};"${form.batch}";Belum Dipakai`)
      .join('\n');
    const blob = new Blob(
      [BOM + sepHint + header + rows],
      { type: 'text/csv;charset=utf-8;' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `token_${form.batch.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return <div style={{ padding: '2rem', color: 'var(--color-text-muted)' }}>Memuat...</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '900px' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>
        Generate Token
      </h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
        Buat token sekali pakai untuk dibagikan kepada pemilih.
      </p>

      {/* Ringkasan */}
      {summary && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1rem',
            marginBottom: '2rem',
          }}
        >
          {[
            { label: 'Total Token', value: summary.total, color: '#818cf8' },
            { label: 'Terpakai', value: summary.used, color: '#34d399' },
            { label: 'Belum Dipakai', value: summary.unused, color: '#fbbf24' },
          ].map((s) => (
            <div key={s.label} className="glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

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

      {/* Form generate */}
      <div className="glass-card no-print" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1rem' }}>
          Buat Token Baru
        </h2>
        <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '140px' }}>
              <label
                htmlFor="input-jumlah"
                style={{
                  display: 'block',
                  fontSize: '0.78rem',
                  color: 'var(--color-text-muted)',
                  marginBottom: '0.4rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Jumlah (1–500)
              </label>
              <input
                id="input-jumlah"
                type="number"
                min={1}
                max={500}
                className="input-field"
                value={form.count}
                onChange={(e) => setForm((f) => ({ ...f, count: Number(e.target.value) }))}
                required
              />
            </div>
            <div style={{ flex: 2, minWidth: '200px' }}>
              <label
                htmlFor="input-batch"
                style={{
                  display: 'block',
                  fontSize: '0.78rem',
                  color: 'var(--color-text-muted)',
                  marginBottom: '0.4rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Label Batch
              </label>
              <input
                id="input-batch"
                type="text"
                className="input-field"
                placeholder="cth: Batch-Oktober-2024"
                value={form.batch}
                onChange={(e) => setForm((f) => ({ ...f, batch: e.target.value }))}
                required
              />
            </div>
          </div>
          <button
            id="btn-generate"
            type="submit"
            className="btn-primary"
            disabled={generating}
            style={{ alignSelf: 'flex-start', padding: '0.625rem 1.25rem' }}
          >
            {generating ? 'Membuat...' : `🎫 Generate ${form.count} Token`}
          </button>
        </form>
      </div>

      {/* Hasil generate */}
      {generatedTokens.length > 0 && (
        <>
          {/* Tombol aksi */}
          <div
            className="no-print"
            style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}
          >
            <button id="btn-unduh-csv" className="btn-secondary" onClick={downloadCsv}
              style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
              📥 Unduh CSV
            </button>
            <button id="btn-cetak" className="btn-secondary" onClick={handlePrint}
              style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
              🖨️ Cetak Kartu
            </button>
          </div>

          {/* Tabel token (layar) */}
          <div className="glass-card no-print" style={{ overflow: 'auto', marginBottom: '1.5rem' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Token</th>
                  <th>Batch</th>
                </tr>
              </thead>
              <tbody>
                {generatedTokens.map((t, i) => (
                  <tr key={t}>
                    <td style={{ color: 'var(--color-text-muted)', width: '40px' }}>{i + 1}</td>
                    <td>
                      <code
                        style={{
                          fontFamily: 'Courier New, monospace',
                          fontSize: '1.1rem',
                          fontWeight: 700,
                          letterSpacing: '0.25em',
                          color: 'var(--color-primary-light)',
                        }}
                      >
                        {t}
                      </code>
                    </td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                      {form.batch}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Layout cetak kartu token (hanya tampil saat print) */}
          <div ref={printRef} className="print-token-grid">
            {generatedTokens.map((t, i) => (
              <div key={t} className="print-token-card">
                <p className="print-token-label">E-Voting Ketua RT</p>
                <p className="print-token-label" style={{ fontSize: '9px' }}>
                  Token Pemilihan
                </p>
                <p className="print-token-code">{t}</p>
                <p className="print-token-label">Batch: {form.batch}</p>
                <p className="print-token-label" style={{ fontSize: '8px', marginTop: '4px' }}>
                  Gunakan token ini hanya satu kali. Rahasiakan.
                </p>
                <p className="print-token-label" style={{ fontSize: '8px' }}>
                  No. {i + 1}
                </p>
              </div>
            ))}
          </div>

          <p
            className="no-print"
            style={{
              color: '#fbbf24',
              fontSize: '0.8rem',
              padding: '0.625rem 0.875rem',
              background: 'rgba(245,158,11,0.1)',
              border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            ⚠️ Token hanya ditampilkan sekali. Simpan atau cetak sekarang.
          </p>
        </>
      )}
    </div>
  );
}
