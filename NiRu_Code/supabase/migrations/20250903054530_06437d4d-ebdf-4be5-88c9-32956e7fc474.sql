-- Fix critical security vulnerability: Audit logs exposed to all users
-- Remove existing overly permissive policies and implement admin-only access

-- Drop existing problematic policies on audit_logs table
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can view audit logs" ON public.audit_logs;

-- Create secure RLS policies for audit_logs table

-- 1. Only admins can view audit logs (sensitive business information)
CREATE POLICY "Only admins can view audit logs" 
ON public.audit_logs 
FOR SELECT 
TO authenticated
USING (public.check_user_role(auth.uid(), 'admin'));

-- 2. All authenticated users can insert audit logs (system functionality)
CREATE POLICY "System can insert audit logs" 
ON public.audit_logs 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- 3. Only admins can delete audit logs (for data management)
CREATE POLICY "Only admins can delete audit logs" 
ON public.audit_logs 
FOR DELETE 
TO authenticated
USING (public.check_user_role(auth.uid(), 'admin'));

-- 4. No updates allowed on audit logs (immutable for integrity)
-- Audit logs should be immutable once created for audit trail integrity