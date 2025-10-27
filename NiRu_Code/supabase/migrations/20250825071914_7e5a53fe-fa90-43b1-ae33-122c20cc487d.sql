-- Fix the security warning by setting search_path for the function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, roles)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'name', new.email),
        new.email,
        ARRAY['staff']
    );
    RETURN new;
END;
$$;