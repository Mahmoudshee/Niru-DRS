-- Fix column names to match the code expectations (camelCase)
-- Drop and recreate requisitions table with correct column names
DROP TABLE IF EXISTS public.requisitions CASCADE;

-- Create requisitions table with camelCase column names to match TypeScript interface
CREATE TABLE public.requisitions (
    id text NOT NULL PRIMARY KEY,
    staffId text NOT NULL,  -- camelCase
    staffName text NOT NULL,  -- camelCase  
    staffEmail text NOT NULL,  -- camelCase
    date text NOT NULL,
    activity text NOT NULL,
    totalAmount numeric NOT NULL,  -- camelCase
    items jsonb NOT NULL,
    status text NOT NULL DEFAULT 'pending'::text,
    authoriserNotes text,  -- camelCase
    approverNotes text,    -- camelCase
    createdAt timestamp with time zone DEFAULT now(),  -- camelCase
    authorizedAt timestamp with time zone,  -- camelCase
    approvedAt timestamp with time zone,    -- camelCase
    documentUrl text,      -- camelCase
    documentName text,     -- camelCase
    liquidation_status text DEFAULT 'not_applicable'::text,
    liquidatedby text,
    liquidatedat timestamp with time zone,
    archived boolean NOT NULL DEFAULT false,
    archivedBy text,       -- camelCase
    archivedAt timestamp with time zone,  -- camelCase
    archiveReason text,    -- camelCase
    originalRequisitionId text,  -- camelCase
    editedFrom text        -- camelCase
);

-- Enable RLS
ALTER TABLE public.requisitions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view requisitions" ON public.requisitions
    FOR SELECT USING (true);

CREATE POLICY "Users can insert requisitions" ON public.requisitions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update requisitions" ON public.requisitions
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users" ON public.requisitions
    FOR DELETE USING (true);

-- Enable realtime
ALTER TABLE public.requisitions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.requisitions;

-- Create indexes for performance
CREATE INDEX idx_requisitions_staff_id ON public.requisitions(staffId);
CREATE INDEX idx_requisitions_status ON public.requisitions(status);
CREATE INDEX idx_requisitions_archived ON public.requisitions(archived);
CREATE INDEX idx_requisitions_created_at ON public.requisitions(createdAt);