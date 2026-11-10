DO $$
BEGIN
  IF to_regtype('public.app_role') IS NULL THEN
    EXECUTE 'CREATE TYPE public.app_role AS ENUM (''admin'', ''user'')';
  ELSIF (
    SELECT array_agg(enumlabel::text ORDER BY enumsortorder)
    FROM pg_enum
    WHERE enumtypid = 'public.app_role'::regtype
  ) IS DISTINCT FROM ARRAY['admin', 'user']::text[] THEN
    RAISE EXCEPTION 'public.app_role already exists with unexpected values';
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_roles'
      AND column_name = 'id'
      AND data_type = 'uuid'
  ) OR NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_roles'
      AND column_name = 'user_id'
      AND data_type = 'uuid'
  ) OR NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_roles'
      AND column_name = 'role'
      AND udt_schema = 'public'
      AND udt_name = 'app_role'
  ) THEN
    RAISE EXCEPTION 'public.user_roles has an unexpected schema';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'user_roles'
      AND p.polcmd IN ('a', 'w', 'd', '*')
  ) THEN
    RAISE EXCEPTION 'public.user_roles has write policies; review them before applying';
  END IF;
END;
$$;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.user_roles FROM anon, authenticated;
GRANT SELECT ON TABLE public.user_roles TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'user_roles'
      AND p.polname IN ('Users can view their own role', 'ler próprio papel')
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view their own role"
      ON public.user_roles
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id)';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'::public.app_role
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE POLICY "Admins only can delete ships"
  ON public.navios
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins only can delete transport operations"
  ON public.registro_operacoes
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (public.is_admin());
