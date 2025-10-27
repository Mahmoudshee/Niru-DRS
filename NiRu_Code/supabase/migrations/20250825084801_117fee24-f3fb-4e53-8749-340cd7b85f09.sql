-- Fix security linter warnings: Set search_path for security definer functions

-- Fix function search_path mutable warnings by setting explicit search_path
CREATE OR REPLACE FUNCTION public.get_user_roles(user_id uuid)
RETURNS text[]
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT roles FROM public.profiles WHERE id = user_id;
$$;

CREATE OR REPLACE FUNCTION public.user_has_role(user_id uuid, required_role text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT required_role = ANY(COALESCE(public.get_user_roles(user_id), ARRAY[]::text[]));
$$;