-- ============================================================
-- BKWB Database Migration
-- Run this in your Supabase SQL Editor (https://supabase.com)
-- ============================================================

-- 1. Create the roles table
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
);

-- 2. Seed the roles
INSERT INTO public.roles (name) VALUES
  ('super_admin'),
  ('staff'),
  ('resident'),
  ('meter_reader')
ON CONFLICT (name) DO NOTHING;

-- 3. Create the profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id),
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  phone TEXT,
  email TEXT NOT NULL,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- 5. Policies
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Anyone can read roles"
  ON public.roles
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- 6. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    (SELECT id FROM public.roles WHERE name = 'resident' LIMIT 1)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 7. Updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- AFTER RUNNING: Assign roles to your users
-- ============================================================
-- 1. Go to Authentication > Users in Supabase dashboard
-- 2. Create users with email + password
-- 3. The trigger auto-creates a profile with 'resident' role
-- 4. Update the role for desktop access:
--
--    UPDATE public.profiles
--    SET role_id = (SELECT id FROM public.roles WHERE name = 'staff')
--    WHERE id = '<user-uuid>';
--
--    UPDATE public.profiles
--    SET role_id = (SELECT id FROM public.roles WHERE name = 'super_admin')
--    WHERE id = '<user-uuid>';
-- ============================================================
