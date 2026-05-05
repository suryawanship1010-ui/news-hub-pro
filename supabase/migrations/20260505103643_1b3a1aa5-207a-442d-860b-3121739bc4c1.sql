-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_news_created_at ON public.news (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_created_by ON public.news (created_by);
CREATE INDEX IF NOT EXISTS idx_news_created_by_at ON public.news (created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_category ON public.news (category);

CREATE INDEX IF NOT EXISTS idx_ads_created_at ON public.ads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ads_created_by ON public.ads (created_by);
CREATE INDEX IF NOT EXISTS idx_ads_active ON public.ads (active);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);

-- Single-call admin stats
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total',  (SELECT count(*) FROM public.news),
    'recent', (SELECT count(*) FROM public.news WHERE created_at >= now() - interval '7 days'),
    'ads',    (SELECT count(*) FROM public.ads WHERE active = true),
    'users',  (SELECT count(*) FROM public.profiles)
  );
$$;

-- Single-call workspace stats for the current user
CREATE OR REPLACE FUNCTION public.get_workspace_stats()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total',  (SELECT count(*) FROM public.news WHERE created_by = auth.uid()),
    'recent', (SELECT count(*) FROM public.news WHERE created_by = auth.uid() AND created_at >= now() - interval '7 days')
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_workspace_stats() TO authenticated;