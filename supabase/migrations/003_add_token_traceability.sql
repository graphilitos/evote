-- ============================================================
-- Migration 003: Ubah desain menjadi non-anonim
-- Tambah kolom token_code ke tabel votes.
-- Update fungsi cast_vote agar simpan token yang dipakai.
-- ============================================================

-- Langkah 1: Tambah kolom token_code ke votes
ALTER TABLE votes
  ADD COLUMN IF NOT EXISTS token_code TEXT REFERENCES tokens(code);

-- Langkah 2: Update fungsi cast_vote agar simpan token_code
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
  FROM election_settings WHERE id = 1;

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

  -- Simpan token_code bersama vote agar bisa dilacak
  INSERT INTO votes (id, candidate_id, token_code)
  VALUES (gen_random_uuid(), p_candidate_id, p_token);

  RETURN jsonb_build_object('ok', true);

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- Langkah 3: Buat view vote_details untuk halaman hasil admin
DROP VIEW IF EXISTS vote_details;
CREATE VIEW vote_details AS
  SELECT
    v.id,
    v.token_code,
    c.id   AS candidate_id,
    c.name AS candidate_name,
    c.age  AS candidate_age
  FROM votes v
  JOIN candidates c ON c.id = v.candidate_id
  ORDER BY v.token_code;
