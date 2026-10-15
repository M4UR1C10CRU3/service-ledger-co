-- CLARIZA LABS · Área de cliente — PARTE 1 de 3: tabela dos links e validação do token
-- Correr por ordem: 1 → 2 → 3. Só cria; nenhum DROP, DELETE nem TRUNCATE.
-- O token do link nunca é guardado: só o SHA-256 dele (hex).

CREATE TABLE IF NOT EXISTS public.lb_portal_acessos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id        UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id        UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  cliente_nome      TEXT,
  token_hash        TEXT NOT NULL UNIQUE,
  expira_em         TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '180 days'),
  revogado_em       TIMESTAMPTZ,
  ultimo_acesso_em  TIMESTAMPTZ,
  criado_por        TEXT,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lb_portal_acessos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE schemaname = 'public' AND tablename = 'lb_portal_acessos' AND policyname = 'lb_portal_acessos_empresa') THEN
    CREATE POLICY lb_portal_acessos_empresa ON public.lb_portal_acessos
      FOR ALL
      USING      ((SELECT user_has_empresa_access(empresa_id)))
      WITH CHECK ((SELECT user_has_empresa_access(empresa_id)));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'lb_portal_acessos_tranca_empresa') THEN
    CREATE TRIGGER lb_portal_acessos_tranca_empresa
      BEFORE UPDATE ON public.lb_portal_acessos
      FOR EACH ROW EXECUTE FUNCTION public.ag_tranca_empresa_id();
  END IF;
END $$;

COMMENT ON TABLE public.lb_portal_acessos IS 'Clariza Labs · Área de cliente: links pessoais (só o hash do token), com validade e revogação.';

-- Validação do token: uso interno das funções do portal (o browser não a pode chamar).
CREATE OR REPLACE FUNCTION public.lb_portal_acesso(p_token TEXT)
RETURNS public.lb_portal_acessos
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.* FROM public.lb_portal_acessos a
  WHERE a.token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex')
    AND a.revogado_em IS NULL AND a.expira_em > now()
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.lb_portal_acesso(TEXT) FROM PUBLIC, anon, authenticated;
