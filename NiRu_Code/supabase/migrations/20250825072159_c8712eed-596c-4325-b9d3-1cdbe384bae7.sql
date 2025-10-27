-- Fix the function search path security issue
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;