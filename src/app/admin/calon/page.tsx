'use client';

/**
 * Halaman kelola calon (/admin/calon).
 * Fitur: CRUD manual, import CSV, filter usia, search nama.
 * Format CSV: nama,usia  atau  nama,usia,keterangan  (header opsional)
 */
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Candidate {
  id: string;
  name: string;
  age: number | null;
  description: string | null;
  created_at: string;
}

interface CsvPreviewRow {
  name: string;
  age: number | null;
  description: string | null;
  valid: boolean;
  error?: string;
}

const AGE_GROUPS = [
  { label: 'Semua', min: 0, max: 999 },
  { label: '25–34', min: 25, max: 34 },
  { label: '35–44', min: 35, max: 44 },
  { label: '45–60', min: 45, max: 60 },
];

/** Parse CSV sederhana: koma atau titik-koma sebagai delimiter */
function parseCsv(text: string): CsvPreviewRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  // Deteksi delimiter
  const delim = lines[0].includes(';') ? ';' : ',';

  // Hapus baris header jika baris pertama tidak ada angka usia
  const firstCols = lines[0].split(delim);
  const hasHeader =
    firstCols.length >= 2 &&
    (firstCols[0].toLowerCase().includes('nama') ||
      firstCols[1].toLowerCase().includes('usia') ||
      isNaN(Number(firstCols[1].trim())));

  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines.map((line, i) => {
    const cols = line.split(delim).map((c) => c.trim().replace(/^["']|["']$/g, ''));
    const name = cols[0] ?? '';
    const ageRaw = cols[1] ?? '';
    const description = cols[2] ?? null;

    if (!name) {
      return { name: '', age: null, description: null, valid: false, error: `Baris ${i + 1}: nama kosong` };
    }

    const age = ageRaw ? parseInt(ageRaw, 10) : null;
    if (ageRaw && (isNaN(age!) || age! < 17 || age! > 100)) {
      return { name, age: null, description, valid: false, error: `Usia "${ageRaw}" tidak valid` };
    }

    return { name, age, description: description || null, valid: true };
  });
}

export default function AdminCalonPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [electionStatus, setElectionStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState({ name: '', age: '', description: '' });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', age: '', description: '' });
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [ageGroup, setAgeGroup] = useState(0);

  // CSV import state
  const [csvPreview, setCsvPreview] = useState<CsvPreviewRow[] | null>(null);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvImporting, setCsvImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => { fetchAll(); }, []); // eslint-disable-line

  async function fetchAll() {
    setLoadError('');
    try {
      const [cRes, sRes] = await Promise.all([
        fetch('/api/admin/candidates'),
        fetch('/api/admin/settings'),
      ]);
      if (cRes.status === 401 || sRes.status === 401) { router.replace('/admin/login'); return; }
      if (cRes.ok) setCandidates(await cRes.json());
      else {
        const err = await cRes.json().catch(() => ({ error: `HTTP ${cRes.status}` }));
        setLoadError('Gagal memuat calon: ' + (err.error ?? cRes.status));
      }
      setElectionStatus(sRes.ok ? (await sRes.json()).status ?? 'draft' : 'draft');
    } catch (e) {
      setLoadError('Kesalahan jaringan: ' + String(e));
    } finally {
      setLoading(false);
    }
  }

  const isDraft = electionStatus === 'draft' || electionStatus === null;

  const group = AGE_GROUPS[ageGroup];
  const filtered = candidates.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchAge = ageGroup === 0 || (c.age != null && c.age >= group.min && c.age <= group.max);
    return matchSearch && matchAge;
  });

  // ── Tambah manual ──
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true); setMsg('');
    try {
      const res = await fetch('/api/admin/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), age: form.age ? parseInt(form.age) : null, description: form.description.trim() || null }),
      });
      const data = await res.json();
      setSubmitting(false);
      if (!res.ok) { setMsg('❌ ' + (data.error ?? `Error ${res.status}`)); return; }
      setCandidates((prev) => [...prev, data]);
      setForm({ name: '', age: '', description: '' });
      setMsg(`✅ ${data.name} berhasil ditambahkan.`);
    } catch { setSubmitting(false); setMsg('❌ Kesalahan jaringan.'); }
  }

  // ── Edit ──
  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editId || !editForm.name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/candidates/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editForm.name.trim(), age: editForm.age ? parseInt(editForm.age) : null, description: editForm.description.trim() || null }),
      });
      const data = await res.json();
      setSubmitting(false);
      if (!res.ok) { setMsg('❌ ' + (data.error ?? `Error ${res.status}`)); return; }
      setCandidates((prev) => prev.map((c) => (c.id === editId ? data : c)));
      setEditId(null); setMsg('✅ Data calon diperbarui.');
    } catch { setSubmitting(false); setMsg('❌ Kesalahan jaringan.'); }
  }

  // ── Hapus ──
  async function handleDelete(id: string, name: string) {
    if (!confirm(`Hapus "${name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/candidates/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { setMsg('❌ ' + (data.error ?? `Error ${res.status}`)); return; }
      setCandidates((prev) => prev.filter((c) => c.id !== id));
      setMsg(`✅ ${name} dihapus.`);
    } catch { setMsg('❌ Kesalahan jaringan.'); }
  }

  // ── Parse file CSV ──
  function handleFile(file: File) {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setMsg('❌ File harus berformat .csv atau .txt');
      return;
    }
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvPreview(parseCsv(text));
    };
    reader.readAsText(file, 'UTF-8');
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }

  // Drag & drop
  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  // ── Import CSV ke server ──
  async function handleImport() {
    if (!csvPreview) return;
    const valid = csvPreview.filter((r) => r.valid);
    if (valid.length === 0) { setMsg('❌ Tidak ada baris valid untuk diimport.'); return; }

    setCsvImporting(true); setMsg('');
    try {
      const res = await fetch('/api/admin/candidates/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidates: valid }),
      });
      const data = await res.json();
      setCsvImporting(false);
      if (!res.ok) { setMsg('❌ ' + (data.error ?? `Error ${res.status}`)); return; }
      setCsvPreview(null); setCsvFileName('');
      await fetchAll();
      setMsg(`✅ Berhasil import ${data.imported} calon dari CSV.`);
    } catch { setCsvImporting(false); setMsg('❌ Kesalahan jaringan saat import.'); }
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--color-text-muted)' }}>
        <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--color-primary-light)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
        Memuat...
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const invalidCsvRows = csvPreview?.filter((r) => !r.valid) ?? [];
  const validCsvRows = csvPreview?.filter((r) => r.valid) ?? [];

  return (
    <div style={{ padding: '2rem', maxWidth: '960px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Kelola Calon</h1>
        <span style={{ padding: '0.3rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700, background: isDraft ? 'rgba(255,255,255,0.08)' : 'rgba(16,185,129,0.15)', color: isDraft ? 'var(--color-text-muted)' : '#34d399', border: `1px solid ${isDraft ? 'rgba(255,255,255,0.12)' : 'rgba(16,185,129,0.3)'}` }}>
          {isDraft ? '📝 Draft' : electionStatus === 'open' ? '🟢 Berlangsung' : '🏁 Selesai'}
        </span>
      </div>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
        {isDraft ? 'Tambah manual atau import dari CSV. Edit & hapus tersedia selama status Draft.' : '⚠️ Calon tidak dapat diubah setelah pemilihan dibuka.'}
      </p>

      {/* Error load */}
      {loadError && (
        <div role="alert" style={{ padding: '0.875rem 1rem', borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          ⚠️ {loadError}
          <button onClick={fetchAll} style={{ marginLeft: '0.75rem', background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.875rem' }}>Coba lagi</button>
        </div>
      )}

      {/* Pesan aksi */}
      {msg && (
        <div role="status" style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', background: msg.startsWith('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.startsWith('✅') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, color: msg.startsWith('✅') ? '#34d399' : '#fca5a5', marginBottom: '1.5rem', fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{msg}</span>
          <button onClick={() => setMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '1rem', opacity: 0.7 }}>✕</button>
        </div>
      )}

      {isDraft && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '2rem' }}>

          {/* ── Tambah manual ── */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.95rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ✏️ Tambah Manual
            </h2>
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <input id="input-nama-calon" type="text" className="input-field" placeholder="Nama lengkap (wajib)" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required style={{ fontSize: '0.9rem' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <input id="input-usia-calon" type="number" className="input-field" placeholder="Usia" value={form.age} onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))} min={17} max={100} style={{ fontSize: '0.9rem' }} />
                <input type="text" className="input-field" placeholder="Keterangan (opsional)" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} style={{ fontSize: '0.9rem' }} />
              </div>
              <button id="btn-tambah-calon" type="submit" className="btn-primary" disabled={submitting || !form.name.trim()} style={{ padding: '0.625rem', fontSize: '0.875rem' }}>
                {submitting ? 'Menyimpan...' : '+ Tambah Calon'}
              </button>
            </form>
          </div>

          {/* ── Import CSV ── */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.95rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              📂 Import CSV
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.875rem', lineHeight: 1.5 }}>
              Format: <code style={{ background: 'rgba(255,255,255,0.07)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>nama,usia,keterangan</code>
              <br />Baris header opsional. Koma atau titik-koma.
            </p>

            {/* Drop zone */}
            <div
              ref={dropRef}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? 'var(--color-primary-light)' : 'rgba(255,255,255,0.15)'}`,
                borderRadius: 'var(--radius-sm)',
                padding: '1.25rem',
                textAlign: 'center',
                cursor: 'pointer',
                background: dragOver ? 'rgba(129,140,248,0.08)' : 'transparent',
                transition: 'all 0.2s ease',
                marginBottom: '0.75rem',
                fontSize: '0.85rem',
                color: 'var(--color-text-muted)',
              }}
            >
              {csvFileName ? (
                <><span style={{ color: 'var(--color-primary-light)', fontWeight: 600 }}>📄 {csvFileName}</span><br /><span style={{ fontSize: '0.75rem' }}>Klik untuk ganti file</span></>
              ) : (
                <><span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.4rem' }}>📁</span>Drag &amp; drop CSV atau klik untuk pilih</>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={handleFileInput} />

            {/* Contoh format */}
            <details style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              <summary style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>Lihat contoh format CSV</summary>
              <pre style={{ background: 'rgba(255,255,255,0.05)', padding: '0.625rem', borderRadius: '6px', fontSize: '0.72rem', lineHeight: 1.6, overflow: 'auto' }}>
{`nama,usia,keterangan
Budi Santoso,45,Wiraswasta
Siti Rahayu,38,Ibu Rumah Tangga
Agus Wijaya,52,PNS
Dewi Lestari,31`}
              </pre>
            </details>
          </div>
        </div>
      )}

      {/* ── Preview CSV ── */}
      {csvPreview && (
        <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem', border: '1px solid rgba(129,140,248,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>
                Preview CSV — {csvFileName}
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                <span style={{ color: '#34d399' }}>✓ {validCsvRows.length} valid</span>
                {invalidCsvRows.length > 0 && <span style={{ color: '#fca5a5', marginLeft: '0.75rem' }}>✕ {invalidCsvRows.length} error</span>}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn-secondary" onClick={() => { setCsvPreview(null); setCsvFileName(''); }} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                Batal
              </button>
              <button
                id="btn-import-csv"
                className="btn-primary"
                onClick={handleImport}
                disabled={csvImporting || validCsvRows.length === 0}
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
              >
                {csvImporting ? 'Mengimport...' : `Import ${validCsvRows.length} Calon`}
              </button>
            </div>
          </div>

          {/* Tabel preview */}
          <div style={{ maxHeight: '300px', overflow: 'auto', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <table className="data-table" style={{ fontSize: '0.82rem' }}>
              <thead>
                <tr>
                  <th style={{ position: 'sticky', top: 0, background: 'var(--color-surface)', width: '30px' }}>#</th>
                  <th style={{ position: 'sticky', top: 0, background: 'var(--color-surface)' }}>Nama</th>
                  <th style={{ position: 'sticky', top: 0, background: 'var(--color-surface)', width: '60px' }}>Usia</th>
                  <th style={{ position: 'sticky', top: 0, background: 'var(--color-surface)' }}>Keterangan</th>
                  <th style={{ position: 'sticky', top: 0, background: 'var(--color-surface)', width: '80px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {csvPreview.map((row, i) => (
                  <tr key={i} style={{ background: row.valid ? 'transparent' : 'rgba(239,68,68,0.05)' }}>
                    <td style={{ color: 'var(--color-text-muted)' }}>{i + 1}</td>
                    <td style={{ fontWeight: 600, color: row.valid ? 'inherit' : '#fca5a5' }}>{row.name || '—'}</td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{row.age ?? '—'}</td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{row.description ?? '—'}</td>
                    <td>
                      {row.valid
                        ? <span style={{ color: '#34d399', fontSize: '0.75rem' }}>✓ OK</span>
                        : <span style={{ color: '#fca5a5', fontSize: '0.72rem' }}>✕ {row.error}</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Filter & Search ── */}
      <div style={{ display: 'flex', gap: '0.625rem', marginBottom: '0.875rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" className="input-field" placeholder="🔍 Cari nama calon..." value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: '160px', padding: '0.5rem 0.875rem', fontSize: '0.875rem' }} />
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {AGE_GROUPS.map((g, i) => (
            <button key={g.label} onClick={() => setAgeGroup(i)} style={{ padding: '0.375rem 0.625rem', borderRadius: 'var(--radius-sm)', border: '1px solid', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', borderColor: ageGroup === i ? 'var(--color-primary-light)' : 'rgba(255,255,255,0.12)', background: ageGroup === i ? 'rgba(129,140,248,0.15)' : 'transparent', color: ageGroup === i ? 'var(--color-primary-light)' : 'var(--color-text-muted)' }}>
              {g.label}
            </button>
          ))}
        </div>
        <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>{filtered.length}/{candidates.length}</span>
      </div>

      {/* ── Tabel calon ── */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            {candidates.length === 0
              ? <><div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👤</div><p>Belum ada calon. Tambah manual atau import CSV.</p></>
              : <p>Tidak ada calon yang cocok.</p>}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '36px' }}>No</th>
                <th>Nama</th>
                <th style={{ width: '70px' }}>Usia</th>
                <th>Keterangan</th>
                {isDraft && <th style={{ textAlign: 'right', width: '120px' }}>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.id}>
                  <td style={{ color: 'var(--color-text-muted)' }}>{i + 1}</td>
                  <td>
                    {editId === c.id ? (
                      <form onSubmit={handleUpdate} style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <input type="text" className="input-field" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} style={{ flex: 2, minWidth: '110px', padding: '0.35rem 0.6rem', fontSize: '0.82rem' }} autoFocus />
                        <input type="number" className="input-field" value={editForm.age} onChange={(e) => setEditForm((f) => ({ ...f, age: e.target.value }))} placeholder="Usia" min={17} max={100} style={{ width: '64px', padding: '0.35rem 0.5rem', fontSize: '0.82rem' }} />
                        <input type="text" className="input-field" value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} placeholder="Keterangan" style={{ flex: 3, minWidth: '90px', padding: '0.35rem 0.6rem', fontSize: '0.82rem' }} />
                        <button type="submit" className="btn-primary" disabled={submitting} style={{ padding: '0.35rem 0.625rem', fontSize: '0.78rem' }}>Simpan</button>
                        <button type="button" className="btn-secondary" onClick={() => setEditId(null)} style={{ padding: '0.35rem 0.625rem', fontSize: '0.78rem' }}>Batal</button>
                      </form>
                    ) : <span style={{ fontWeight: 600 }}>{c.name}</span>}
                  </td>
                  <td style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>{editId !== c.id && (c.age != null ? `${c.age} th` : '—')}</td>
                  <td style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>{editId !== c.id && (c.description ?? '—')}</td>
                  {isDraft && editId !== c.id && (
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                        <button id={`btn-edit-${c.id}`} className="btn-secondary" onClick={() => { setEditId(c.id); setEditForm({ name: c.name, age: c.age?.toString() ?? '', description: c.description ?? '' }); }} style={{ padding: '0.3rem 0.55rem', fontSize: '0.75rem' }}>Edit</button>
                        <button id={`btn-hapus-${c.id}`} className="btn-danger" onClick={() => handleDelete(c.id, c.name)} style={{ padding: '0.3rem 0.55rem', fontSize: '0.75rem' }}>Hapus</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
