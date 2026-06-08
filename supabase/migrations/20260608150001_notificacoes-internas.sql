-- Migration: Create notificacoes_internas table
-- This table was created directly in production in a prior session and is now
-- being added to migrations for version control. Uses IF NOT EXISTS to be safe.

CREATE TABLE IF NOT EXISTS public.notificacoes_internas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL,
  titulo        TEXT NOT NULL,
  mensagem      TEXT,
  perfil_destino TEXT,      -- 'administrador' | 'gestor' | 'operacional' | 'todos' | NULL (all)
  referencia_id   UUID,
  referencia_tipo TEXT,
  lida          BOOLEAN NOT NULL DEFAULT false,
  criada_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  lida_em       TIMESTAMPTZ
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_ni_empresa_lida
  ON public.notificacoes_internas(empresa_id, lida);

CREATE INDEX IF NOT EXISTS idx_ni_empresa_criada
  ON public.notificacoes_internas(empresa_id, criada_em DESC);

-- RLS
ALTER TABLE public.notificacoes_internas ENABLE ROW LEVEL SECURITY;

-- Authenticated users within the same empresa can read
CREATE POLICY "notif_internas_select" ON public.notificacoes_internas
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Authenticated users can insert (system inserts from hooks/triggers)
CREATE POLICY "notif_internas_insert" ON public.notificacoes_internas
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can mark their own notifications as read
CREATE POLICY "notif_internas_update" ON public.notificacoes_internas
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Enable Realtime for this table (required for live notification bell)
-- Wrapped in DO block to be idempotent (no-op if already a member)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes_internas;
EXCEPTION WHEN duplicate_object THEN
  -- Already a member of the publication — no action needed
  NULL;
END;
$$;
