-- =====================================================
-- COMPLETE DATABASE SETUP FOR NIRU-DRS
-- Digital Requisition System
-- =====================================================
-- This script creates the complete database schema for the Niru-DRS project
-- Run this in your Supabase SQL Editor to set up the entire database

-- =====================================================
-- 1. CLEANUP EXISTING SCHEMA (if needed)
-- =====================================================

-- Drop existing tables and functions (in correct order due to dependencies)
DROP TABLE IF EXISTS public.user_hidden_requisitions CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.requisitions CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS public.update_user_profile(text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.check_user_role(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_roles(text) CASCADE;
DROP FUNCTION IF EXISTS public.user_has_role(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.auto_fix_empty_profiles() CASCADE;
DROP FUNCTION IF EXISTS public.check_empty_profiles() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- =====================================================
-- 2. CREATE PROFILES TABLE
-- =====================================================

CREATE TABLE public.profiles (
    id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    email text NOT NULL,
    roles text[] DEFAULT ARRAY['staff'::text],
    signature_url text,
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id)
);

-- =====================================================
-- 3. CREATE REQUISITIONS TABLE
-- =====================================================

CREATE TABLE public.requisitions (
    id text NOT NULL PRIMARY KEY,
    staffId text NOT NULL,
    staffName text NOT NULL,
    staffEmail text NOT NULL,
    date text NOT NULL,
    activity text NOT NULL,
    totalAmount numeric NOT NULL,
    items jsonb NOT NULL,
    status text NOT NULL DEFAULT 'pending'::text,
    authoriserNotes text,
    approverNotes text,
    createdAt timestamp with time zone DEFAULT now(),
    authorizedAt timestamp with time zone,
    approvedAt timestamp with time zone,
    documentUrl text,
    documentName text,
    documentUrls text,
    documentNames text,
    liquidation_status text DEFAULT 'not_applicable'::text,
    liquidatedby text,
    liquidatedat timestamp with time zone,
    archived boolean NOT NULL DEFAULT false,
    archivedBy text,
    archivedAt timestamp with time zone,
    archiveReason text,
    originalRequisitionId text,
    editedFrom text
);

-- =====================================================
-- 4. CREATE AUDIT LOGS TABLE
-- =====================================================

CREATE TABLE public.audit_logs (
    id text NOT NULL PRIMARY KEY,
    requisitionId text NOT NULL,
    action text NOT NULL,
    performedBy text NOT NULL,
    performedByRole text NOT NULL,
    previousValue text,
    newValue text,
    notes text,
    timestamp timestamp with time zone DEFAULT now()
);

-- =====================================================
-- 5. CREATE USER HIDDEN REQUISITIONS TABLE
-- =====================================================

CREATE TABLE public.user_hidden_requisitions (
    id text NOT NULL PRIMARY KEY,
    user_id text NOT NULL,
    requisition_id text NOT NULL,
    hidden_at timestamp with time zone DEFAULT now()
);

-- =====================================================
-- 6. CREATE ESSENTIAL FUNCTIONS
-- =====================================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.check_user_role(user_id text, required_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_roles text[];
BEGIN
    -- Get user roles from profiles table
    SELECT roles INTO user_roles
    FROM public.profiles
    WHERE id::text = user_id;
    
    -- Check if the required role exists in the user's roles array
    RETURN required_role = ANY(user_roles);
END;
$$;

-- Function to get all user roles
CREATE OR REPLACE FUNCTION public.get_user_roles(user_id text)
RETURNS text[]
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
    
    RETURN COALESCE(user_roles, ARRAY['staff'::text]);
END;
$$;

-- Function to check if user has role (alternative implementation)
CREATE OR REPLACE FUNCTION public.user_has_role(required_role text, user_id text)
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

-- Function to update user profile
CREATE OR REPLACE FUNCTION public.update_user_profile(
    profile_name text,
    profile_email text,
    signature_url_param text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.profiles
    SET 
        name = profile_name,
        email = profile_email,
        signature_url = signature_url_param
    WHERE email = profile_email;
    
    -- If no rows were updated, try to insert
    IF NOT FOUND THEN
        INSERT INTO public.profiles (id, name, email, signature_url, roles)
        VALUES (
            auth.uid(),
            profile_name,
            profile_email,
            signature_url_param,
            ARRAY['staff'::text]
        );
    END IF;
END;
$$;

-- Function to auto-fix empty profiles
CREATE OR REPLACE FUNCTION public.auto_fix_empty_profiles()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    fixed_count integer := 0;
BEGIN
    -- Update profiles with empty values
    UPDATE public.profiles 
    SET 
        name = COALESCE(
            auth_users.raw_user_meta_data->>'name',
            auth_users.raw_user_meta_data->>'full_name', 
            INITCAP(SPLIT_PART(auth_users.email, '@', 1))
        ),
        email = auth_users.email
    FROM auth.users auth_users
    WHERE public.profiles.id = auth_users.id 
      AND (public.profiles.name = 'EMPTY' OR public.profiles.name IS NULL OR public.profiles.name = '' OR 
           public.profiles.email = 'EMPTY' OR public.profiles.email IS NULL OR public.profiles.email = '');
    
    GET DIAGNOSTICS fixed_count = ROW_COUNT;
    RETURN fixed_count;
END;
$$;

-- Function to check for empty profiles
CREATE OR REPLACE FUNCTION public.check_empty_profiles()
RETURNS TABLE(
    profile_id uuid,
    profile_name text,
    profile_email text,
    auth_email text,
    has_issues boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.email,
        au.email as auth_email,
        (p.name = 'EMPTY' OR p.name IS NULL OR p.name = '' OR 
         p.email = 'EMPTY' OR p.email IS NULL OR p.email = '' OR
         p.email != au.email) as has_issues
    FROM public.profiles p
    JOIN auth.users au ON p.id = au.id
    WHERE p.name = 'EMPTY' OR p.name IS NULL OR p.name = '' OR 
          p.email = 'EMPTY' OR p.email IS NULL OR p.email = '' OR
          p.email != au.email;
END;
$$;

-- Function to handle new user registration
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
    -- Always use the email from auth.users
    user_email := NEW.email;
    
    -- Extract name with multiple fallback strategies
    user_name := COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'name', ''),
        NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
        NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
        INITCAP(SPLIT_PART(NEW.email, '@', 1))
    );
    
    -- Ensure we never have empty values
    IF user_name IS NULL OR user_name = '' OR user_name = 'EMPTY' THEN
        user_name := INITCAP(SPLIT_PART(NEW.email, '@', 1));
    END IF;
    
    IF user_email IS NULL OR user_email = '' OR user_email = 'EMPTY' THEN
        user_email := NEW.email;
    END IF;
    
    -- Insert the profile with guaranteed non-empty values
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
        -- Log the error but don't fail the user creation
        RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_hidden_requisitions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 8. CREATE RLS POLICIES
-- =====================================================

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid()::text = id::text);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = id::text);

-- Requisitions policies
CREATE POLICY "Staff can view own requisitions" ON public.requisitions
    FOR SELECT TO authenticated USING (
        check_user_role(auth.uid()::text, 'staff') AND 
        staffId = auth.uid()::text
    );

CREATE POLICY "Staff can create own requisitions" ON public.requisitions
    FOR INSERT TO authenticated WITH CHECK (
        check_user_role(auth.uid()::text, 'staff') AND 
        staffId = auth.uid()::text
    );

CREATE POLICY "Staff can update own pending requisitions" ON public.requisitions
    FOR UPDATE TO authenticated USING (
        check_user_role(auth.uid()::text, 'staff') AND 
        staffId = auth.uid()::text AND 
        status = 'pending'
    )
    WITH CHECK (
        check_user_role(auth.uid()::text, 'staff') AND 
        staffId = auth.uid()::text
    );

CREATE POLICY "Authorizers can view relevant requisitions" ON public.requisitions
    FOR SELECT TO authenticated USING (
        check_user_role(auth.uid()::text, 'authoriser')
    );

CREATE POLICY "Authorizers can authorize requisitions" ON public.requisitions
    FOR UPDATE TO authenticated USING (
        check_user_role(auth.uid()::text, 'authoriser') AND 
        status = 'pending'
    )
    WITH CHECK (
        check_user_role(auth.uid()::text, 'authoriser') AND 
        status IN ('authorized', 'rejected')
    );

CREATE POLICY "Approvers can view relevant requisitions" ON public.requisitions
    FOR SELECT TO authenticated USING (
        check_user_role(auth.uid()::text, 'approver')
    );

CREATE POLICY "Approvers can approve requisitions" ON public.requisitions
    FOR UPDATE TO authenticated USING (
        check_user_role(auth.uid()::text, 'approver') AND 
        status = 'authorized'
    )
    WITH CHECK (
        check_user_role(auth.uid()::text, 'approver') AND 
        status IN ('approved', 'rejected')
    );

CREATE POLICY "Admins can view all requisitions" ON public.requisitions
    FOR SELECT TO authenticated USING (check_user_role(auth.uid()::text, 'admin'));

CREATE POLICY "Admins can update all requisitions" ON public.requisitions
    FOR UPDATE TO authenticated USING (check_user_role(auth.uid()::text, 'admin'))
    WITH CHECK (check_user_role(auth.uid()::text, 'admin'));

CREATE POLICY "Admins can insert requisitions" ON public.requisitions
    FOR INSERT TO authenticated WITH CHECK (check_user_role(auth.uid()::text, 'admin'));

CREATE POLICY "Admins can delete requisitions" ON public.requisitions
    FOR DELETE TO authenticated USING (check_user_role(auth.uid()::text, 'admin'));

-- Audit logs policies
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
    FOR SELECT TO authenticated USING (check_user_role(auth.uid()::text, 'admin'));

CREATE POLICY "Users can view audit logs for their own requisitions" ON public.audit_logs
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.requisitions r 
            WHERE r.id = requisitionId AND r.staffId = auth.uid()::text
        )
    );

CREATE POLICY "System can insert audit logs" ON public.audit_logs
    FOR INSERT TO authenticated WITH CHECK (true);

-- User hidden requisitions policies
CREATE POLICY "Users can manage their own hidden requisitions" ON public.user_hidden_requisitions
    FOR ALL TO authenticated USING (user_id = auth.uid()::text)
    WITH CHECK (user_id = auth.uid()::text);

-- =====================================================
-- 9. CREATE TRIGGERS
-- =====================================================

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 10. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_roles ON public.profiles USING GIN(roles);

-- Requisitions indexes
CREATE INDEX IF NOT EXISTS idx_requisitions_staff_id ON public.requisitions(staffId);
CREATE INDEX IF NOT EXISTS idx_requisitions_status ON public.requisitions(status);
CREATE INDEX IF NOT EXISTS idx_requisitions_created_at ON public.requisitions(createdAt);
CREATE INDEX IF NOT EXISTS idx_requisitions_date ON public.requisitions(date);
CREATE INDEX IF NOT EXISTS idx_requisitions_archived ON public.requisitions(archived);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_requisition_id ON public.audit_logs(requisitionId);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by ON public.audit_logs(performedBy);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- User hidden requisitions indexes
CREATE INDEX IF NOT EXISTS idx_user_hidden_requisitions_user_id ON public.user_hidden_requisitions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_hidden_requisitions_requisition_id ON public.user_hidden_requisitions(requisition_id);

-- =====================================================
-- 11. ENABLE REALTIME
-- =====================================================

-- Enable realtime for all tables
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.requisitions REPLICA IDENTITY FULL;
ALTER TABLE public.audit_logs REPLICA IDENTITY FULL;
ALTER TABLE public.user_hidden_requisitions REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.requisitions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_hidden_requisitions;

-- =====================================================
-- 12. CREATE STORAGE BUCKETS
-- =====================================================

-- Create storage bucket for requisition documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('requisition-documents', 'requisition-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for signatures
INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 13. STORAGE POLICIES
-- =====================================================

-- Requisition documents storage policies
CREATE POLICY "Users can upload requisition documents" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (
        bucket_id = 'requisition-documents' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view requisition documents" ON storage.objects
    FOR SELECT TO authenticated USING (
        bucket_id = 'requisition-documents'
    );

CREATE POLICY "Users can update their own requisition documents" ON storage.objects
    FOR UPDATE TO authenticated USING (
        bucket_id = 'requisition-documents' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own requisition documents" ON storage.objects
    FOR DELETE TO authenticated USING (
        bucket_id = 'requisition-documents' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Signatures storage policies
CREATE POLICY "Users can upload signatures" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (
        bucket_id = 'signatures' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view signatures" ON storage.objects
    FOR SELECT TO authenticated USING (
        bucket_id = 'signatures'
    );

CREATE POLICY "Users can update their own signatures" ON storage.objects
    FOR UPDATE TO authenticated USING (
        bucket_id = 'signatures' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own signatures" ON storage.objects
    FOR DELETE TO authenticated USING (
        bucket_id = 'signatures' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- =====================================================
-- 14. GRANT PERMISSIONS
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- =====================================================
-- 15. SAMPLE DATA (OPTIONAL)
-- =====================================================

-- Insert a sample admin user (replace with your actual admin user ID)
-- You can uncomment and modify this section if you want to create a sample admin
/*
INSERT INTO public.profiles (id, name, email, roles)
VALUES (
    'your-admin-user-id-here',
    'Admin User',
    'admin@niru.ca',
    ARRAY['admin', 'approver', 'authoriser', 'staff']
)
ON CONFLICT (id) DO UPDATE SET
    roles = EXCLUDED.roles;
*/

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================

-- The database is now fully set up with:
-- ✅ All necessary tables (profiles, requisitions, audit_logs, user_hidden_requisitions)
-- ✅ Row Level Security policies for all tables
-- ✅ Essential functions for role checking and user management
-- ✅ Triggers for automatic user profile creation
-- ✅ Storage buckets and policies for file uploads
-- ✅ Indexes for optimal performance
-- ✅ Realtime subscriptions enabled
-- ✅ Proper permissions granted

-- Next steps:
-- 1. Test the setup by creating a user account
-- 2. Verify that the profile is created automatically
-- 3. Test creating a requisition
-- 4. Test the approval workflow
-- 5. Test file uploads and signatures

COMMENT ON TABLE public.profiles IS 'User profiles with roles and signature URLs';
COMMENT ON TABLE public.requisitions IS 'Main requisition data with approval workflow';
COMMENT ON TABLE public.audit_logs IS 'Complete audit trail of all system actions';
COMMENT ON TABLE public.user_hidden_requisitions IS 'User-specific visibility controls for requisitions';
