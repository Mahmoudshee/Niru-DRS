-- Corrected Essential Database Setup for NiRu DRS
-- Run this in your Supabase SQL Editor to create tables with proper column names

-- Drop existing tables if they exist (in correct order)
DROP TABLE IF EXISTS public.user_hidden_requisitions CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.requisitions CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Create profiles table
CREATE TABLE public.profiles (
    id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    email text NOT NULL,
    roles text[] DEFAULT ARRAY['staff'::text],
    signature_url text,
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id)
);

-- Create requisitions table with properly quoted column names
CREATE TABLE public.requisitions (
    id text NOT NULL PRIMARY KEY,
    "staffId" text NOT NULL,
    "staffName" text NOT NULL,
    "staffEmail" text NOT NULL,
    date text NOT NULL,
    activity text NOT NULL,
    "totalAmount" numeric NOT NULL,
    items jsonb NOT NULL,
    status text NOT NULL DEFAULT 'pending'::text,
    "authoriserNotes" text,
    "approverNotes" text,
    "createdAt" timestamp with time zone DEFAULT now(),
    "authorizedAt" timestamp with time zone,
    "approvedAt" timestamp with time zone,
    "documentUrl" text,
    "documentName" text,
    "documentUrls" text,
    "documentNames" text,
    liquidation_status text DEFAULT 'not_applicable'::text,
    liquidatedby text,
    liquidatedat timestamp with time zone,
    archived boolean NOT NULL DEFAULT false,
    "archivedBy" text,
    "archivedAt" timestamp with time zone,
    "archiveReason" text,
    "originalRequisitionId" text,
    "editedFrom" text
);

-- Create audit_logs table
CREATE TABLE public.audit_logs (
    id text NOT NULL PRIMARY KEY,
    "requisitionId" text NOT NULL,
    action text NOT NULL,
    "performedBy" text NOT NULL,
    "performedByRole" text NOT NULL,
    "previousValue" text,
    "newValue" text,
    notes text,
    timestamp timestamp with time zone DEFAULT now()
);

-- Create user_hidden_requisitions table
CREATE TABLE public.user_hidden_requisitions (
    id text NOT NULL PRIMARY KEY,
    user_id text NOT NULL,
    requisition_id text NOT NULL,
    hidden_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_hidden_requisitions ENABLE ROW LEVEL SECURITY;

-- Create essential functions
CREATE OR REPLACE FUNCTION public.check_user_role(user_id text, required_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_roles text[];
BEGIN
    SELECT roles INTO user_roles
    FROM public.profiles
    WHERE id::text = user_id;
    
    RETURN required_role = ANY(user_roles);
END;
$$;

-- Create basic RLS policies
CREATE POLICY "Users can view all profiles" ON public.profiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid()::text = id::text);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = id::text);

CREATE POLICY "Users can view all requisitions" ON public.requisitions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create requisitions" ON public.requisitions
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update requisitions" ON public.requisitions
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Users can view audit logs" ON public.audit_logs
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert audit logs" ON public.audit_logs
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can manage hidden requisitions" ON public.user_hidden_requisitions
    FOR ALL TO authenticated USING (user_id = auth.uid()::text)
    WITH CHECK (user_id = auth.uid()::text);

-- Create user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_name text;
    user_email text;
BEGIN
    user_email := NEW.email;
    
    user_name := COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'name', ''),
        NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
        NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
        INITCAP(SPLIT_PART(NEW.email, '@', 1))
    );
    
    IF user_name IS NULL OR user_name = '' OR user_name = 'EMPTY' THEN
        user_name := INITCAP(SPLIT_PART(NEW.email, '@', 1));
    END IF;
    
    INSERT INTO public.profiles (id, name, email, roles)
    VALUES (
        NEW.id,
        user_name,
        user_email,
        ARRAY['staff']
    );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_requisitions_staff_id ON public.requisitions("staffId");
CREATE INDEX IF NOT EXISTS idx_requisitions_status ON public.requisitions(status);
CREATE INDEX IF NOT EXISTS idx_requisitions_created_at ON public.requisitions("createdAt");
CREATE INDEX IF NOT EXISTS idx_audit_logs_requisition_id ON public.audit_logs("requisitionId");

-- Enable realtime
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.requisitions REPLICA IDENTITY FULL;
ALTER TABLE public.audit_logs REPLICA IDENTITY FULL;
ALTER TABLE public.user_hidden_requisitions REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.requisitions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_hidden_requisitions;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
