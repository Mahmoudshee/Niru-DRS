-- Fix critical security vulnerability: Replace overly permissive RLS policies with role-based access control
-- FINAL VERSION - Properly handle existing policies

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

-- Drop ALL existing policies on requisitions table
DROP POLICY IF EXISTS "Users can view requisitions" ON public.requisitions;
DROP POLICY IF EXISTS "Users can insert requisitions" ON public.requisitions;
DROP POLICY IF EXISTS "Staff can insert requisitions" ON public.requisitions;
DROP POLICY IF EXISTS "Users can update requisitions" ON public.requisitions;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.requisitions;
DROP POLICY IF EXISTS "Staff can view own requisitions" ON public.requisitions;
DROP POLICY IF EXISTS "Authorisers can view pending requisitions" ON public.requisitions;
DROP POLICY IF EXISTS "Approvers can view authorized requisitions" ON public.requisitions;
DROP POLICY IF EXISTS "Admins can view all requisitions" ON public.requisitions;
DROP POLICY IF EXISTS "Staff can insert own requisitions" ON public.requisitions;
DROP POLICY IF EXISTS "Admins can insert requisitions" ON public.requisitions;
DROP POLICY IF EXISTS "Staff can update own pending requisitions" ON public.requisitions;
DROP POLICY IF EXISTS "Authorisers can update pending requisitions" ON public.requisitions;
DROP POLICY IF EXISTS "Approvers can update authorized requisitions" ON public.requisitions;
DROP POLICY IF EXISTS "Admins can update all requisitions" ON public.requisitions;
DROP POLICY IF EXISTS "Staff can delete own pending requisitions" ON public.requisitions;
DROP POLICY IF EXISTS "Admins can delete all requisitions" ON public.requisitions;

-- Create secure role-based SELECT policies
CREATE POLICY "Staff can view own requisitions" ON public.requisitions
  FOR SELECT 
  USING (
    "staffId" = auth.uid()::text
    AND public.user_has_role(auth.uid(), 'staff')
  );

CREATE POLICY "Authorisers can view pending requisitions" ON public.requisitions
  FOR SELECT 
  USING (
    public.user_has_role(auth.uid(), 'authoriser')
    AND status = 'pending'
  );

CREATE POLICY "Approvers can view authorized requisitions" ON public.requisitions
  FOR SELECT 
  USING (
    public.user_has_role(auth.uid(), 'approver')
    AND status = 'authorized'
  );

CREATE POLICY "Admins can view all requisitions" ON public.requisitions
  FOR SELECT 
  USING (public.user_has_role(auth.uid(), 'admin'));

-- Create secure INSERT policies
CREATE POLICY "Staff can insert own requisitions" ON public.requisitions
  FOR INSERT 
  WITH CHECK (
    "staffId" = auth.uid()::text
    AND public.user_has_role(auth.uid(), 'staff')
  );

CREATE POLICY "Admins can insert requisitions" ON public.requisitions
  FOR INSERT 
  WITH CHECK (public.user_has_role(auth.uid(), 'admin'));

-- Create secure UPDATE policies
CREATE POLICY "Staff can update own pending requisitions" ON public.requisitions
  FOR UPDATE 
  USING (
    "staffId" = auth.uid()::text
    AND public.user_has_role(auth.uid(), 'staff')
    AND status = 'pending'
  );

CREATE POLICY "Authorisers can update pending requisitions" ON public.requisitions
  FOR UPDATE 
  USING (
    public.user_has_role(auth.uid(), 'authoriser')
    AND status = 'pending'
  );

CREATE POLICY "Approvers can update authorized requisitions" ON public.requisitions
  FOR UPDATE 
  USING (
    public.user_has_role(auth.uid(), 'approver')
    AND status = 'authorized'
  );

CREATE POLICY "Admins can update all requisitions" ON public.requisitions
  FOR UPDATE 
  USING (public.user_has_role(auth.uid(), 'admin'));

-- Create secure DELETE policies
CREATE POLICY "Staff can delete own pending requisitions" ON public.requisitions
  FOR DELETE 
  USING (
    "staffId" = auth.uid()::text
    AND public.user_has_role(auth.uid(), 'staff')
    AND status = 'pending'
  );

CREATE POLICY "Admins can delete all requisitions" ON public.requisitions
  FOR DELETE 
  USING (public.user_has_role(auth.uid(), 'admin'));

-- Drop ALL existing policies on audit_logs table
DROP POLICY IF EXISTS "Users can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.audit_logs;
DROP POLICY IF EXISTS "Staff can view own requisition audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authorisers can view relevant audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Approvers can view relevant audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can insert audit logs for their actions" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can delete audit logs" ON public.audit_logs;

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

-- Audit logs INSERT policies
CREATE POLICY "Users can insert audit logs for their actions" ON public.audit_logs
  FOR INSERT 
  WITH CHECK (
    "performedBy" = auth.uid()::text
    OR public.user_has_role(auth.uid(), 'admin')
  );

-- Audit logs DELETE policies
CREATE POLICY "Admins can delete audit logs" ON public.audit_logs
  FOR DELETE 
  USING (public.user_has_role(auth.uid(), 'admin'));