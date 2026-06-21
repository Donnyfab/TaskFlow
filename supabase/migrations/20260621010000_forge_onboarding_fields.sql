BEGIN;

ALTER TABLE public.missions
    ADD COLUMN IF NOT EXISTS outcome text,
    ADD COLUMN IF NOT EXISTS obstacle text,
    ADD COLUMN IF NOT EXISTS deadline date;

COMMIT;
