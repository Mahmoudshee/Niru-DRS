-- Fix Column Name Case Issues
-- Run this in your Supabase SQL Editor to fix the column naming issues

-- First, let's check what columns actually exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'requisitions' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- If the columns exist but with wrong case, we need to rename them
-- PostgreSQL converts unquoted identifiers to lowercase

-- Rename columns to match the code expectations (if they exist with wrong case)
DO $$
BEGIN
    -- Check if columns exist with lowercase names and rename them
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requisitions' AND column_name = 'staffid') THEN
        ALTER TABLE public.requisitions RENAME COLUMN staffid TO "staffId";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requisitions' AND column_name = 'staffname') THEN
        ALTER TABLE public.requisitions RENAME COLUMN staffname TO "staffName";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requisitions' AND column_name = 'staffemail') THEN
        ALTER TABLE public.requisitions RENAME COLUMN staffemail TO "staffEmail";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requisitions' AND column_name = 'totalamount') THEN
        ALTER TABLE public.requisitions RENAME COLUMN totalamount TO "totalAmount";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requisitions' AND column_name = 'authorisernotes') THEN
        ALTER TABLE public.requisitions RENAME COLUMN authorisernotes TO "authoriserNotes";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requisitions' AND column_name = 'approvernotes') THEN
        ALTER TABLE public.requisitions RENAME COLUMN approvernotes TO "approverNotes";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requisitions' AND column_name = 'createdat') THEN
        ALTER TABLE public.requisitions RENAME COLUMN createdat TO "createdAt";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requisitions' AND column_name = 'authorizedat') THEN
        ALTER TABLE public.requisitions RENAME COLUMN authorizedat TO "authorizedAt";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requisitions' AND column_name = 'approvedat') THEN
        ALTER TABLE public.requisitions RENAME COLUMN approvedat TO "approvedAt";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requisitions' AND column_name = 'documenturl') THEN
        ALTER TABLE public.requisitions RENAME COLUMN documenturl TO "documentUrl";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requisitions' AND column_name = 'documentname') THEN
        ALTER TABLE public.requisitions RENAME COLUMN documentname TO "documentName";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requisitions' AND column_name = 'documenturls') THEN
        ALTER TABLE public.requisitions RENAME COLUMN documenturls TO "documentUrls";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requisitions' AND column_name = 'documentnames') THEN
        ALTER TABLE public.requisitions RENAME COLUMN documentnames TO "documentNames";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requisitions' AND column_name = 'liquidation_status') THEN
        ALTER TABLE public.requisitions RENAME COLUMN liquidation_status TO "liquidation_status";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requisitions' AND column_name = 'liquidatedby') THEN
        ALTER TABLE public.requisitions RENAME COLUMN liquidatedby TO "liquidatedby";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requisitions' AND column_name = 'liquidatedat') THEN
        ALTER TABLE public.requisitions RENAME COLUMN liquidatedat TO "liquidatedat";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requisitions' AND column_name = 'archivedby') THEN
        ALTER TABLE public.requisitions RENAME COLUMN archivedby TO "archivedBy";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requisitions' AND column_name = 'archivedat') THEN
        ALTER TABLE public.requisitions RENAME COLUMN archivedat TO "archivedAt";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requisitions' AND column_name = 'archivereason') THEN
        ALTER TABLE public.requisitions RENAME COLUMN archivereason TO "archiveReason";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requisitions' AND column_name = 'originalrequisitionid') THEN
        ALTER TABLE public.requisitions RENAME COLUMN originalrequisitionid TO "originalRequisitionId";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requisitions' AND column_name = 'editedfrom') THEN
        ALTER TABLE public.requisitions RENAME COLUMN editedfrom TO "editedFrom";
    END IF;
END $$;

-- Check the final column structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'requisitions' 
AND table_schema = 'public'
ORDER BY ordinal_position;
