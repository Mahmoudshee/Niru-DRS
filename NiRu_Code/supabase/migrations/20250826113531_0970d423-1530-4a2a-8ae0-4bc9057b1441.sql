-- Enable RLS on all tables that need it
ALTER TABLE IF EXISTS public.requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- Fix function search paths
CREATE OR REPLACE FUNCTION public.check_user_role(user_id uuid, required_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = 'public'
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

CREATE OR REPLACE FUNCTION public.user_has_role(user_id uuid, required_role text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT public.check_user_role(user_id, required_role);
$$;