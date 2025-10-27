-- Fix the profile update function to ensure it works correctly
-- This ensures the profile page can save data properly

-- Drop and recreate the update_user_profile function with better error handling
DROP FUNCTION IF EXISTS public.update_user_profile(text, text, text);

CREATE OR REPLACE FUNCTION public.update_user_profile(
  profile_name text,
  profile_email text,
  signature_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Validate inputs
  IF profile_name IS NULL OR profile_name = '' OR profile_name = 'EMPTY' THEN
    RAISE EXCEPTION 'Profile name cannot be empty';
  END IF;
  
  IF profile_email IS NULL OR profile_email = '' OR profile_email = 'EMPTY' THEN
    RAISE EXCEPTION 'Profile email cannot be empty';
  END IF;
  
  -- Update the profile
  UPDATE public.profiles 
  SET 
    name = profile_name,
    email = profile_email,
    signature_url = update_user_profile.signature_url
  WHERE id = auth.uid();
  
  -- Check if the update actually happened
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for user %', auth.uid();
  END IF;
  
  -- Log successful update
  RAISE NOTICE 'Profile updated successfully for user %', auth.uid();
END;
$$;

-- Test the function (this will show if it works)
-- You can run this to test: SELECT public.update_user_profile('Test Name', 'test@elimu.ca');
