-- ============================================================================
-- CLARIZA LABS · Fase 2 — núcleo em todo o lado; língua e moeda por cliente
-- ----------------------------------------------------------------------------
-- Pressupõe a fase 1 (lb_nucleos).
--
-- NÃO-DESTRUTIVO:
--   · só CREATE TABLE IF NOT EXISTS e ADD COLUMN IF NOT EXISTS;
--   · todas as colunas novas são NULLABLE e sem default — acrescentá-las é uma
--     alteração de metadados, instantânea, que não reescreve tabelas;
--   · as FKs e CHECKs novos em tabelas que já têm dados entram NOT VALID: valem
--     para o que se gravar daqui para a frente e não varrem as linhas antigas
--     (que de qualquer modo têm a coluna a NULL);
--   · nenhum DROP, DELETE, TRUNCATE nem UPDATE.
--
-- Tabelas PARTILHADAS com outras empresas (Obrajusta, Tudo Casa, Resiserv…):
--   followup_oportunidades, ordens_servico, services, accounts_payable.
--   Recebem só `nucleo_id` (e, nas duas de dinheiro, `moeda` e `taxa_eur`), todas
--   NULL. Os ecrãs genéricos não as pedem nem as mostram; para essas empresas
--   nada muda. Escolheu-se coluna em vez de tabela de ligação porque os
--   relatórios por núcleo ficam um GROUP BY simples, e o risco é nulo: a
--   coluna nasce vazia e nenhum código existente faz INSERT posicional.
--   `clientes` NÃO é alterada: é por grupo (grupo_id), não por empresa, por isso
--   o país do cliente vive numa tabela lb_ própria (secção 3).
-- ============================================================================

-- ── 1. nucleo_id nas entidades que contam para a gestão ─────────────────────
-- FK composta (nucleo_id, empresa_id) → um registo só pode apontar para um
-- núcleo DA SUA empresa. MATCH SIMPLE: com nucleo_id NULL não há verificação.
-- Um núcleo nunca se apaga (desativa-se), por isso a FK é NO ACTION.

ALTER TABLE public.ag_projetos            ADD COLUMN IF NOT EXISTS nucleo_id UUID;
ALTER TABLE public.ag_jobs                ADD COLUMN IF NOT EXISTS nucleo_id UUID;
ALTER TABLE public.ag_propostas           ADD COLUMN IF NOT EXISTS nucleo_id UUID;
ALTER TABLE public.ag_contratos_avenca    ADD COLUMN IF NOT EXISTS nucleo_id UUID;
ALTER TABLE public.followup_oportunidades ADD COLUMN IF NOT EXISTS nucleo_id UUID;
ALTER TABLE public.ordens_servico         ADD COLUMN IF NOT EXISTS nucleo_id UUID;
ALTER TABLE public.services               ADD COLUMN IF NOT EXISTS nucleo_id UUID;
ALTER TABLE public.accounts_payable       ADD COLUMN IF NOT EXISTS nucleo_id UUID;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['ag_projetos','ag_jobs','ag_propostas','ag_contratos_avenca',
                           'followup_oportunidades','ordens_servico','services','accounts_payable'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = t || '_nucleo_fk') THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (nucleo_id, empresa_id)
           REFERENCES public.lb_nucleos (id, empresa_id) NOT VALID',
        t, t || '_nucleo_fk');
    END IF;
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (nucleo_id) WHERE nucleo_id IS NOT NULL',
                   t || '_nucleo_idx', t);
  END LOOP;
END $$;

-- ── 2. Núcleos de cada colaborador (principal + secundários) ────────────────
-- `employees` é partilhada e não tem UNIQUE (id, empresa_id); em vez de lhe
-- acrescentar um índice, um trigger confirma que o colaborador é da mesma
-- empresa — o mesmo efeito da FK composta, sem tocar na tabela.

CREATE TABLE IF NOT EXISTS public.lb_colaborador_nucleos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  nucleo_id   UUID NOT NULL,
  principal   BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, nucleo_id),
  FOREIGN KEY (nucleo_id, empresa_id) REFERENCES public.lb_nucleos (id, empresa_id)
);
-- No máximo um núcleo principal por colaborador.
CREATE UNIQUE INDEX IF NOT EXISTS lb_colaborador_nucleos_um_principal
  ON public.lb_colaborador_nucleos (employee_id) WHERE principal;

CREATE OR REPLACE FUNCTION public.lb_confere_empresa_colaborador()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.employees WHERE id = NEW.employee_id AND empresa_id = NEW.empresa_id) THEN
    RAISE EXCEPTION 'O colaborador não pertence a esta empresa.';
  END IF;
  RETURN NEW;
END $$;

-- ── 3. País (língua, moeda, fuso) de cada cliente ───────────────────────────
-- `clientes` é por GRUPO, partilhada entre as empresas do grupo. O país com
-- que a Webtech atende um cliente é dela, por isso vive aqui, por empresa.
-- Sem linha = o cliente herda o país da empresa (ag_empresas_vertical.pais).

CREATE TABLE IF NOT EXISTS public.lb_clientes_perfil (
  empresa_id    UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id    UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  pais          TEXT NOT NULL CHECK (pais IN ('PT','BR')),
  -- O Brasil tem vários fusos (o Amapá é America/Belem). NULL = o do país.
  fuso_horario  TEXT,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (empresa_id, cliente_id)
);

-- O cliente tem de ser do mesmo grupo que a empresa.
CREATE OR REPLACE FUNCTION public.lb_confere_grupo_cliente()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.clientes c JOIN public.empresas e ON e.grupo_id = c.grupo_id
    WHERE c.id = NEW.cliente_id AND e.id = NEW.empresa_id
  ) THEN
    RAISE EXCEPTION 'O cliente não pertence ao grupo desta empresa.';
  END IF;
  RETURN NEW;
END $$;

-- ── 4. Preço por moeda no catálogo ──────────────────────────────────────────
-- Sem conversão automática: um serviço tem preço em EUR e, se se vender no
-- Brasil, preço em BRL. `ag_itens_catalogo.preco_unitario` continua a ser o
-- preço na moeda da empresa; esta tabela acrescenta as outras.

CREATE TABLE IF NOT EXISTS public.lb_catalogo_precos (
  empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  item_id     UUID NOT NULL,
  moeda       TEXT NOT NULL CHECK (moeda IN ('EUR','BRL')),
  preco       NUMERIC(12,2) NOT NULL CHECK (preco >= 0),
  PRIMARY KEY (item_id, moeda),
  FOREIGN KEY (item_id, empresa_id) REFERENCES public.ag_itens_catalogo (id, empresa_id) ON DELETE CASCADE
);

-- ── 5. Moeda e taxa de câmbio em cada documento ─────────────────────────────
-- `moeda` NULL = EUR (tudo o que existe hoje). `taxa_eur` = quantos EUR vale
-- 1 unidade da moeda, no dia em que o documento foi emitido. Guarda-se e
-- nunca se recalcula: o relatório de março não muda em outubro.

ALTER TABLE public.ag_projetos         ADD COLUMN IF NOT EXISTS moeda TEXT, ADD COLUMN IF NOT EXISTS taxa_eur NUMERIC(18,8);
ALTER TABLE public.ag_propostas        ADD COLUMN IF NOT EXISTS moeda TEXT, ADD COLUMN IF NOT EXISTS taxa_eur NUMERIC(18,8);
ALTER TABLE public.ag_contratos_avenca ADD COLUMN IF NOT EXISTS moeda TEXT, ADD COLUMN IF NOT EXISTS taxa_eur NUMERIC(18,8);
ALTER TABLE public.services            ADD COLUMN IF NOT EXISTS moeda TEXT, ADD COLUMN IF NOT EXISTS taxa_eur NUMERIC(18,8);
ALTER TABLE public.accounts_payable    ADD COLUMN IF NOT EXISTS moeda TEXT, ADD COLUMN IF NOT EXISTS taxa_eur NUMERIC(18,8);

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['ag_projetos','ag_propostas','ag_contratos_avenca','services','accounts_payable'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = t || '_moeda_chk') THEN
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (moeda IS NULL OR moeda IN (''EUR'',''BRL'')) NOT VALID',
                     t, t || '_moeda_chk');
    END IF;
  END LOOP;
END $$;

-- ── 6. Taxas de câmbio (referência global) ──────────────────────────────────
-- Como ag_paises_config: conhecimento do produto, igual para todos, sem
-- empresa_id. Leitura a qualquer autenticado; escrita só pelo service_role
-- (o n8n, a partir do BCE), que ignora o RLS.

CREATE TABLE IF NOT EXISTS public.lb_taxas_cambio (
  data           DATE NOT NULL,
  moeda_origem   TEXT NOT NULL CHECK (moeda_origem IN ('EUR','BRL')),
  moeda_destino  TEXT NOT NULL CHECK (moeda_destino IN ('EUR','BRL')),
  taxa           NUMERIC(18,8) NOT NULL CHECK (taxa > 0),
  fonte          TEXT NOT NULL DEFAULT 'BCE',
  PRIMARY KEY (data, moeda_origem, moeda_destino)
);

-- ── RLS, políticas e triggers das tabelas novas (sem DROP) ──────────────────
ALTER TABLE public.lb_colaborador_nucleos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lb_clientes_perfil     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lb_catalogo_precos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lb_taxas_cambio        ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['lb_colaborador_nucleos','lb_clientes_perfil','lb_catalogo_precos'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname = t || '_empresa') THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL
           USING ((SELECT user_has_empresa_access(empresa_id)))
           WITH CHECK ((SELECT user_has_empresa_access(empresa_id)))', t || '_empresa', t);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = t || '_tranca_empresa') THEN
      EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.ag_tranca_empresa_id()',
                     t || '_tranca_empresa', t);
    END IF;
  END LOOP;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'lb_taxas_cambio' AND policyname = 'lb_taxas_cambio_leitura') THEN
    CREATE POLICY lb_taxas_cambio_leitura ON public.lb_taxas_cambio FOR SELECT TO authenticated USING (TRUE);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'lb_colaborador_nucleos_confere') THEN
    CREATE TRIGGER lb_colaborador_nucleos_confere BEFORE INSERT OR UPDATE ON public.lb_colaborador_nucleos
      FOR EACH ROW EXECUTE FUNCTION public.lb_confere_empresa_colaborador();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'lb_clientes_perfil_confere') THEN
    CREATE TRIGGER lb_clientes_perfil_confere BEFORE INSERT OR UPDATE ON public.lb_clientes_perfil
      FOR EACH ROW EXECUTE FUNCTION public.lb_confere_grupo_cliente();
  END IF;
END $$;

-- Verificação: colunas novas e tabelas criadas
SELECT table_name, column_name FROM information_schema.columns
WHERE table_schema = 'public' AND column_name IN ('nucleo_id','moeda','taxa_eur')
  AND table_name IN ('ag_projetos','ag_jobs','ag_propostas','ag_contratos_avenca','followup_oportunidades','ordens_servico','services','accounts_payable')
ORDER BY table_name, column_name;
