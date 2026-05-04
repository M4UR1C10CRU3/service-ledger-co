
-- Shared editorial calendar posts per (empresa, year, month, day)
CREATE TABLE IF NOT EXISTS public.marketing_editorial_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  ano integer NOT NULL,
  mes integer NOT NULL,
  dia integer NOT NULL,
  post jsonb NOT NULL,
  tarefa_id uuid NULL,
  updated_by uuid NULL,
  updated_by_nome text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, ano, mes, dia)
);

CREATE INDEX IF NOT EXISTS idx_marketing_editorial_posts_lookup
  ON public.marketing_editorial_posts (empresa_id, ano, mes);

ALTER TABLE public.marketing_editorial_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth read editorial posts" ON public.marketing_editorial_posts;
CREATE POLICY "auth read editorial posts"
  ON public.marketing_editorial_posts FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth insert editorial posts" ON public.marketing_editorial_posts;
CREATE POLICY "auth insert editorial posts"
  ON public.marketing_editorial_posts FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth update editorial posts" ON public.marketing_editorial_posts;
CREATE POLICY "auth update editorial posts"
  ON public.marketing_editorial_posts FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth delete editorial posts" ON public.marketing_editorial_posts;
CREATE POLICY "auth delete editorial posts"
  ON public.marketing_editorial_posts FOR DELETE
  TO authenticated USING (true);

-- Realtime
ALTER TABLE public.marketing_editorial_posts REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='marketing_editorial_posts'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.marketing_editorial_posts';
  END IF;
END $$;

-- Auto updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at_marketing_editorial_posts()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_set_updated_at_marketing_editorial_posts ON public.marketing_editorial_posts;
CREATE TRIGGER trg_set_updated_at_marketing_editorial_posts
  BEFORE UPDATE ON public.marketing_editorial_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_marketing_editorial_posts();
