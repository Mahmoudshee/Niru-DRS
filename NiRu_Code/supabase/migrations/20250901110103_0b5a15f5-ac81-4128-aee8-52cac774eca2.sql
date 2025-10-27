-- Update existing profiles with missing names and emails from auth.users
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
  AND (public.profiles.name IS NULL OR public.profiles.name = '' OR public.profiles.email IS NULL OR public.profiles.email = '');

-- Improve the handle_new_user function to better extract user information
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, roles)
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'name',
            NEW.raw_user_meta_data->>'full_name',
            SPLIT_PART(NEW.email, '@', 1)
        ),
        NEW.email,
        ARRAY['staff']
    );
    RETURN NEW;
END;
$$;