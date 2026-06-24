ALTER TABLE public.coach_memory
ADD COLUMN IF NOT EXISTS coach_tone VARCHAR(32) NOT NULL DEFAULT 'direct';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'coach_memory_coach_tone_check'
      AND conrelid = 'public.coach_memory'::regclass
  ) THEN
    ALTER TABLE public.coach_memory
    ADD CONSTRAINT coach_memory_coach_tone_check
    CHECK (coach_tone IN ('direct', 'balanced', 'firm_support'));
  END IF;
END $$;
