-- ============================================================
-- Migration 001: Inisialisasi skema E-Voting Ketua RT
-- ============================================================

-- Extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABEL: candidates
-- ============================================================
CREATE TABLE candidates (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABEL: tokens
-- Catatan keamanan: TIDAK ada kolom waktu pemakaian agar
-- tidak bisa dikorelasikan dengan waktu pemungutan suara.
-- ============================================================
CREATE TABLE tokens (
  code        TEXT        PRIMARY KEY,          -- 8 karakter, uppercase, tanpa 0/O/1/I/L
  used        BOOLEAN     NOT NULL DEFAULT FALSE,
  batch       TEXT        NOT NULL,             -- label angkatan generate
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABEL: votes
-- Catatan keamanan KRITIS: TIDAK ada kolom token_code,
-- TIDAK ada created_at. Satu-satunya kolom data adalah
-- candidate_id sehingga suara tidak dapat dilacak ke pemilih.
-- ============================================================
CREATE TABLE votes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id  UUID NOT NULL REFERENCES candidates(id) ON DELETE RESTRICT
);

-- ============================================================
-- TABEL: election_settings
-- Hanya satu baris (id = 1).
-- ============================================================
CREATE TABLE election_settings (
  id                   INT  PRIMARY KEY DEFAULT 1,
  status               TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'open', 'closed')),
  show_results_public  BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT single_row CHECK (id = 1)
);

-- Seed satu baris default
INSERT INTO election_settings (id, status, show_results_public)
VALUES (1, 'draft', FALSE);

-- ============================================================
-- TABEL: vote_attempts
-- Menyimpan hash IP (bukan IP asli) untuk rate limiting.
-- ============================================================
CREATE TABLE vote_attempts (
  ip_hash      TEXT        NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEX untuk performa
-- ============================================================
CREATE INDEX idx_vote_attempts_ip_time
  ON vote_attempts (ip_hash, attempted_at DESC);

CREATE INDEX idx_votes_candidate
  ON votes (candidate_id);

CREATE INDEX idx_tokens_used
  ON tokens (used) WHERE used = FALSE;

-- ============================================================
-- VIEW: results
-- Menampilkan jumlah suara per calon, diurutkan terbanyak dulu.
-- Calon tanpa suara tetap muncul dengan nilai 0.
-- ============================================================
CREATE OR REPLACE VIEW results AS
  SELECT
    c.id,
    c.name,
    c.description,
    COUNT(v.id) AS vote_count
  FROM candidates c
  LEFT JOIN votes v ON v.candidate_id = c.id
  GROUP BY c.id, c.name, c.description
  ORDER BY vote_count DESC, c.name ASC;

-- ============================================================
-- FUNGSI: cast_vote (atomik, SECURITY DEFINER)
--
-- Proses voting dilakukan dalam satu transaksi:
-- 1. Cek status pemilihan = 'open'
-- 2. UPDATE token (SET used=true) hanya jika used=false
-- 3. Jika tidak ada baris terupdate → token invalid/sudah terpakai
-- 4. INSERT vote (hanya candidate_id, tanpa token, tanpa timestamp)
-- Jika INSERT gagal, transaksi rollback → token tidak hangus.
-- ============================================================
CREATE OR REPLACE FUNCTION cast_vote(p_token TEXT, p_candidate_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status  TEXT;
  v_updated INT;
BEGIN
  -- Langkah 1: Cek status pemilihan
  SELECT status INTO v_status
  FROM election_settings
  WHERE id = 1;

  IF v_status IS DISTINCT FROM 'open' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_open');
  END IF;

  -- Langkah 2: Tandai token terpakai secara atomik
  UPDATE tokens
  SET used = TRUE
  WHERE code = p_token AND used = FALSE;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- Langkah 3: Tolak jika token tidak valid atau sudah terpakai
  IF v_updated = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_token');
  END IF;

  -- Langkah 4: Rekam suara (TANPA token, TANPA timestamp)
  INSERT INTO votes (id, candidate_id)
  VALUES (gen_random_uuid(), p_candidate_id);

  RETURN jsonb_build_object('ok', true);

EXCEPTION WHEN OTHERS THEN
  -- Error di langkah 4 akan rollback seluruh transaksi,
  -- sehingga UPDATE token pada langkah 2 ikut dibatalkan.
  RAISE;
END;
$$;

-- Keamanan: Cabut hak EXECUTE dari anon dan authenticated.
-- Fungsi hanya boleh dipanggil oleh service_role melalui API server.
REVOKE EXECUTE ON FUNCTION cast_vote(TEXT, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION cast_vote(TEXT, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION cast_vote(TEXT, UUID) FROM authenticated;

-- ============================================================
-- ROW LEVEL SECURITY
-- RLS diaktifkan di SEMUA tabel. Tidak ada policy untuk
-- anon atau authenticated. Semua akses hanya lewat
-- SUPABASE_SERVICE_ROLE_KEY dari server-side API routes.
-- ============================================================
ALTER TABLE candidates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tokens           ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote_attempts    ENABLE ROW LEVEL SECURITY;

-- Tidak ada CREATE POLICY untuk anon/authenticated di sini.
-- Akses hanya melalui service_role yang bypass RLS.
