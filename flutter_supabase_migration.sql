-- =====================================================
-- Run this on the Flutter project's Supabase to enable
-- the React Admin / Reporter panel features.
-- Idempotent: safe to run multiple times.
-- =====================================================

-- 1. News approval workflow columns
ALTER TABLE public.news
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS admin_remark text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid;

CREATE INDEX IF NOT EXISTS idx_news_status      ON public.news (status);
CREATE INDEX IF NOT EXISTS idx_news_created_by  ON public.news (created_by);
CREATE INDEX IF NOT EXISTS idx_news_created_at  ON public.news (created_at DESC);

-- Make sure existing articles stay visible to Flutter readers
UPDATE public.news SET status = 'approved' WHERE status IS NULL OR status = 'draft';

-- 2. Ads table (admins + reporters)
CREATE TABLE IF NOT EXISTS public.ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  image_url text,
  link_url text,
  placement text DEFAULT 'feed',
  active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ads_active      ON public.ads (active);
CREATE INDEX IF NOT EXISTS idx_ads_created_at  ON public.ads (created_at DESC);

ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- 3. Allow 'reporter' in user_roles check constraint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints
             WHERE constraint_name = 'user_roles_role_check') THEN
    ALTER TABLE public.user_roles DROP CONSTRAINT user_roles_role_check;
  END IF;
END $$;
ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_role_check
  CHECK (role = ANY (ARRAY['user'::text, 'reporter'::text, 'admin'::text]));

-- 4. Helper functions
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.has_role(_role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.get_my_roles()
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(array_agg(role), ARRAY[]::text[]) FROM public.user_roles WHERE user_id = auth.uid();
$$;

-- 5. RLS policies for news (replace existing if needed)
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "news read authenticated"          ON public.news;
DROP POLICY IF EXISTS "news insert admin or reporter own" ON public.news;
DROP POLICY IF EXISTS "news update admin or own"         ON public.news;
DROP POLICY IF EXISTS "news delete admin or own"         ON public.news;

CREATE POLICY "news read authenticated" ON public.news FOR SELECT TO authenticated USING (true);
CREATE POLICY "news insert admin or reporter own" ON public.news FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) OR (public.has_role('reporter') AND created_by = auth.uid()));
CREATE POLICY "news update admin or own" ON public.news FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR created_by = auth.uid());
CREATE POLICY "news delete admin or own" ON public.news FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) OR created_by = auth.uid());

-- 6. RLS policies for ads
DROP POLICY IF EXISTS "ads read authenticated"          ON public.ads;
DROP POLICY IF EXISTS "ads insert admin or reporter own" ON public.ads;
DROP POLICY IF EXISTS "ads update admin or own"         ON public.ads;
DROP POLICY IF EXISTS "ads delete admin or own"         ON public.ads;

CREATE POLICY "ads read authenticated" ON public.ads FOR SELECT TO authenticated USING (true);
CREATE POLICY "ads insert admin or reporter own" ON public.ads FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) OR (public.has_role('reporter') AND created_by = auth.uid()));
CREATE POLICY "ads update admin or own" ON public.ads FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR created_by = auth.uid());
CREATE POLICY "ads delete admin or own" ON public.ads FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) OR created_by = auth.uid());

-- 7. Stats RPCs
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'total',   (SELECT count(*) FROM public.news),
    'recent',  (SELECT count(*) FROM public.news WHERE created_at >= now() - interval '7 days'),
    'pending', (SELECT count(*) FROM public.news WHERE status = 'pending'),
    'ads',     (SELECT count(*) FROM public.ads WHERE active = true),
    'users',   (SELECT count(*) FROM public.profiles)
  );
$$;

CREATE OR REPLACE FUNCTION public.get_workspace_stats()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'total',  (SELECT count(*) FROM public.news WHERE created_by = auth.uid()),
    'recent', (SELECT count(*) FROM public.news WHERE created_by = auth.uid() AND created_at >= now() - interval '7 days')
  );
$$;

-- 8. Stop auto-assigning 'user' role on signup (Flutter app handles roles)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name',
                                       NEW.raw_user_meta_data->>'display_name',
                                       split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;

-- =====================================================
-- IMPORTANT (Flutter app):
-- When fetching news to display to end users, always filter:
--   .eq('status', 'approved')
-- so unreviewed/rejected articles don't appear.
-- =====================================================
