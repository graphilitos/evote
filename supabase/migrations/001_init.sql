-- ============================================================
-- Migration 001 (SAFE RE-RUN): Inisialisasi skema E-Voting Ketua RT
-- Aman dijalankan berkali-kali — semua CREATE pakai IF NOT EXISTS
-- ============================================================

-- Extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABEL: candidates
-- ============================================================
CREATE TABLE IF NOT EXISTS candidates (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABEL: tokens
-- ============================================================
CREATE TABLE IF NOT EXISTS tokens (
  code        TEXT        PRIMARY KEY,
  used        BOOLEAN     NOT NULL DEFAULT FALSE,
  batch       TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABEL: votes
-- Tidak ada kolom token/timestamp — privasi pemilih terjamin.
-- ============================================================
CREATE TABLE IF NOT EXISTS votes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id  UUID NOT NULL REFERENCES candidates(id) ON DELETE RESTRICT
);

-- ============================================================
-- TABEL: election_settings (hanya 1 baris, id = 1)
-- ============================================================
CREATE TABLE IF NOT EXISTS election_settings (
  id                   INT  PRIMARY KEY DEFAULT 1,
  status               TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'open', 'closed')),
  show_results_public  BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT single_row CHECK (id = 1)
);

-- Seed baris default (abaikan jika sudah ada)
INSERT INTO election_settings (id, status, show_results_public)
VALUES (1, 'draft', FALSE)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- TABEL: vote_attempts (rate limiting by IP hash)
-- ============================================================
CREATE TABLE IF NOT EXISTS vote_attempts (
  ip_hash      TEXT        NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEX untuk performa (IF NOT EXISTS aman di Postgres 9.5+)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_vote_attempts_ip_time
  ON vote_attempts (ip_hash, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_votes_candidate
  ON votes (candidate_id);

CREATE INDEX IF NOT EXISTS idx_tokens_used
  ON tokens (used) WHERE used = FALSE;

-- ============================================================
-- VIEW: results — suara per calon, sorted terbanyak
-- CREATE OR REPLACE aman dijalankan ulang
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
-- CREATE OR REPLACE aman dijalankan ulang
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
  SELECT status INTO v_status
  FROM election_settings
  WHERE id = 1;

  IF v_status IS DISTINCT FROM 'open' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_open');
  END IF;

  UPDATE tokens
  SET used = TRUE
  WHERE code = p_token AND used = FALSE;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_token');
  END IF;

  INSERT INTO votes (id, candidate_id)
  VALUES (gen_random_uuid(), p_candidate_id);

  RETURN jsonb_build_object('ok', true);

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- Cabut hak EXECUTE dari anon/authenticated
REVOKE EXECUTE ON FUNCTION cast_vote(TEXT, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION cast_vote(TEXT, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION cast_vote(TEXT, UUID) FROM authenticated;

-- ============================================================
-- ROW LEVEL SECURITY
-- Aktifkan di semua tabel — tidak ada policy untuk anon.
-- Semua akses hanya lewat service_role dari server-side.
-- ============================================================
ALTER TABLE candidates        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tokens            ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote_attempts     ENABLE ROW LEVEL SECURITY;
