-- Fix the ambiguous signature_url reference in update_user_profile function
CREATE OR REPLACE FUNCTION public.update_user_profile(profile_name text, profile_email text, signature_url text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Update only allowed fields, never roles
  -- Use table alias to avoid ambiguous column reference
  UPDATE public.profiles p
  SET 
    name = profile_name,
    email = profile_email,
    signature_url = COALESCE(update_user_profile.signature_url, p.signature_url)
  WHERE p.id = auth.uid();
END;
$function$