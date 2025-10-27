-- Allow all authenticated users to read audit_logs for transparency in PDFs
-- This enables fetching performedBy for authorized/approved actions

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'audit_logs' 
      AND policyname = 'Allow authenticated users to SELECT audit logs'
  ) THEN
    CREATE POLICY "Allow authenticated users to SELECT audit logs" 
      ON public.audit_logs
      FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Optional: grant select to authenticated role (policy governs row access)
GRANT SELECT ON public.audit_logs TO authenticated;


