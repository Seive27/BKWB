-- Normalize misspelled sitio labels to the official names.
-- Safe to re-run. Apply in the Supabase SQL editor on existing databases.

UPDATE public.resident_accounts
SET sitio = 'Upper Awihaw'
WHERE lower(btrim(sitio)) = 'upper awiha';

UPDATE public.resident_accounts
SET sitio = 'Upper Camparang'
WHERE lower(btrim(sitio)) = 'upper camprang';

DO $$
BEGIN
  IF to_regclass('public.sitio_assignments') IS NOT NULL THEN
    UPDATE public.sitio_assignments
    SET sitio = 'Upper Awihaw'
    WHERE lower(btrim(sitio)) = 'upper awiha';

    UPDATE public.sitio_assignments
    SET sitio = 'Upper Camparang'
    WHERE lower(btrim(sitio)) = 'upper camprang';
  END IF;
END $$;
