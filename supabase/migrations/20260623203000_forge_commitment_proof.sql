BEGIN;

ALTER TABLE public.commitments
    ADD COLUMN IF NOT EXISTS checkin_outcome text
        CHECK (checkin_outcome IN ('kept', 'missed', 'partial'));

ALTER TABLE public.outputs
    ADD COLUMN IF NOT EXISTS commitment_id bigint
        REFERENCES public.commitments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS outputs_commitment_idx
    ON public.outputs (commitment_id);

COMMIT;
