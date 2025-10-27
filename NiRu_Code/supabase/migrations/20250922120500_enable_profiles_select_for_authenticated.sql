-- Allow all authenticated users to read profiles (id, name, email, signature_url)
-- Needed so staff/approver can see authoriser/approver names and signatures in PDFs

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND policyname = 'Allow authenticated users to SELECT profiles for read-only fields'
  ) THEN
    CREATE POLICY "Allow authenticated users to SELECT profiles for read-only fields" 
      ON public.profiles
      FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

GRANT SELECT ON public.profiles TO authenticated;

