-- Update handle_new_user function to assign all roles to new users (for hackathon demo)
-- This allows judges/testers to access all features without manual role assignment
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
  
  -- Insert the profile with guaranteed non-empty values and ALL ROLES for hackathon demo
  INSERT INTO public.profiles (id, name, email, roles)
  VALUES (
    NEW.id,
    user_name,
    user_email,
    ARRAY['staff', 'authoriser', 'approver', 'admin']
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

