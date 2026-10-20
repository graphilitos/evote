-- Langkah 1: Tambah kolom usia ke tabel candidates
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS age INTEGER CHECK (age >= 17 AND age <= 100);

-- Langkah 2: Hapus view lama lalu buat ulang dengan kolom age
-- (CREATE OR REPLACE tidak bisa mengubah urutan kolom yang sudah ada)
DROP VIEW IF EXISTS results;

CREATE VIEW results AS
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
