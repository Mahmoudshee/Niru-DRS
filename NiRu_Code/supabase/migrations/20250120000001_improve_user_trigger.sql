-- Improve the handle_new_user function to prevent empty profiles
-- This ensures profiles are always created with proper name and email values

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
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;
