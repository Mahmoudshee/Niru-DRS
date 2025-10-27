-- Drop extra tables and enums I created
DROP TABLE IF EXISTS public.requisition_attachments CASCADE;
DROP TABLE IF EXISTS public.requisition_items CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.requisitions CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop the enums I created
DROP TYPE IF EXISTS public.requisition_status CASCADE;
DROP TYPE IF EXISTS public.priority_level CASCADE;
DROP TYPE IF EXISTS public.app_role CASCADE;

-- Drop the functions I created
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_roles(uuid) CASCADE;

-- Recreate profiles table with exact fields as specified
CREATE TABLE public.profiles (
    id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    email text NOT NULL,
    roles text[] DEFAULT ARRAY['staff'::text],
    signature_url text,
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id)
);

-- Recreate requisitions table with exact fields as specified  
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

-- Create audit_logs table with exact fields as specified
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

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Create RLS policies for requisitions  
CREATE POLICY "Users can view requisitions" ON public.requisitions
    FOR SELECT USING (true);

CREATE POLICY "Users can insert requisitions" ON public.requisitions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update requisitions" ON public.requisitions
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users" ON public.requisitions
    FOR DELETE USING (true);

-- Create RLS policies for audit_logs
CREATE POLICY "Users can view audit logs" ON public.audit_logs
    FOR SELECT USING (true);

CREATE POLICY "Users can insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users" ON public.audit_logs
    FOR DELETE USING (true);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('requisition-documents', 'requisition-documents', true),
    ('signatures', 'signatures', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for requisition-documents
CREATE POLICY "Public read access for requisition documents" ON storage.objects
    FOR SELECT USING (bucket_id = 'requisition-documents');

CREATE POLICY "Authenticated users can upload requisition documents" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'requisition-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update requisition documents" ON storage.objects
    FOR UPDATE USING (bucket_id = 'requisition-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete requisition documents" ON storage.objects
    FOR DELETE USING (bucket_id = 'requisition-documents' AND auth.role() = 'authenticated');

-- Create storage policies for signatures
CREATE POLICY "Public read access for signatures" ON storage.objects
    FOR SELECT USING (bucket_id = 'signatures');

CREATE POLICY "Authenticated users can upload signatures" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'signatures' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update signatures" ON storage.objects
    FOR UPDATE USING (bucket_id = 'signatures' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete signatures" ON storage.objects
    FOR DELETE USING (bucket_id = 'signatures' AND auth.role() = 'authenticated');

-- Recreate the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, roles)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'name', new.email),
        new.email,
        ARRAY['staff']
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for requisitions and audit_logs
ALTER TABLE public.requisitions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.requisitions;

ALTER TABLE public.audit_logs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;

-- Create indexes for performance
CREATE INDEX idx_requisitions_staff_id ON public.requisitions(staffId);
CREATE INDEX idx_requisitions_status ON public.requisitions(status);
CREATE INDEX idx_requisitions_archived ON public.requisitions(archived);
CREATE INDEX idx_requisitions_created_at ON public.requisitions(createdAt);
CREATE INDEX idx_audit_logs_requisition_id ON public.audit_logs(requisitionId);
CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs(timestamp);