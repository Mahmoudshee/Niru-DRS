-- Fix critical security vulnerability: Replace overly permissive RLS policies with role-based access control
-- CORRECTED VERSION - Fix case sensitivity issues

-- First, create a security definer function to get user roles (prevents infinite recursion)
CREATE OR REPLACE FUNCTION public.get_user_roles(user_id uuid)
RETURNS text[]
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT roles FROM public.profiles WHERE id = user_id;
$$;

-- Create helper function to check if user has specific role
CREATE OR REPLACE FUNCTION public.user_has_role(user_id uuid, required_role text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT required_role = ANY(COALESCE(public.get_user_roles(user_id), ARRAY[]::text[]));
$$;

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can view requisitions" ON public.requisitions;
DROP POLICY IF EXISTS "Users can insert requisitions" ON public.requisitions;
DROP POLICY IF EXISTS "Staff can insert requisitions" ON public.requisitions;
DROP POLICY IF EXISTS "Users can update requisitions" ON public.requisitions;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.requisitions;

-- Create secure role-based SELECT policies
-- Policy 1: Staff can only view their own requisitions
CREATE POLICY "Staff can view own requisitions" ON public.requisitions
  FOR SELECT 
  USING (
    "staffId" = auth.uid()::text
    AND public.user_has_role(auth.uid(), 'staff')
  );

-- Policy 2: Authorisers can view pending requisitions
CREATE POLICY "Authorisers can view pending requisitions" ON public.requisitions
  FOR SELECT 
  USING (
    public.user_has_role(auth.uid(), 'authoriser')
    AND status = 'pending'
  );

-- Policy 3: Approvers can view authorized requisitions
CREATE POLICY "Approvers can view authorized requisitions" ON public.requisitions
  FOR SELECT 
  USING (
    public.user_has_role(auth.uid(), 'approver')
    AND status = 'authorized'
  );

-- Policy 4: Admins can view all requisitions
CREATE POLICY "Admins can view all requisitions" ON public.requisitions
  FOR SELECT 
  USING (public.user_has_role(auth.uid(), 'admin'));

-- Create secure INSERT policies
-- Policy 5: Only staff can insert their own requisitions
CREATE POLICY "Staff can insert own requisitions" ON public.requisitions
  FOR INSERT 
  WITH CHECK (
    "staffId" = auth.uid()::text
    AND public.user_has_role(auth.uid(), 'staff')
  );

-- Policy 6: Admins can insert any requisition
CREATE POLICY "Admins can insert requisitions" ON public.requisitions
  FOR INSERT 
  WITH CHECK (public.user_has_role(auth.uid(), 'admin'));

-- Create secure UPDATE policies
-- Policy 7: Staff can only update their own pending requisitions
CREATE POLICY "Staff can update own pending requisitions" ON public.requisitions
  FOR UPDATE 
  USING (
    "staffId" = auth.uid()::text
    AND public.user_has_role(auth.uid(), 'staff')
    AND status = 'pending'
  );

-- Policy 8: Authorisers can update pending requisitions (for authorization)
CREATE POLICY "Authorisers can update pending requisitions" ON public.requisitions
  FOR UPDATE 
  USING (
    public.user_has_role(auth.uid(), 'authoriser')
    AND status = 'pending'
  );

-- Policy 9: Approvers can update authorized requisitions (for approval)
CREATE POLICY "Approvers can update authorized requisitions" ON public.requisitions
  FOR UPDATE 
  USING (
    public.user_has_role(auth.uid(), 'approver')
    AND status = 'authorized'
  );

-- Policy 10: Admins can update any requisition
CREATE POLICY "Admins can update all requisitions" ON public.requisitions
  FOR UPDATE 
  USING (public.user_has_role(auth.uid(), 'admin'));

-- Create secure DELETE policies
-- Policy 11: Staff can only delete their own pending requisitions
CREATE POLICY "Staff can delete own pending requisitions" ON public.requisitions
  FOR DELETE 
  USING (
    "staffId" = auth.uid()::text
    AND public.user_has_role(auth.uid(), 'staff')
    AND status = 'pending'
  );

-- Policy 12: Admins can delete any requisition
CREATE POLICY "Admins can delete all requisitions" ON public.requisitions
  FOR DELETE 
  USING (public.user_has_role(auth.uid(), 'admin'));

-- Also secure the audit_logs table with similar role-based policies
DROP POLICY IF EXISTS "Users can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.audit_logs;

-- Audit logs SELECT policies
CREATE POLICY "Staff can view own requisition audit logs" ON public.audit_logs
  FOR SELECT 
  USING (
    public.user_has_role(auth.uid(), 'staff')
    AND EXISTS (
      SELECT 1 FROM public.requisitions 
      WHERE id = audit_logs."requisitionId" 
      AND "staffId" = auth.uid()::text
    )
  );

CREATE POLICY "Authorisers can view relevant audit logs" ON public.audit_logs
  FOR SELECT 
  USING (
    public.user_has_role(auth.uid(), 'authoriser')
    AND EXISTS (
      SELECT 1 FROM public.requisitions 
      WHERE id = audit_logs."requisitionId" 
      AND status IN ('pending', 'authorized', 'approved', 'rejected')
    )
  );

CREATE POLICY "Approvers can view relevant audit logs" ON public.audit_logs
  FOR SELECT 
  USING (
    public.user_has_role(auth.uid(), 'approver')
    AND EXISTS (
      SELECT 1 FROM public.requisitions 
      WHERE id = audit_logs."requisitionId" 
      AND status IN ('authorized', 'approved', 'rejected')
    )
  );

CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
  FOR SELECT 
  USING (public.user_has_role(auth.uid(), 'admin'));

-- Audit logs INSERT policies (anyone can create audit logs for actions they perform)
CREATE POLICY "Users can insert audit logs for their actions" ON public.audit_logs
  FOR INSERT 
  WITH CHECK (
    "performedBy" = auth.uid()::text
    OR public.user_has_role(auth.uid(), 'admin')
  );

-- Audit logs DELETE policies (only admins can delete audit logs)
CREATE POLICY "Admins can delete audit logs" ON public.audit_logs
  FOR DELETE 
  USING (public.user_has_role(auth.uid(), 'admin'));