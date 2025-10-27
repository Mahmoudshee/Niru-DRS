-- Update/Create RLS policies for audit_logs table

-- Drop existing restrictive policies that might conflict
DROP POLICY IF EXISTS "Users can insert audit logs for their actions" ON public.audit_logs;
DROP POLICY IF EXISTS "Staff can view own requisition audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authorisers can view relevant audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Approvers can view relevant audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can delete audit logs" ON public.audit_logs;

-- Create/Update delete policy
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.audit_logs;
CREATE POLICY "Enable delete for authenticated users"
ON "public"."audit_logs"
FOR DELETE
TO authenticated
USING (true);

-- Create/Update insert policy
DROP POLICY IF EXISTS "Users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Users can insert audit logs"
ON "public"."audit_logs"
FOR INSERT
TO public
WITH CHECK (true);

-- Create/Update view policy
DROP POLICY IF EXISTS "Users can view audit logs" ON public.audit_logs;
CREATE POLICY "Users can view audit logs"
ON "public"."audit_logs"
FOR SELECT
TO public
USING (true);