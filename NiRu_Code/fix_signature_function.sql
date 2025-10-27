-- Fix for update_user_profile function ambiguity issue
-- Run this in your Supabase SQL Editor to fix the signature_url parameter conflict

-- First drop the existing function
DROP FUNCTION IF EXISTS public.update_user_profile(text, text, text);

-- Then recreate it with the correct parameter name
CREATE OR REPLACE FUNCTION public.update_user_profile(
    profile_name text,
    profile_email text,
    signature_url_param text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.profiles
    SET 
        name = profile_name,
        email = profile_email,
        signature_url = signature_url_param
    WHERE email = profile_email;
    
    -- If no rows were updated, try to insert
    IF NOT FOUND THEN
        INSERT INTO public.profiles (id, name, email, signature_url, roles)
        VALUES (
            auth.uid(),
            profile_name,
            profile_email,
            signature_url_param,
            ARRAY['staff'::text]
        );
    END IF;
END;
$$;
