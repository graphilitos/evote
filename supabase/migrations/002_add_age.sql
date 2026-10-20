-- ============================================================
-- Migration 002: Tambah kolom usia (age) ke tabel candidates
-- Aman dijalankan pada database yang sudah ada.
-- ============================================================

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS age INTEGER CHECK (age >= 17 AND age <= 100);

-- Update view results agar ikut sertakan kolom age
CREATE OR REPLACE VIEW results AS
  SELECT
    c.id,
    c.name,
    c.age,
    c.description,
    COUNT(v.id) AS vote_count
  FROM candidates c
  LEFT JOIN votes v ON v.candidate_id = c.id
  GROUP BY c.id, c.name, c.age, c.description
  ORDER BY vote_count DESC, c.name ASC;
