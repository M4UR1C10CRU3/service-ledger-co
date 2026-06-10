-- Migration: empresa_smtp_configs
-- Stores outbound SMTP credentials per empresa per department type.
-- Service-role only (Edge Function reads this; no RLS policy = deny all authenticated/anon).
-- NEVER commit credential INSERT statements to this file — use the Supabase dashboard
-- or scripts/seed-smtp-credentials.sql (gitignored).

CREATE TABLE IF NOT EXISTS public.empresa_smtp_configs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL CHECK (tipo IN ('comercial', 'compras', 'financeiro', 'contabilidade')),
  email           TEXT NOT NULL,
  nome_exibicao   TEXT NOT NULL,
  smtp_host       TEXT NOT NULL DEFAULT 'smtp.hostinger.com',
  smtp_port       INTEGER NOT NULL DEFAULT 465,
  smtp_user       TEXT NOT NULL,
  smtp_pass       TEXT NOT NULL,
  ativo           BOOLEAN NOT NULL DEFAULT true,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, tipo)
);

ALTER TABLE public.empresa_smtp_configs ENABLE ROW LEVEL SECURITY;
-- No SELECT/INSERT/UPDATE/DELETE policies → only service role (Edge Functions) can access.
