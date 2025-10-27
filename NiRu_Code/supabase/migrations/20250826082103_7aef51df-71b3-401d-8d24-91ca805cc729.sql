-- Create a new function that bypasses RLS to prevent circular dependencies
CREATE OR REPLACE FUNCTION public.check_user_role(user_id uuid, required_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_roles text[];
BEGIN
  -- Bypass RLS by using a security definer function
  SELECT roles INTO user_roles 
  FROM public.profiles 
  WHERE id = user_id;
  
  -- Return true if user has the required role
  RETURN required_role = ANY(COALESCE(user_roles, ARRAY[]::text[]));
END;
$$;

-- Replace the problematic user_has_role function
CREATE OR REPLACE FUNCTION public.user_has_role(user_id uuid, required_role text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT public.check_user_role(user_id, required_role);
$$;