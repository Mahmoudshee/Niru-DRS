-- Enable RLS on requisitions table and create proper access policies

-- First enable RLS on the requisitions table
ALTER TABLE public.requisitions ENABLE ROW LEVEL SECURITY;

-- Policy for staff to view their own requisitions
CREATE POLICY "Staff can view own requisitions" 
ON public.requisitions 
FOR SELECT 
USING (
  check_user_role(auth.uid(), 'staff'::text) AND 
  "staffId" = auth.uid()::text
);

-- Policy for staff to create their own requisitions
CREATE POLICY "Staff can create own requisitions" 
ON public.requisitions 
FOR INSERT 
WITH CHECK (
  check_user_role(auth.uid(), 'staff'::text) AND 
  "staffId" = auth.uid()::text
);

-- Policy for staff to update their own pending requisitions
CREATE POLICY "Staff can update own pending requisitions" 
ON public.requisitions 
FOR UPDATE 
USING (
  check_user_role(auth.uid(), 'staff'::text) AND 
  "staffId" = auth.uid()::text AND 
  status = 'pending'::text
)
WITH CHECK (
  check_user_role(auth.uid(), 'staff'::text) AND 
  "staffId" = auth.uid()::text
);

-- Policy for authorizers to view pending and processed requisitions
CREATE POLICY "Authorizers can view relevant requisitions" 
ON public.requisitions 
FOR SELECT 
USING (
  check_user_role(auth.uid(), 'authoriser'::text)
);

-- Policy for authorizers to authorize/reject pending requisitions
CREATE POLICY "Authorizers can authorize requisitions" 
ON public.requisitions 
FOR UPDATE 
USING (
  check_user_role(auth.uid(), 'authoriser'::text) AND 
  status = 'pending'::text
)
WITH CHECK (
  check_user_role(auth.uid(), 'authoriser'::text) AND 
  status IN ('authorized'::text, 'rejected'::text)
);

-- Policy for approvers to view authorized and processed requisitions
CREATE POLICY "Approvers can view relevant requisitions" 
ON public.requisitions 
FOR SELECT 
USING (
  check_user_role(auth.uid(), 'approver'::text)
);

-- Policy for approvers to approve/reject authorized requisitions
CREATE POLICY "Approvers can approve requisitions" 
ON public.requisitions 
FOR UPDATE 
USING (
  check_user_role(auth.uid(), 'approver'::text) AND 
  status = 'authorized'::text
)
WITH CHECK (
  check_user_role(auth.uid(), 'approver'::text) AND 
  status IN ('approved'::text, 'rejected'::text)
);

-- Policy for admins to have full access
CREATE POLICY "Admins can view all requisitions" 
ON public.requisitions 
FOR SELECT 
USING (check_user_role(auth.uid(), 'admin'::text));

CREATE POLICY "Admins can update all requisitions" 
ON public.requisitions 
FOR UPDATE 
USING (check_user_role(auth.uid(), 'admin'::text))
WITH CHECK (check_user_role(auth.uid(), 'admin'::text));

CREATE POLICY "Admins can insert requisitions" 
ON public.requisitions 
FOR INSERT 
WITH CHECK (check_user_role(auth.uid(), 'admin'::text));

CREATE POLICY "Admins can delete requisitions" 
ON public.requisitions 
FOR DELETE 
USING (check_user_role(auth.uid(), 'admin'::text));