-- =============================================
-- PloiBib Migration: Email Auth Support
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Make phone nullable (we use email auth for MVP)
ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;

-- 2. Add email column
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;

-- 3. Auto-create public.users row when auth.users signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, is_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    TRUE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop if exists then recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Add INSERT policy for users (needed for the trigger)
DROP POLICY IF EXISTS "Service role can insert users" ON users;
CREATE POLICY "Service role can insert users" ON users FOR INSERT WITH CHECK (true);

-- 5. Add bib_gender column to listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS bib_gender VARCHAR(10);

-- 6. Add shirt_size and finisher_size columns to listings  
ALTER TABLE listings ADD COLUMN IF NOT EXISTS shirt_size VARCHAR(10);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS finisher_shirt_size VARCHAR(10);

-- 7. Allow events to be read by everyone (even not logged in)
DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;
CREATE POLICY "Events are viewable by everyone" ON events FOR SELECT USING (true);

-- Enable RLS on events if not already
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
