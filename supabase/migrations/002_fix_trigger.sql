-- Fix handle_new_user trigger
-- Paste this in Supabase SQL Editor and click Run

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name     TEXT;
  v_role     TEXT;
  v_phone    TEXT;
  v_language TEXT;
BEGIN
  v_name     := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  v_role     := COALESCE(NEW.raw_user_meta_data->>'role', 'TENANT');
  v_phone    := NEW.raw_user_meta_data->>'phone';
  v_language := COALESCE(NEW.raw_user_meta_data->>'language', 'en');

  IF v_role NOT IN ('TENANT', 'LANDLORD', 'ADMIN') THEN
    v_role := 'TENANT';
  END IF;

  INSERT INTO public.profiles (id, email, name, role, phone, language)
  VALUES (
    NEW.id,
    NEW.email,
    v_name,
    v_role::user_role,
    v_phone,
    v_language
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
