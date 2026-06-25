-- Forge accountability metadata.
-- Adds the fields needed to track why a commitment matters, what proof is required,
-- how far it progressed, and how output proof was reviewed.

ALTER TABLE commitments
  ADD COLUMN IF NOT EXISTS why_it_matters TEXT,
  ADD COLUMN IF NOT EXISTS proof_required TEXT NOT NULL DEFAULT 'Written proof of what exists now.',
  ADD COLUMN IF NOT EXISTS proof_level VARCHAR(16) NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS progress VARCHAR(32) NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS last_followup_at TIMESTAMP NULL;

ALTER TABLE outputs
  ADD COLUMN IF NOT EXISTS proof_level VARCHAR(16) NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS proof_url TEXT,
  ADD COLUMN IF NOT EXISTS review_status VARCHAR(32) NOT NULL DEFAULT 'logged',
  ADD COLUMN IF NOT EXISTS coach_feedback TEXT;

ALTER TABLE coach_memory
  ADD COLUMN IF NOT EXISTS coach_stage VARCHAR(32) NOT NULL DEFAULT 'beginner',
  ADD COLUMN IF NOT EXISTS communication_style VARCHAR(32) NOT NULL DEFAULT 'normal';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'commitments_proof_level_check'
  ) THEN
    ALTER TABLE commitments
      ADD CONSTRAINT commitments_proof_level_check
      CHECK (proof_level IN ('low', 'medium', 'high'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'commitments_progress_check'
  ) THEN
    ALTER TABLE commitments
      ADD CONSTRAINT commitments_progress_check
      CHECK (progress IN ('not_started', 'in_progress', 'blocked', 'done'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'outputs_proof_level_check'
  ) THEN
    ALTER TABLE outputs
      ADD CONSTRAINT outputs_proof_level_check
      CHECK (proof_level IN ('low', 'medium', 'high'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'outputs_review_status_check'
  ) THEN
    ALTER TABLE outputs
      ADD CONSTRAINT outputs_review_status_check
      CHECK (review_status IN ('logged', 'accepted', 'needs_review'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coach_memory_stage_check'
  ) THEN
    ALTER TABLE coach_memory
      ADD CONSTRAINT coach_memory_stage_check
      CHECK (coach_stage IN ('beginner', 'intermediate', 'advanced', 'burned_out', 'consistent'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coach_memory_communication_style_check'
  ) THEN
    ALTER TABLE coach_memory
      ADD CONSTRAINT coach_memory_communication_style_check
      CHECK (communication_style IN ('short', 'normal', 'detailed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_commitments_user_deadline_status
  ON commitments (user_id, status, deadline);

CREATE INDEX IF NOT EXISTS idx_outputs_user_logged_at
  ON outputs (user_id, logged_at DESC);
