-- Create RLS policies for requisitions table

-- Enable RLS first if not already enabled
ALTER TABLE public.requisitions ENABLE ROW LEVEL SECURITY;

-- Create delete policy
CREATE POLICY "Enable delete for authenticated users"
ON "public"."requisitions"
FOR DELETE
TO authenticated
USING (true);

-- Create staff insert policy  
CREATE POLICY "Staff can insert requisitions"
ON "public"."requisitions"
FOR INSERT
TO public
WITH CHECK ("staffId" = (auth.uid())::text);

-- Create general insert policy
CREATE POLICY "Users can insert requisitions"
ON "public"."requisitions"
FOR INSERT
TO public
WITH CHECK (true);

-- Create general update policy
CREATE POLICY "Users can update requisitions"
ON "public"."requisitions"
FOR UPDATE
TO public
USING (true);

-- Create general view policy
CREATE POLICY "Users can view requisitions"
ON "public"."requisitions"
FOR SELECT
TO public
USING (true);