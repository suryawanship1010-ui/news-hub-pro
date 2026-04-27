-- 1. Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'reporter');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer helper to avoid recursive RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_roles()
RETURNS SETOF app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid();
$$;

-- user_roles policies
CREATE POLICY "users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admins read all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins insert roles" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update roles" ON public.user_roles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete roles" ON public.user_roles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 2. Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles readable by authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "admins delete profiles" ON public.profiles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 3. Articles
CREATE TYPE public.article_status AS ENUM ('draft', 'published');

CREATE TABLE public.articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text,
  excerpt text,
  content text,
  image_url text,
  category text,
  status article_status NOT NULL DEFAULT 'draft',
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX articles_author_idx ON public.articles(author_id);
CREATE INDEX articles_status_idx ON public.articles(status);
CREATE INDEX articles_created_idx ON public.articles(created_at DESC);
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "admins select articles" ON public.articles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins insert articles" ON public.articles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update articles" ON public.articles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete articles" ON public.articles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Reporters: own articles only
CREATE POLICY "reporters select own" ON public.articles
  FOR SELECT TO authenticated USING (author_id = auth.uid());
CREATE POLICY "reporters insert own" ON public.articles
  FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "reporters update own" ON public.articles
  FOR UPDATE TO authenticated USING (author_id = auth.uid());
CREATE POLICY "reporters delete own" ON public.articles
  FOR DELETE TO authenticated USING (author_id = auth.uid());

-- Any authenticated user can read published articles (for Feed/Live)
CREATE POLICY "published articles visible to authenticated" ON public.articles
  FOR SELECT TO authenticated USING (status = 'published');

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER articles_updated_at BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Auto-create profile + assign reporter role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'reporter')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();