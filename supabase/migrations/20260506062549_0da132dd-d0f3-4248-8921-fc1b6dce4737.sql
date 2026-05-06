
-- Add approval workflow columns to news
ALTER TABLE public.news
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS admin_remark text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- Index for fast status filtering
CREATE INDEX IF NOT EXISTS idx_news_status ON public.news (status);

-- Update existing rows to 'approved' so they remain visible in Flutter
UPDATE public.news SET status = 'approved' WHERE status = 'draft';

-- Update get_admin_stats to include pending count
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total',   (SELECT count(*) FROM public.news),
    'recent',  (SELECT count(*) FROM public.news WHERE created_at >= now() - interval '7 days'),
    'pending', (SELECT count(*) FROM public.news WHERE status = 'pending'),
    'ads',     (SELECT count(*) FROM public.ads WHERE active = true),
    'users',   (SELECT count(*) FROM public.profiles)
  );
$$;

-- Update handle_new_user to NOT auto-assign 'user' role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  -- No longer auto-assigning 'user' role; roles are managed from Flutter app or database directly
  RETURN NEW;
END;
$$;
