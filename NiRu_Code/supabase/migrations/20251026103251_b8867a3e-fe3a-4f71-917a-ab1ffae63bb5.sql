-- Add columns for multiple document storage
ALTER TABLE public.requisitions 
ADD COLUMN IF NOT EXISTS "documentUrls" text,
ADD COLUMN IF NOT EXISTS "documentNames" text;

COMMENT ON COLUMN public.requisitions."documentUrls" IS 'JSON array of document URLs';
COMMENT ON COLUMN public.requisitions."documentNames" IS 'JSON array of document names';