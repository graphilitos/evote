'use client';

/**
 * Halaman kelola calon (/admin/calon).
 * CRUD calon — hanya bisa diubah saat status = 'draft'.
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Candidate {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export default function AdminCalonPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [electionStatus, setElectionStatus] = useState('draft');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', description: '' });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    const [cRes, sRes] = await Promise.all([
      fetch('/api/admin/candidates'),
      fetch('/api/admin/settings'),
    ]);

    if (cRes.status === 401 || sRes.status === 401) {
      router.replace('/admin/login');
      return;
    }

    if (cRes.ok) setCandidates(await cRes.json());
    if (sRes.ok) {
      const s = await sRes.json();
      setElectionStatus(s.status);
    }
    setLoading(false);
  }

  const isDraft = electionStatus === 'draft';

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    setMsg('');

    const res = await fetch('/api/admin/candidates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) { setMsg('❌ ' + data.error); return; }
    setCandidates((prev) => [...prev, data]);
    setForm({ name: '', description: '' });
    setMsg('✅ Calon berhasil ditambahkan.');
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editId || !editForm.name.trim()) return;
    setSubmitting(true);

    const res = await fetch(`/api/admin/candidates/${editId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) { setMsg('❌ ' + data.error); return; }
    setCandidates((prev) => prev.map((c) => (c.id === editId ? data : c)));
    setEditId(null);
    setMsg('✅ Calon berhasil diperbarui.');
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus calon ini?')) return;

    const res = await fetch(`/api/admin/candidates/${id}`, { method: 'DELETE' });
    const data = await res.json();

    if (!res.ok) { setMsg('❌ ' + data.error); return; }
    setCandidates((prev) => prev.filter((c) => c.id !== id));
    setMsg('✅ Calon berhasil dihapus.');
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', color: 'var(--color-text-muted)' }}>
        Memuat...
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>
        Kelola Calon
      </h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
        {isDraft
          ? 'Tambah, ubah, atau hapus calon peserta pemilihan.'
          : '⚠️ Calon tidak dapat diubah setelah pemilihan dibuka.'}
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

      {/* Form tambah calon */}
      {isDraft && (
        <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <h2 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1rem' }}>
            Tambah Calon Baru
          </h2>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input
              id="input-nama-calon"
              type="text"
              className="input-field"
              placeholder="Nama calon (wajib)"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <input
              id="input-deskripsi-calon"
              type="text"
              className="input-field"
              placeholder="Deskripsi singkat (opsional)"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
            <button
              id="btn-tambah-calon"
              type="submit"
              className="btn-primary"
              disabled={submitting || !form.name.trim()}
              style={{ alignSelf: 'flex-start', padding: '0.625rem 1.25rem' }}
            >
              {submitting ? 'Menyimpan...' : '+ Tambah Calon'}
            </button>
          </form>
        </div>
      )}

      {/* Daftar calon */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {candidates.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Belum ada calon terdaftar.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama</th>
                <th>Deskripsi</th>
                {isDraft && <th style={{ textAlign: 'right' }}>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {candidates.map((c, i) => (
                <tr key={c.id}>
                  <td style={{ color: 'var(--color-text-muted)', width: '40px' }}>{i + 1}</td>
                  <td>
                    {editId === c.id ? (
                      <form onSubmit={handleUpdate} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <input
                          type="text"
                          className="input-field"
                          value={editForm.name}
                          onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                          style={{ flex: 1, minWidth: '120px', padding: '0.4rem 0.75rem', fontSize: '0.875rem' }}
                        />
                        <input
                          type="text"
                          className="input-field"
                          value={editForm.description}
                          onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                          placeholder="Deskripsi"
                          style={{ flex: 1, minWidth: '120px', padding: '0.4rem 0.75rem', fontSize: '0.875rem' }}
                        />
                        <button type="submit" className="btn-primary" disabled={submitting}
                          style={{ padding: '0.4rem 0.875rem', fontSize: '0.8rem' }}>
                          Simpan
                        </button>
                        <button type="button" className="btn-secondary" onClick={() => setEditId(null)}
                          style={{ padding: '0.4rem 0.875rem', fontSize: '0.8rem' }}>
                          Batal
                        </button>
                      </form>
                    ) : (
                      <span style={{ fontWeight: 600 }}>{c.name}</span>
                    )}
                  </td>
                  <td style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                    {editId !== c.id && (c.description ?? '—')}
                  </td>
                  {isDraft && editId !== c.id && (
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          id={`btn-edit-${c.id}`}
                          className="btn-secondary"
                          onClick={() => { setEditId(c.id); setEditForm({ name: c.name, description: c.description ?? '' }); }}
                          style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem' }}
                        >
                          Edit
                        </button>
                        <button
                          id={`btn-hapus-${c.id}`}
                          className="btn-danger"
                          onClick={() => handleDelete(c.id)}
                          style={{ padding: '0.375rem 0.75rem' }}
                        >
                          Hapus
                        </button>
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
