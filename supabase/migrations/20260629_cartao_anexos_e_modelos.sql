-- ============================================================
-- Anexos e Modelos de Checklist para Quadros
-- MIGRAÇÃO NÃO DESTRUTIVA — usar no Supabase Dashboard > SQL Editor
-- ============================================================

-- ── Anexos dos cartões (links / URLs) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cartao_anexos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cartao_id           UUID NOT NULL REFERENCES public.quadro_cartoes(id) ON DELETE CASCADE,
  empresa_id          UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome                TEXT NOT NULL,
  url                 TEXT NOT NULL,
  tipo                TEXT,
  adicionado_por_id   UUID REFERENCES auth.users(id),
  adicionado_por_nome TEXT,
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cartao_anexos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'cartao_anexos_auth' AND tablename = 'cartao_anexos' AND schemaname = 'public'
  ) THEN
    CREATE POLICY cartao_anexos_auth ON public.cartao_anexos
      FOR ALL TO authenticated
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cartao_anexos ON public.cartao_anexos(cartao_id, criado_em);

-- ── Modelos de checklist para quadros ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cartao_checklist_modelos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome       TEXT NOT NULL,
  criado_por UUID REFERENCES auth.users(id),
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cartao_checklist_modelo_itens (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_id UUID NOT NULL REFERENCES public.cartao_checklist_modelos(id) ON DELETE CASCADE,
  texto     TEXT NOT NULL,
  posicao   INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.cartao_checklist_modelos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cartao_checklist_modelo_itens ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'cartao_checklist_modelos_auth' AND tablename = 'cartao_checklist_modelos' AND schemaname = 'public'
  ) THEN
    CREATE POLICY cartao_checklist_modelos_auth ON public.cartao_checklist_modelos
      FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'cartao_checklist_modelo_itens_auth' AND tablename = 'cartao_checklist_modelo_itens' AND schemaname = 'public'
  ) THEN
    CREATE POLICY cartao_checklist_modelo_itens_auth ON public.cartao_checklist_modelo_itens
      FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cartao_checklist_modelos      ON public.cartao_checklist_modelos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_cartao_checklist_modelo_itens ON public.cartao_checklist_modelo_itens(modelo_id, posicao);
