-- Drop the restrictive audit log policy that blocks non-admins
DROP POLICY IF EXISTS "Only admins can view audit logs" ON audit_logs;

-- Create a more permissive policy that allows users to view audit logs for requisitions they have access to
CREATE POLICY "Users can view audit logs for accessible requisitions"
ON audit_logs
FOR SELECT
USING (
  -- Admins can see all audit logs
  check_user_role(auth.uid(), 'admin'::text)
  OR
  -- Authorizers can see all audit logs
  check_user_role(auth.uid(), 'authoriser'::text)
  OR
  -- Approvers can see all audit logs
  check_user_role(auth.uid(), 'approver'::text)
  OR
  -- Staff can see audit logs for their own requisitions
  (
    check_user_role(auth.uid(), 'staff'::text)
    AND EXISTS (
      SELECT 1 FROM requisitions 
      WHERE requisitions.id = audit_logs."requisitionId" 
      AND requisitions."staffId" = (auth.uid())::text
    )
  )
);