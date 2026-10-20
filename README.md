# E-Voting Pemilihan Ketua RT

Sistem pemungutan suara elektronik berbasis web untuk pemilihan Ketua RT, menggunakan token sekali pakai tanpa login pemilih.

**Stack:** Next.js 16 (App Router) + TypeScript + Tailwind CSS + Supabase (Postgres) + Vercel

---

## ✨ Fitur Utama

- 🗳️ Pemilih cukup masukkan token 8 karakter, pilih calon, selesai
- 🔒 Satu token = satu suara (dijamin atomik oleh fungsi Postgres)
- 👤 Tidak ada login atau akun untuk pemilih
- 📊 Hasil real-time di dashboard admin (auto-refresh 10 detik)
- 🎫 Generate token massal hingga 500 sekaligus, unduh CSV, cetak kartu A4
- 🔐 Suara tidak dapat dilacak ke pemilih (tidak ada timestamp, tidak ada referensi token di tabel votes)

---

## 🚀 Cara Deploy

### 1. Buat Project Supabase

1. Daftar di [supabase.com](https://supabase.com) → buat project baru
2. Buka **SQL Editor** di dashboard Supabase
3. Copy isi file `supabase/migrations/001_init.sql` dan jalankan
4. Verifikasi: tabel `candidates`, `tokens`, `votes`, `election_settings`, `vote_attempts` sudah terbuat
5. Buka **Settings > API**:
   - Salin **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - Salin **service_role key** (bukan anon key!) → `SUPABASE_SERVICE_ROLE_KEY`

### 2. Konfigurasi Environment

Buat file `.env.local` di root project:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...   # service_role, BUKAN anon!
ADMIN_PASSWORD=password_admin_yang_kuat_min_12_karakter
SESSION_SECRET=string_acak_minimal_32_karakter_untuk_tanda_tangan_cookie
```

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` adalah kunci rahasia penuh. Jangan pernah expose ke browser (jangan awali `NEXT_PUBLIC_`).

Generate `SESSION_SECRET` yang aman:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Jalankan Secara Lokal

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) untuk halaman pemilih.
Buka [http://localhost:3000/admin](http://localhost:3000/admin) untuk dashboard admin.

### 4. Deploy ke Vercel

1. Push kode ke GitHub/GitLab
2. Import project di [vercel.com](https://vercel.com)
3. Tambahkan environment variables di **Project Settings > Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PASSWORD`
   - `SESSION_SECRET`
4. Klik **Deploy**

---

## 🗺️ Panduan Penggunaan

### Alur Pemilih

1. Buka URL aplikasi (/)
2. Masukkan token 8 karakter yang telah diterima
3. Pilih calon dengan mengetuk kartunya
4. Konfirmasi pilihan
5. Selesai — halaman sukses ditampilkan

### Alur Admin

1. Buka `/admin` → login dengan `ADMIN_PASSWORD`
2. **Dashboard**: lihat ringkasan status dan kontrol pemilihan
3. **Calon** (`/admin/calon`): tambah/edit/hapus calon *(hanya saat status Draft)*
4. **Token** (`/admin/token`): generate token, unduh CSV, cetak kartu
5. **Dashboard → Buka Pemilihan**: ubah status dari Draft → Berlangsung
6. **Hasil** (`/admin/hasil`): pantau suara masuk real-time
7. **Dashboard → Tutup Pemilihan**: ubah status ke Selesai
8. **Dashboard → Tampilkan ke Publik**: aktifkan hasil publik di `/hasil`

### Kontrol Status Pemilihan

| Status | Deskripsi |
|--------|-----------|
| **Draft** | Pemilihan belum dibuka. Calon bisa ditambah/diubah/dihapus. |
| **Berlangsung** | Pemilihan terbuka. Pemilih bisa menggunakan token. |
| **Selesai** | Pemilihan ditutup. Tidak ada suara baru. Hasil otomatis tampil di `/hasil`. |

Transisi status **satu arah**: Draft → Berlangsung → Selesai. Tidak bisa dibalik.

---

## 🔒 Keamanan

| Mekanisme | Implementasi |
|-----------|-------------|
| No RLS public access | RLS aktif di semua tabel, tidak ada policy untuk `anon`/`authenticated` |
| Voting atomik | Fungsi Postgres `cast_vote()` dalam satu transaksi |
| Anonimitas suara | Tabel `votes` hanya berisi `id` dan `candidate_id` |
| Rate limiting | Maks 10 percobaan gagal / IP / 15 menit |
| IP privacy | IP di-hash dengan SHA-256 sebelum disimpan |
| Sesi admin | JWT HS256, cookie `httpOnly secure sameSite=strict`, kedaluwarsa 12 jam |
| Token unik | `crypto.randomBytes`, alfabet tanpa karakter membingungkan |

---

## 🧪 Menjalankan Tes

```bash
# Pastikan .env.local sudah diisi
npm run test

# Untuk tes integrasi (butuh dev server berjalan):
npm run dev &  # di terminal lain
TEST_BASE_URL=http://localhost:3000 npm run test
```

---

## 📁 Struktur File Penting

```
src/
├── app/
│   ├── page.tsx              # Input token pemilih (/)
│   ├── pilih/page.tsx        # Pilih calon
│   ├── sukses/page.tsx       # Halaman sukses
│   ├── hasil/page.tsx        # Hasil publik (/hasil)
│   ├── admin/                # Semua halaman admin
│   └── api/                  # API routes (server-only)
├── lib/
│   ├── supabase.ts           # Client Supabase (service role)
│   ├── session.ts            # Manajemen sesi admin (jose)
│   ├── token-gen.ts          # Generator token kriptografis
│   ├── rate-limit.ts         # Rate limiting berbasis DB
│   └── ip-hash.ts            # Hash IP dengan SHA-256
supabase/
└── migrations/001_init.sql   # Skema lengkap database
tests/
├── concurrent-vote.test.ts   # Tes concurrency token
├── vote-anonymity.test.ts    # Tes skema tabel votes
└── admin-auth.test.ts        # Tes guard autentikasi admin
```
