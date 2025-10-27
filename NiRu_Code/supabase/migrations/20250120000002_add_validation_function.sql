-- Add a validation function to check for empty profiles
-- This can be run periodically to ensure data integrity

CREATE OR REPLACE FUNCTION public.check_empty_profiles()
RETURNS TABLE(
  profile_id uuid,
  profile_name text,
  profile_email text,
  auth_email text,
  has_issues boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.email,
    au.email as auth_email,
    (p.name = 'EMPTY' OR p.name IS NULL OR p.name = '' OR 
     p.email = 'EMPTY' OR p.email IS NULL OR p.email = '' OR
     p.email != au.email) as has_issues
  FROM public.profiles p
  JOIN auth.users au ON p.id = au.id
  WHERE p.name = 'EMPTY' OR p.name IS NULL OR p.name = '' OR 
        p.email = 'EMPTY' OR p.email IS NULL OR p.email = '' OR
        p.email != au.email;
END;
$$;

-- Add a function to auto-fix any empty profiles found
CREATE OR REPLACE FUNCTION public.auto_fix_empty_profiles()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  fixed_count integer := 0;
BEGIN
  -- Update profiles with empty values
  UPDATE public.profiles 
  SET 
    name = COALESCE(
      auth_users.raw_user_meta_data->>'name',
      auth_users.raw_user_meta_data->>'full_name', 
      INITCAP(SPLIT_PART(auth_users.email, '@', 1))
    ),
    email = auth_users.email
  FROM auth.users auth_users
  WHERE public.profiles.id = auth_users.id 
    AND (public.profiles.name = 'EMPTY' OR public.profiles.name IS NULL OR public.profiles.name = '' OR 
         public.profiles.email = 'EMPTY' OR public.profiles.email IS NULL OR public.profiles.email = '');
  
  GET DIAGNOSTICS fixed_count = ROW_COUNT;
  RETURN fixed_count;
END;
$$;
