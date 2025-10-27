-- Fix Empty Profiles - Simple Solution
-- Updates all profiles with "EMPTY" values by pulling correct data from auth.users

UPDATE public.profiles 
SET 
  name = COALESCE(
    auth_users.raw_user_meta_data->>'name',
    auth_users.raw_user_meta_data->>'full_name', 
    SPLIT_PART(auth_users.email, '@', 1)
  ),
  email = auth_users.email
FROM auth.users auth_users
WHERE public.profiles.id = auth_users.id 
  AND (public.profiles.name = 'EMPTY' OR public.profiles.name IS NULL OR public.profiles.name = '' OR public.profiles.email = 'EMPTY' OR public.profiles.email IS NULL OR public.profiles.email = '');
