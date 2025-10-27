-- Fix security warnings: Set search_path for functions to prevent search path attacks

-- Update get_user_roles function with secure search_path
CREATE OR REPLACE FUNCTION public.get_user_roles(user_id uuid)
RETURNS text[]
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT roles FROM public.profiles WHERE id = user_id;
$$;

-- Update user_has_role function with secure search_path
CREATE OR REPLACE FUNCTION public.user_has_role(user_id uuid, required_role text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT required_role = ANY(COALESCE(public.get_user_roles(user_id), ARRAY[]::text[]));
$$;