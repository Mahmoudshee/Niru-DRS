-- Fix critical security vulnerability: Requisitions table exposure
-- Remove existing overly permissive policies and implement role-based access control

-- Drop existing problematic policies on requisitions table
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.requisitions;
DROP POLICY IF EXISTS "Staff can insert requisitions" ON public.requisitions;
DROP POLICY IF EXISTS "Users can insert requisitions" ON public.requisitions;
DROP POLICY IF EXISTS "Users can update requisitions" ON public.requisitions;
DROP POLICY IF EXISTS "Users can view requisitions" ON public.requisitions;

-- Create secure role-based RLS policies for requisitions table

-- 1. Staff can only view their own requisitions
CREATE POLICY "Staff can view own requisitions" 
ON public.requisitions 
FOR SELECT 
TO authenticated
USING ("staffId" = (auth.uid())::text);

-- 2. Authorizers can view requisitions pending authorization (status = 'pending')
CREATE POLICY "Authorizers can view pending requisitions" 
ON public.requisitions 
FOR SELECT 
TO authenticated
USING (
  public.check_user_role(auth.uid(), 'authoriser') AND 
  status = 'pending'
);

-- 3. Approvers can view requisitions pending approval (status = 'authorized')
CREATE POLICY "Approvers can view authorized requisitions" 
ON public.requisitions 
FOR SELECT 
TO authenticated
USING (
  public.check_user_role(auth.uid(), 'approver') AND 
  status = 'authorized'
);

-- 4. Admins can view all requisitions
CREATE POLICY "Admins can view all requisitions" 
ON public.requisitions 
FOR SELECT 
TO authenticated
USING (public.check_user_role(auth.uid(), 'admin'));

-- 5. Staff can insert their own requisitions
CREATE POLICY "Staff can insert own requisitions" 
ON public.requisitions 
FOR INSERT 
TO authenticated
WITH CHECK ("staffId" = (auth.uid())::text);

-- 6. Staff can update their own pending requisitions
CREATE POLICY "Staff can update own pending requisitions" 
ON public.requisitions 
FOR UPDATE 
TO authenticated
USING (
  "staffId" = (auth.uid())::text AND 
  status = 'pending'
);

-- 7. Authorizers can update requisitions for authorization
CREATE POLICY "Authorizers can authorize requisitions" 
ON public.requisitions 
FOR UPDATE 
TO authenticated
USING (
  public.check_user_role(auth.uid(), 'authoriser') AND 
  status = 'pending'
)
WITH CHECK (
  public.check_user_role(auth.uid(), 'authoriser') AND 
  status IN ('authorized', 'rejected')
);

-- 8. Approvers can update requisitions for approval
CREATE POLICY "Approvers can approve requisitions" 
ON public.requisitions 
FOR UPDATE 
TO authenticated
USING (
  public.check_user_role(auth.uid(), 'approver') AND 
  status = 'authorized'
)
WITH CHECK (
  public.check_user_role(auth.uid(), 'approver') AND 
  status IN ('approved', 'rejected')
);

-- 9. Admins can update any requisition
CREATE POLICY "Admins can update all requisitions" 
ON public.requisitions 
FOR UPDATE 
TO authenticated
USING (public.check_user_role(auth.uid(), 'admin'));

-- 10. Only admins can delete requisitions (for data integrity)
CREATE POLICY "Only admins can delete requisitions" 
ON public.requisitions 
FOR DELETE 
TO authenticated
USING (public.check_user_role(auth.uid(), 'admin'));