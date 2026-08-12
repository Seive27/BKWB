-- Sitio support for meter reading assignment by coverage area.
-- Safe to re-run. Apply in the Supabase SQL editor if the full migration
-- has already been applied previously.

ALTER TABLE public.resident_accounts ADD COLUMN IF NOT EXISTS sitio TEXT;

CREATE INDEX IF NOT EXISTS idx_resident_accounts_sitio ON public.resident_accounts (sitio);

-- Backfill missing sitios across the official Kalunasan coverage areas.
UPDATE public.resident_accounts ra
SET sitio = s.name
FROM (
  SELECT
    id,
    (row_number() OVER (ORDER BY account_number) - 1) % 20 AS idx
  FROM public.resident_accounts
  WHERE sitio IS NULL OR btrim(sitio) = ''
) mapped
JOIN (
  VALUES
    (0, 'Back Crisanto'),
    (1, 'Ellena Homes'),
    (2, 'Lariha'),
    (3, 'Lokana'),
    (4, 'Lower Awihaw'),
    (5, 'Lower Camparang'),
    (6, 'Lower Kalunasan'),
    (7, 'Mountain View Village'),
    (8, 'Pang Pang Lanog'),
    (9, 'San Jose Ville'),
    (10, 'San Marcelo'),
    (11, 'Sobusteha'),
    (12, 'Unit 2'),
    (13, 'Unit 3'),
    (14, 'Unit 4'),
    (15, 'Unit 5'),
    (16, 'Upper Awiha'),
    (17, 'Upper Camprang'),
    (18, 'Upper Kalunasan'),
    (19, 'Valle Estrella')
) AS s(idx, name) ON s.idx = mapped.idx
WHERE ra.id = mapped.id;
