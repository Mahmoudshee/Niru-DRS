-- Update RLS policies for requisitions table

-- Update delete policy
ALTER POLICY "Enable delete for authenticated users"
ON "public"."requisitions"
TO authenticated
USING (true);

-- Update staff insert policy  
ALTER POLICY "Staff can insert requisitions"
ON "public"."requisitions"
TO public
WITH CHECK (staffId = (auth.uid())::text);

-- Update general insert policy
ALTER POLICY "Users can insert requisitions"
ON "public"."requisitions"
TO public
WITH CHECK (true);

-- Update general update policy
ALTER POLICY "Users can update requisitions"
ON "public"."requisitions"
TO public
USING (true);

-- Update general view policy
ALTER POLICY "Users can view requisitions"
ON "public"."requisitions"
TO public
USING (true);