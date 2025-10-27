-- Fix the user_has_role function to prevent timeouts and RLS recursion
-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS user_has_role(uuid, text);

-- Create a new optimized user_has_role function
CREATE OR REPLACE FUNCTION user_has_role(user_id uuid, role_name text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = user_id 
    AND role_name = ANY(roles)
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION user_has_role(uuid, text) TO authenticated;