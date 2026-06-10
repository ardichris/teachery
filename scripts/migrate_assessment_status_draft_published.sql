-- Migrate existing Teachery assessments to the simplified statuses:
-- draft / published.
--
-- Run this once in Supabase Dashboard > SQL Editor for an existing project.

UPDATE assessments
SET status = CASE
  WHEN status IN ('ready_to_export', 'pdf_ready', 'published') THEN 'published'
  ELSE 'draft'
END;

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT con.conname
  INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE rel.relname = 'assessments'
    AND nsp.nspname = 'public'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) LIKE '%status%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE assessments DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE assessments
ADD CONSTRAINT assessments_status_check
CHECK (status IN ('draft', 'published'));
