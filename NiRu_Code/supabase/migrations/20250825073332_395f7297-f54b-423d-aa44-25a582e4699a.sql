-- Fix column names to match TypeScript interfaces exactly by using quoted identifiers
DROP TABLE IF EXISTS public.requisitions CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;

-- Create requisitions table with quoted camelCase column names
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

-- Create audit_logs table with quoted camelCase column names
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

-- Enable RLS on both tables
ALTER TABLE public.requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

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

-- Enable realtime for both tables
ALTER TABLE public.requisitions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.requisitions;

ALTER TABLE public.audit_logs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;

-- Create indexes for performance using quoted column names
CREATE INDEX idx_requisitions_staff_id ON public.requisitions("staffId");
CREATE INDEX idx_requisitions_status ON public.requisitions(status);
CREATE INDEX idx_requisitions_archived ON public.requisitions(archived);
CREATE INDEX idx_requisitions_created_at ON public.requisitions("createdAt");
CREATE INDEX idx_audit_logs_requisition_id ON public.audit_logs("requisitionId");
CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs(timestamp);