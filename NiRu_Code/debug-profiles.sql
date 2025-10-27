-- Debug and Fix Profile Issues
-- Run this in your Supabase SQL Editor to diagnose and fix the problem

-- 1. First, let's see what's in your profiles table
SELECT 
  id, 
  name, 
  email, 
  roles, 
  created_at,
  CASE 
    WHEN name = 'EMPTY' OR name IS NULL OR name = '' THEN 'MISSING_NAME'
    WHEN email = 'EMPTY' OR email IS NULL OR email = '' THEN 'MISSING_EMAIL'
    ELSE 'OK'
  END as status
FROM public.profiles 
ORDER BY created_at DESC;

-- 2. Check what's in auth.users for comparison
SELECT 
  id,
  email,
  raw_user_meta_data->>'name' as meta_name,
  raw_user_meta_data->>'full_name' as meta_full_name,
  created_at
FROM auth.users 
ORDER BY created_at DESC;

-- 3. Fix any empty profiles by pulling data from auth.users
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

-- 4. Check if the trigger function exists and is working
SELECT 
  proname as function_name,
  prosrc as function_body
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- 5. Check if the trigger exists
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- 6. Recreate the trigger function to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_name text;
  user_email text;
BEGIN
  -- Always use the email from auth.users
  user_email := NEW.email;
  
  -- Extract name with multiple fallback strategies
  user_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
    INITCAP(SPLIT_PART(NEW.email, '@', 1))
  );
  
  -- Ensure we never have empty values
  IF user_name IS NULL OR user_name = '' OR user_name = 'EMPTY' THEN
    user_name := INITCAP(SPLIT_PART(NEW.email, '@', 1));
  END IF;
  
  IF user_email IS NULL OR user_email = '' OR user_email = 'EMPTY' THEN
    user_email := NEW.email;
  END IF;
  
  -- Insert the profile with guaranteed non-empty values
  INSERT INTO public.profiles (id, name, email, roles)
  VALUES (
    NEW.id,
    user_name,
    user_email,
    ARRAY['staff']
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- 7. Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- 8. Final check - see the results
SELECT 
  'FINAL CHECK' as status,
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN name = 'EMPTY' OR name IS NULL OR name = '' THEN 1 END) as missing_names,
  COUNT(CASE WHEN email = 'EMPTY' OR email IS NULL OR email = '' THEN 1 END) as missing_emails
FROM public.profiles;
