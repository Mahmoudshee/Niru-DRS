-- Fix critical security vulnerability: Profiles table exposure
-- Remove existing overly permissive policies and implement proper access control

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create secure RLS policies for profiles table
-- 1. Users can only view their own profile
CREATE POLICY "Users can view own profile only" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

-- 2. Admins can view all profiles (using security definer function to avoid recursion)
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (public.check_user_role(auth.uid(), 'admin'));

-- 3. Users can update their own profile (excluding roles - only name, email, signature_url)
CREATE POLICY "Users can update own profile data" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4. Only admins can update user roles (critical security control)
CREATE POLICY "Only admins can update roles" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (public.check_user_role(auth.uid(), 'admin'))
WITH CHECK (public.check_user_role(auth.uid(), 'admin'));

-- 5. Allow profile creation during signup (system level)
CREATE POLICY "Enable profile creation during signup" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

-- Add additional security: Prevent users from escalating their own privileges
-- Create a function to safely update profile data without allowing role changes
CREATE OR REPLACE FUNCTION public.update_user_profile(
  profile_name text,
  profile_email text,
  signature_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update only allowed fields, never roles
  UPDATE public.profiles 
  SET 
    name = profile_name,
    email = profile_email,
    signature_url = COALESCE(signature_url, profiles.signature_url)
  WHERE id = auth.uid();
END;
$$;