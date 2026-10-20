'use client';

/**
 * Halaman kelola calon (/admin/calon).
 * Menggunakan field: nama + usia (wajib) + deskripsi (opsional).
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Candidate {
  id: string;
  name: string;
  age: number | null;
  description: string | null;
  created_at: string;
}

const AGE_GROUPS = [
  { label: 'Semua', min: 0, max: 999 },
  { label: '25–34', min: 25, max: 34 },
  { label: '35–44', min: 35, max: 44 },
  { label: '45–60', min: 45, max: 60 },
];

export default function AdminCalonPage() {
  const router = useRouter();
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
  const [ageGroup, setAgeGroup] = useState(0); // index ke AGE_GROUPS

  useEffect(() => { fetchAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchAll() {
    setLoadError('');
    try {
      const [cRes, sRes] = await Promise.all([
        fetch('/api/admin/candidates'),
        fetch('/api/admin/settings'),
      ]);

      if (cRes.status === 401 || sRes.status === 401) {
        router.replace('/admin/login');
        return;
      }

      if (cRes.ok) {
        setCandidates(await cRes.json());
      } else {
        const err = await cRes.json().catch(() => ({ error: `HTTP ${cRes.status}` }));
        setLoadError('Gagal memuat calon: ' + (err.error ?? cRes.status));
      }

      if (sRes.ok) {
        const s = await sRes.json();
        setElectionStatus(s.status ?? 'draft');
      } else {
        setElectionStatus('draft');
      }
    } catch (e) {
      setLoadError('Kesalahan jaringan: ' + String(e));
    } finally {
      setLoading(false);
    }
  }

  const isDraft = electionStatus === 'draft' || electionStatus === null;

  // Filter kandidat untuk tampilan admin
  const group = AGE_GROUPS[ageGroup];
  const filtered = candidates.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchAge =
      ageGroup === 0 ||
      (c.age != null && c.age >= group.min && c.age <= group.max);
    return matchSearch && matchAge;
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    setMsg('');

    try {
      const res = await fetch('/api/admin/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          age: form.age ? parseInt(form.age) : null,
          description: form.description.trim() || null,
        }),
      });

      const data = await res.json();
      setSubmitting(false);

      if (!res.ok) { setMsg('❌ ' + (data.error ?? `Error ${res.status}`)); return; }
      setCandidates((prev) => [...prev, data]);
      setForm({ name: '', age: '', description: '' });
      setMsg(`✅ ${data.name} berhasil ditambahkan.`);
    } catch {
      setSubmitting(false);
      setMsg('❌ Kesalahan jaringan saat menyimpan.');
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editId || !editForm.name.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/admin/candidates/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          age: editForm.age ? parseInt(editForm.age) : null,
          description: editForm.description.trim() || null,
        }),
      });

      const data = await res.json();
      setSubmitting(false);

      if (!res.ok) { setMsg('❌ ' + (data.error ?? `Error ${res.status}`)); return; }
      setCandidates((prev) => prev.map((c) => (c.id === editId ? data : c)));
      setEditId(null);
      setMsg('✅ Data calon berhasil diperbarui.');
    } catch {
      setSubmitting(false);
      setMsg('❌ Kesalahan jaringan saat memperbarui.');
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Hapus calon "${name}"? Tindakan tidak bisa dibatalkan.`)) return;

    try {
      const res = await fetch(`/api/admin/candidates/${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) { setMsg('❌ ' + (data.error ?? `Error ${res.status}`)); return; }
      setCandidates((prev) => prev.filter((c) => c.id !== id));
      setMsg(`✅ ${name} berhasil dihapus.`);
    } catch {
      setMsg('❌ Kesalahan jaringan saat menghapus.');
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--color-text-muted)' }}>
        <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--color-primary-light)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
        Memuat data calon...
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '900px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Kelola Calon</h1>
        <span style={{ padding: '0.3rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700, background: isDraft ? 'rgba(255,255,255,0.08)' : 'rgba(16,185,129,0.15)', color: isDraft ? 'var(--color-text-muted)' : '#34d399', border: `1px solid ${isDraft ? 'rgba(255,255,255,0.12)' : 'rgba(16,185,129,0.3)'}` }}>
          {isDraft ? '📝 Draft' : electionStatus === 'open' ? '🟢 Berlangsung' : '🏁 Selesai'}
        </span>
      </div>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
        {isDraft ? 'Tambah, ubah, atau hapus calon peserta pemilihan.' : '⚠️ Calon tidak dapat diubah setelah pemilihan dibuka.'}
      </p>

      {loadError && (
        <div role="alert" style={{ padding: '0.875rem 1rem', borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          <strong>⚠️ {loadError}</strong>
          <br /><span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Pastikan migration SQL sudah dijalankan.</span>
          <button onClick={fetchAll} style={{ marginLeft: '0.75rem', background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.875rem' }}>Coba lagi</button>
        </div>
      )}

      {msg && (
        <div role="status" style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', background: msg.startsWith('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.startsWith('✅') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, color: msg.startsWith('✅') ? '#34d399' : '#fca5a5', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          {msg}
        </div>
      )}

      {/* Form tambah */}
      {isDraft && (
        <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <h2 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1rem' }}>➕ Tambah Calon Baru</h2>
          <form onSubmit={handleAdd}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <input
                id="input-nama-calon"
                type="text"
                className="input-field"
                placeholder="Nama lengkap calon (wajib)"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                autoFocus
              />
              <input
                id="input-usia-calon"
                type="number"
                className="input-field"
                placeholder="Usia"
                value={form.age}
                onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
                min={17}
                max={100}
                style={{ width: '90px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                id="input-deskripsi-calon"
                type="text"
                className="input-field"
                placeholder="Keterangan tambahan (opsional): pekerjaan, RT asal, dll"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                style={{ flex: 1 }}
              />
              <button
                id="btn-tambah-calon"
                type="submit"
                className="btn-primary"
                disabled={submitting || !form.name.trim()}
                style={{ padding: '0.625rem 1.5rem', flexShrink: 0 }}
              >
                {submitting ? 'Menyimpan...' : '+ Tambah'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter & Search */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          className="input-field"
          placeholder="🔍 Cari nama calon..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: '160px', padding: '0.5rem 0.875rem', fontSize: '0.875rem' }}
        />
        <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
          {AGE_GROUPS.map((g, i) => (
            <button
              key={g.label}
              onClick={() => setAgeGroup(i)}
              style={{
                padding: '0.375rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                borderColor: ageGroup === i ? 'var(--color-primary-light)' : 'rgba(255,255,255,0.12)',
                background: ageGroup === i ? 'rgba(129,140,248,0.15)' : 'transparent',
                color: ageGroup === i ? 'var(--color-primary-light)' : 'var(--color-text-muted)',
              }}
            >
              {g.label}
            </button>
          ))}
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>
          {filtered.length} / {candidates.length} calon
        </span>
      </div>

      {/* Tabel calon */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            {candidates.length === 0
              ? <><div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👤</div><p>Belum ada calon. Gunakan form di atas untuk menambahkan.</p></>
              : <p>Tidak ada calon yang cocok dengan filter.</p>
            }
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>No</th>
                <th>Nama</th>
                <th style={{ width: '70px' }}>Usia</th>
                <th>Keterangan</th>
                {isDraft && <th style={{ textAlign: 'right', width: '130px' }}>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.id}>
                  <td style={{ color: 'var(--color-text-muted)' }}>{i + 1}</td>
                  <td>
                    {editId === c.id ? (
                      <form onSubmit={handleUpdate} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <input type="text" className="input-field" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                          style={{ flex: 2, minWidth: '120px', padding: '0.375rem 0.625rem', fontSize: '0.85rem' }} autoFocus />
                        <input type="number" className="input-field" value={editForm.age} onChange={(e) => setEditForm((f) => ({ ...f, age: e.target.value }))}
                          placeholder="Usia" min={17} max={100} style={{ width: '70px', padding: '0.375rem 0.625rem', fontSize: '0.85rem' }} />
                        <input type="text" className="input-field" value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                          placeholder="Keterangan" style={{ flex: 3, minWidth: '100px', padding: '0.375rem 0.625rem', fontSize: '0.85rem' }} />
                        <button type="submit" className="btn-primary" disabled={submitting} style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem' }}>Simpan</button>
                        <button type="button" className="btn-secondary" onClick={() => setEditId(null)} style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem' }}>Batal</button>
                      </form>
                    ) : (
                      <span style={{ fontWeight: 600 }}>{c.name}</span>
                    )}
                  </td>
                  <td style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                    {editId !== c.id && (c.age != null ? `${c.age} th` : '—')}
                  </td>
                  <td style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                    {editId !== c.id && (c.description ?? '—')}
                  </td>
                  {isDraft && editId !== c.id && (
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        <button id={`btn-edit-${c.id}`} className="btn-secondary"
                          onClick={() => { setEditId(c.id); setEditForm({ name: c.name, age: c.age?.toString() ?? '', description: c.description ?? '' }); }}
                          style={{ padding: '0.35rem 0.625rem', fontSize: '0.78rem' }}>Edit</button>
                        <button id={`btn-hapus-${c.id}`} className="btn-danger"
                          onClick={() => handleDelete(c.id, c.name)}
                          style={{ padding: '0.35rem 0.625rem', fontSize: '0.78rem' }}>Hapus</button>
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
