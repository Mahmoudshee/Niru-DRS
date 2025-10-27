-- Drop existing storage policies
DO $$
BEGIN
    -- Drop storage policies for requisition-documents
    DROP POLICY IF EXISTS "Public read access for requisition documents" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload requisition documents" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can update requisition documents" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can delete requisition documents" ON storage.objects;
    
    -- Drop storage policies for signatures
    DROP POLICY IF EXISTS "Public read access for signatures" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload signatures" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can update signatures" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can delete signatures" ON storage.objects;
EXCEPTION
    WHEN OTHERS THEN
        NULL; -- Ignore errors if policies don't exist
END $$;

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