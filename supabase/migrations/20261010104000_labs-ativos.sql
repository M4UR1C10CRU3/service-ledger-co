-- ============================================================================
-- CLARIZA LABS · Ativos dos clientes (Produto Digital e Infraestrutura & Cloud)
-- ----------------------------------------------------------------------------
-- Tudo o que a Webtech gere em nome de um cliente e que tem dono, fornecedor e
-- data de renovação: domínios, alojamento, repositórios, ambientes, contas de
-- email, certificados (Produto Digital) e VPS, servidores, equipamentos de rede,
-- licenças (Infraestrutura & Cloud). Uma só tabela para os dois núcleos, porque
-- é a mesma pergunta: «o que é que este cliente tem, onde está, e quando
-- renova?» — e é daqui que saem os alertas de renovação a 30, 15 e 7 dias.
--
-- SEGURANÇA: esta tabela NUNCA guarda palavras-passe, chaves nem tokens. O
-- campo `acesso_onde` diz só ONDE estão os acessos (ex.: «Bitwarden → Cliente X
-- → Router»). Os acessos vivem no cofre, não na base de dados.
--
-- Regras do Agency mantidas: empresa_id NOT NULL, RLS com USING e WITH CHECK,
-- FK composta para o núcleo, empresa_id imutável.
-- NÃO-DESTRUTIVO: só cria. Nenhum DROP, DELETE, TRUNCATE nem UPDATE.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lb_ativos (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id            UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id            UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  cliente_nome          TEXT,
  nucleo_id             UUID,
  tipo                  TEXT NOT NULL CHECK (tipo IN (
                          'dominio','alojamento','repositorio','ambiente','email','certificado',
                          'vps','servidor','rede','equipamento','licenca','outro')),
  nome                  TEXT NOT NULL,            -- ex.: webtechinformatica.com, VPS produção, Router sala 1
  fornecedor            TEXT,                     -- ex.: Hostinger, GitHub, Microsoft, Ubiquiti
  referencia            TEXT,                     -- ex.: URL, IP, n.º de série, ID da subscrição
  localizacao           TEXT,                     -- ex.: escritório do cliente, datacenter, cloud
  acesso_onde           TEXT,                     -- ONDE estão os acessos (nunca a palavra-passe)
  renovacao             DATE,
  periodicidade         TEXT CHECK (periodicidade IS NULL OR periodicidade IN ('mensal','trimestral','anual','bienal','unica')),
  renovacao_automatica  BOOLEAN NOT NULL DEFAULT FALSE,
  custo                 NUMERIC(12,2),            -- o que a Webtech paga
  preco_cliente         NUMERIC(12,2),            -- o que o cliente paga
  moeda                 TEXT CHECK (moeda IS NULL OR moeda IN ('EUR','BRL')),
  estado                TEXT NOT NULL DEFAULT 'ativo' CHECK (estado IN ('ativo','cancelado')),
  notas                 TEXT,
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, empresa_id),
  FOREIGN KEY (nucleo_id, empresa_id) REFERENCES public.lb_nucleos (id, empresa_id)
);

CREATE INDEX IF NOT EXISTS lb_ativos_renovacao_idx ON public.lb_ativos (empresa_id, renovacao) WHERE estado = 'ativo';
CREATE INDEX IF NOT EXISTS lb_ativos_cliente_idx   ON public.lb_ativos (cliente_id) WHERE cliente_id IS NOT NULL;

ALTER TABLE public.lb_ativos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE schemaname = 'public' AND tablename = 'lb_ativos' AND policyname = 'lb_ativos_empresa') THEN
    CREATE POLICY lb_ativos_empresa ON public.lb_ativos
      FOR ALL
      USING      ((SELECT user_has_empresa_access(empresa_id)))
      WITH CHECK ((SELECT user_has_empresa_access(empresa_id)));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'lb_ativos_tranca_empresa') THEN
    CREATE TRIGGER lb_ativos_tranca_empresa
      BEFORE UPDATE ON public.lb_ativos
      FOR EACH ROW EXECUTE FUNCTION public.ag_tranca_empresa_id();
  END IF;
END $$;

COMMENT ON TABLE  public.lb_ativos IS 'Clariza Labs: ativos geridos para clientes (domínios, alojamento, VPS, licenças…) com datas de renovação. Nunca guarda credenciais.';
COMMENT ON COLUMN public.lb_ativos.acesso_onde IS 'Onde estão os acessos (ex.: cofre de palavras-passe). NUNCA a palavra-passe em si.';

-- Verificação
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'lb_ativos' ORDER BY ordinal_position;
