-- ============================================================
-- Módulo Quadros (Trello-like) — Clariza Manager 2026-06-17
-- MIGRAÇÃO NÃO DESTRUTIVA — ADD/CREATE IF NOT EXISTS apenas
-- ============================================================

-- ── Tabelas ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.quadros (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL,
  descricao     TEXT,
  cor           TEXT NOT NULL DEFAULT '#6366f1',
  arquivado     BOOLEAN NOT NULL DEFAULT false,
  criado_por    UUID REFERENCES auth.users(id),
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quadro_listas (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quadro_id UUID NOT NULL REFERENCES public.quadros(id) ON DELETE CASCADE,
  nome      TEXT NOT NULL,
  posicao   INTEGER NOT NULL DEFAULT 0,
  arquivado BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quadro_cartoes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lista_id              UUID NOT NULL REFERENCES public.quadro_listas(id) ON DELETE CASCADE,
  empresa_id            UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  titulo                TEXT NOT NULL,
  descricao             TEXT,
  cor                   TEXT,
  data_limite           TIMESTAMPTZ,
  data_limite_concluida BOOLEAN NOT NULL DEFAULT false,
  posicao               INTEGER NOT NULL DEFAULT 0,
  arquivado             BOOLEAN NOT NULL DEFAULT false,
  criado_por            UUID REFERENCES auth.users(id),
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cartao_etiquetas (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quadro_id UUID NOT NULL REFERENCES public.quadros(id) ON DELETE CASCADE,
  nome      TEXT NOT NULL DEFAULT '',
  cor       TEXT NOT NULL DEFAULT '#6366f1'
);

CREATE TABLE IF NOT EXISTS public.cartao_etiqueta_rel (
  cartao_id   UUID NOT NULL REFERENCES public.quadro_cartoes(id) ON DELETE CASCADE,
  etiqueta_id UUID NOT NULL REFERENCES public.cartao_etiquetas(id) ON DELETE CASCADE,
  PRIMARY KEY (cartao_id, etiqueta_id)
);

CREATE TABLE IF NOT EXISTS public.cartao_checklists (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cartao_id UUID NOT NULL REFERENCES public.quadro_cartoes(id) ON DELETE CASCADE,
  titulo    TEXT NOT NULL DEFAULT 'Checklist',
  posicao   INTEGER NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cartao_checklist_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES public.cartao_checklists(id) ON DELETE CASCADE,
  texto        TEXT NOT NULL,
  concluido    BOOLEAN NOT NULL DEFAULT false,
  posicao      INTEGER NOT NULL DEFAULT 0,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Feed do cartão: comentários (tipo='comentario') + atividade automática (tipo='atividade')
CREATE TABLE IF NOT EXISTS public.cartao_comentarios (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cartao_id     UUID NOT NULL REFERENCES public.quadro_cartoes(id) ON DELETE CASCADE,
  autor_id      UUID REFERENCES auth.users(id),
  autor_nome    TEXT,
  texto         TEXT NOT NULL,
  tipo          TEXT NOT NULL DEFAULT 'comentario' CHECK (tipo IN ('comentario', 'atividade')),
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cartao_membros (
  cartao_id     UUID NOT NULL REFERENCES public.quadro_cartoes(id) ON DELETE CASCADE,
  utilizador_id UUID NOT NULL,
  nome          TEXT,
  PRIMARY KEY (cartao_id, utilizador_id)
);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.quadros                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quadro_listas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quadro_cartoes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cartao_etiquetas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cartao_etiqueta_rel    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cartao_checklists      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cartao_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cartao_comentarios     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cartao_membros         ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'quadros','quadro_listas','quadro_cartoes','cartao_etiquetas','cartao_etiqueta_rel',
    'cartao_checklists','cartao_checklist_items','cartao_comentarios','cartao_membros'
  ] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = t || '_auth' AND tablename = t AND schemaname = 'public') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)', t || '_auth', t);
    END IF;
  END LOOP;
END $$;

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_quadros_empresa      ON public.quadros(empresa_id, arquivado);
CREATE INDEX IF NOT EXISTS idx_listas_quadro        ON public.quadro_listas(quadro_id, posicao);
CREATE INDEX IF NOT EXISTS idx_cartoes_lista        ON public.quadro_cartoes(lista_id, posicao);
CREATE INDEX IF NOT EXISTS idx_cartoes_empresa      ON public.quadro_cartoes(empresa_id, arquivado);
CREATE INDEX IF NOT EXISTS idx_etiquetas_quadro     ON public.cartao_etiquetas(quadro_id);
CREATE INDEX IF NOT EXISTS idx_checklists_cartao    ON public.cartao_checklists(cartao_id, posicao);
CREATE INDEX IF NOT EXISTS idx_checklist_items_cl   ON public.cartao_checklist_items(checklist_id, posicao);
CREATE INDEX IF NOT EXISTS idx_comentarios_cartao   ON public.cartao_comentarios(cartao_id, criado_em);
CREATE INDEX IF NOT EXISTS idx_membros_cartao       ON public.cartao_membros(cartao_id);
