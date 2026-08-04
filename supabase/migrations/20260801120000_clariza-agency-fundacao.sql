-- ============================================================================
-- CLARIZA AGENCY — Fundação do vertical de Agência de Marketing
-- ============================================================================
-- Referência: Operand (app4.operand.com.br), adaptado a PT-PT / Portugal.
--
-- Âmbito desta migration: a espinha dorsal que o Clariza não tem —
--   Projeto (hub) → Jobs (execução) → Tarefas → Apontamentos (horas reais).
-- Tudo o resto do Operand (propostas, financeiro, fornecedores, kanban,
-- anexos, PDFs) já existe no Clariza e será reaproveitado em fases seguintes.
--
-- SEGURANÇA — o que aqui se faz de diferente do resto do Clariza:
--   1. empresa_id NOT NULL em TODAS as tabelas, incluindo filhas.
--   2. Política RLS com USING **e WITH CHECK**. As políticas do módulo School
--      só têm USING, o que permite INSERIR dados na empresa de outrem.
--      Este vertical não repete esse erro.
--   3. FKs compostas (id, empresa_id) — impedem que uma linha da empresa A
--      referencie uma linha da empresa B, coisa que a RLS sozinha não apanha.
--   4. Trigger que tranca empresa_id (não permite mover linhas entre empresas).
--   5. (SELECT ...) à volta das chamadas de função na política, por performance.
--
-- NÃO-DESTRUTIVO: só cria objetos novos com prefixo ag_. Não altera nem lê
-- nenhuma tabela existente em produção. Nenhuma empresa atual (Obrajusta,
-- Resiserv, Tudo Casa, ITC) é afetada — as tabelas nascem vazias e o vertical
-- só fica visível para as empresas explicitamente marcadas como agência.
-- ============================================================================

-- ── Função de acesso (já existe desde 20260614100000; reafirmada aqui para a
--    migration ser auto-suficiente se corrida em ambiente limpo) ─────────────
CREATE OR REPLACE FUNCTION public.user_has_empresa_access(eid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM liberty_utilizador_empresas lue
    JOIN liberty_utilizadores lu ON lu.id = lue.utilizador_id
    WHERE lu.auth_user_id = auth.uid()
      AND lue.empresa_id = eid
  )
$$;

-- ── Trigger genérico: impede alterar a empresa de uma linha já criada ───────
CREATE OR REPLACE FUNCTION public.ag_tranca_empresa_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.empresa_id IS DISTINCT FROM OLD.empresa_id THEN
    RAISE EXCEPTION 'Não é permitido mover registos entre empresas (empresa_id é imutável).';
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 1. SEQUÊNCIAS — numeração atómica
-- ============================================================================
-- O Operand numera hierarquicamente: o projeto tem um número (7) e cada
-- documento dentro dele tem um sequencial (7.1, 7.2, 7.6.1). Um SELECT MAX+1
-- em JavaScript tem condição de corrida (bug já identificado nas Propostas e
-- Pedidos de Orçamento do Clariza). Aqui a atribuição é atómica desde o início.

CREATE TABLE IF NOT EXISTS public.ag_sequencias (
  empresa_id  UUID    NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  escopo      TEXT    NOT NULL,           -- 'projeto' | 'job:<projeto_id>' | ...
  ano         INTEGER NOT NULL,
  ultimo      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (empresa_id, escopo, ano)
);

ALTER TABLE public.ag_sequencias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ag_sequencias_empresa ON public.ag_sequencias;
CREATE POLICY ag_sequencias_empresa ON public.ag_sequencias
  FOR ALL
  USING      ((SELECT user_has_empresa_access(empresa_id)))
  WITH CHECK ((SELECT user_has_empresa_access(empresa_id)));

CREATE OR REPLACE FUNCTION public.ag_proximo_numero(
  p_empresa_id UUID, p_escopo TEXT, p_ano INTEGER
) RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_num INTEGER;
BEGIN
  IF NOT user_has_empresa_access(p_empresa_id) THEN
    RAISE EXCEPTION 'Sem acesso a esta empresa.';
  END IF;
  INSERT INTO ag_sequencias (empresa_id, escopo, ano, ultimo)
  VALUES (p_empresa_id, p_escopo, p_ano, 1)
  ON CONFLICT (empresa_id, escopo, ano)
  DO UPDATE SET ultimo = ag_sequencias.ultimo + 1
  RETURNING ultimo INTO v_num;
  RETURN v_num;
END;
$$;

-- ============================================================================
-- 2. PROJETOS — o hub central do vertical
-- ============================================================================
-- Decisão D1: o Projeto NÃO é um quadro (board sem cliente/budget/numeração)
-- nem uma ordem de serviço (a OS está a JUSANTE de uma proposta; o Projeto
-- está a MONTANTE e contém propostas). É entidade nova, com ligação opcional
-- a um quadro para quem quiser a vista Kanban livre.

CREATE TABLE IF NOT EXISTS public.ag_projetos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id        UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  numero            INTEGER NOT NULL,
  ano               INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  nome              TEXT NOT NULL,
  cliente_id        UUID REFERENCES public.clientes(id) ON DELETE RESTRICT,
  cliente_nome      TEXT,               -- desnormalizado (padrão do Clariza)
  responsavel_id    UUID REFERENCES public.liberty_utilizadores(id),
  responsavel_nome  TEXT,
  estado            TEXT NOT NULL DEFAULT 'ativo'
                    CHECK (estado IN ('ativo','em_pausa','concluido','cancelado')),
  arquivado         BOOLEAN NOT NULL DEFAULT FALSE,
  descricao         TEXT,
  prazo_desejado    DATE,
  prazo_estimado    DATE,
  budget            NUMERIC(12,2),
  horas_previstas   NUMERIC(8,2),
  quadro_id         UUID,               -- ligação opcional a um quadro existente
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por        UUID,
  UNIQUE (empresa_id, ano, numero),
  UNIQUE (id, empresa_id)               -- alvo das FKs compostas das filhas
);

CREATE INDEX IF NOT EXISTS ag_projetos_empresa_idx  ON public.ag_projetos(empresa_id);
CREATE INDEX IF NOT EXISTS ag_projetos_cliente_idx  ON public.ag_projetos(cliente_id);
CREATE INDEX IF NOT EXISTS ag_projetos_estado_idx   ON public.ag_projetos(empresa_id, estado) WHERE arquivado = FALSE;

ALTER TABLE public.ag_projetos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ag_projetos_empresa ON public.ag_projetos;
CREATE POLICY ag_projetos_empresa ON public.ag_projetos
  FOR ALL
  USING      ((SELECT user_has_empresa_access(empresa_id)))
  WITH CHECK ((SELECT user_has_empresa_access(empresa_id)));

DROP TRIGGER IF EXISTS ag_projetos_tranca_empresa ON public.ag_projetos;
CREATE TRIGGER ag_projetos_tranca_empresa
  BEFORE UPDATE ON public.ag_projetos
  FOR EACH ROW EXECUTE FUNCTION public.ag_tranca_empresa_id();

-- ============================================================================
-- 3. ETAPAS DE JOB — kanban configurável por empresa
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ag_job_etapas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  cor         TEXT NOT NULL DEFAULT '#94a3b8',
  ordem       INTEGER NOT NULL DEFAULT 0,
  final       BOOLEAN NOT NULL DEFAULT FALSE,  -- etapa que fecha o job
  ativo       BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (id, empresa_id)
);

CREATE INDEX IF NOT EXISTS ag_job_etapas_empresa_idx ON public.ag_job_etapas(empresa_id, ordem);

ALTER TABLE public.ag_job_etapas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ag_job_etapas_empresa ON public.ag_job_etapas;
CREATE POLICY ag_job_etapas_empresa ON public.ag_job_etapas
  FOR ALL
  USING      ((SELECT user_has_empresa_access(empresa_id)))
  WITH CHECK ((SELECT user_has_empresa_access(empresa_id)));

-- ============================================================================
-- 4. JOBS — a execução criativa (numeração projeto.sequencial)
-- ============================================================================
-- Decisão D2: o Job não é um cartão de quadro (evita escrita dupla), mas a UI
-- reutiliza o componente KanbanBoard já existente.

CREATE TABLE IF NOT EXISTS public.ag_jobs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id        UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  projeto_id        UUID NOT NULL,
  sequencial        INTEGER NOT NULL,   -- o ".1" de "7.1"
  titulo            TEXT NOT NULL,
  descricao         TEXT,
  etapa_id          UUID,
  responsavel_id    UUID REFERENCES public.liberty_utilizadores(id),
  responsavel_nome  TEXT,
  prazo             DATE,
  horas_previstas   NUMERIC(8,2),
  concluido         BOOLEAN NOT NULL DEFAULT FALSE,
  concluido_em      TIMESTAMPTZ,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por        UUID,
  -- FK composta: garante que o job e o projeto são da MESMA empresa
  FOREIGN KEY (projeto_id, empresa_id)
    REFERENCES public.ag_projetos(id, empresa_id) ON DELETE CASCADE,
  FOREIGN KEY (etapa_id, empresa_id)
    REFERENCES public.ag_job_etapas(id, empresa_id) ON DELETE SET NULL,
  UNIQUE (projeto_id, sequencial),
  UNIQUE (id, empresa_id)
);

CREATE INDEX IF NOT EXISTS ag_jobs_empresa_idx  ON public.ag_jobs(empresa_id);
CREATE INDEX IF NOT EXISTS ag_jobs_projeto_idx  ON public.ag_jobs(projeto_id);
CREATE INDEX IF NOT EXISTS ag_jobs_resp_idx     ON public.ag_jobs(empresa_id, responsavel_id) WHERE concluido = FALSE;

ALTER TABLE public.ag_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ag_jobs_empresa ON public.ag_jobs;
CREATE POLICY ag_jobs_empresa ON public.ag_jobs
  FOR ALL
  USING      ((SELECT user_has_empresa_access(empresa_id)))
  WITH CHECK ((SELECT user_has_empresa_access(empresa_id)));

DROP TRIGGER IF EXISTS ag_jobs_tranca_empresa ON public.ag_jobs;
CREATE TRIGGER ag_jobs_tranca_empresa
  BEFORE UPDATE ON public.ag_jobs
  FOR EACH ROW EXECUTE FUNCTION public.ag_tranca_empresa_id();

-- ============================================================================
-- 5. TAREFAS DO JOB — cada uma com responsável, prazo e horas próprias
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ag_job_tarefas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id        UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  job_id            UUID NOT NULL,
  ordem             INTEGER NOT NULL DEFAULT 0,
  titulo            TEXT NOT NULL,
  responsavel_id    UUID REFERENCES public.liberty_utilizadores(id),
  responsavel_nome  TEXT,
  prazo             DATE,
  horas_previstas   NUMERIC(8,2),
  concluida         BOOLEAN NOT NULL DEFAULT FALSE,
  concluida_em      TIMESTAMPTZ,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (job_id, empresa_id)
    REFERENCES public.ag_jobs(id, empresa_id) ON DELETE CASCADE,
  UNIQUE (id, empresa_id)
);

CREATE INDEX IF NOT EXISTS ag_job_tarefas_job_idx ON public.ag_job_tarefas(job_id, ordem);

ALTER TABLE public.ag_job_tarefas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ag_job_tarefas_empresa ON public.ag_job_tarefas;
CREATE POLICY ag_job_tarefas_empresa ON public.ag_job_tarefas
  FOR ALL
  USING      ((SELECT user_has_empresa_access(empresa_id)))
  WITH CHECK ((SELECT user_has_empresa_access(empresa_id)));

-- ============================================================================
-- 6. APONTAMENTOS — horas reais imputadas a projeto/job/tarefa
-- ============================================================================
-- Decisão D6: NÃO é time_records. time_records é assiduidade (ponto legal,
-- uma linha por dia, entrada/saída). Isto é imputação de tempo a cliente,
-- várias por dia, com custo. São coisas diferentes e coexistem.
--
-- Decisão D13: custo_hora fica em SNAPSHOT na linha. Se fosse derivado do
-- salário atual, um aumento salarial reescrevia retroativamente a margem de
-- todos os projetos passados.

CREATE TABLE IF NOT EXISTS public.ag_apontamentos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id        UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  projeto_id        UUID NOT NULL,
  job_id            UUID,
  tarefa_id         UUID,
  utilizador_id     UUID REFERENCES public.liberty_utilizadores(id),
  utilizador_nome   TEXT,
  employee_id       UUID,               -- ligação ao colaborador (custo)
  data              DATE NOT NULL DEFAULT CURRENT_DATE,
  inicio            TIMESTAMPTZ,        -- preenchidos quando vem do cronómetro
  fim               TIMESTAMPTZ,
  minutos           INTEGER NOT NULL CHECK (minutos > 0),
  descricao         TEXT,
  faturavel         BOOLEAN NOT NULL DEFAULT TRUE,
  custo_hora_snap   NUMERIC(10,2),      -- congelado no momento do apontamento
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (projeto_id, empresa_id)
    REFERENCES public.ag_projetos(id, empresa_id) ON DELETE CASCADE,
  FOREIGN KEY (job_id, empresa_id)
    REFERENCES public.ag_jobs(id, empresa_id) ON DELETE SET NULL,
  FOREIGN KEY (tarefa_id, empresa_id)
    REFERENCES public.ag_job_tarefas(id, empresa_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ag_apontamentos_projeto_idx ON public.ag_apontamentos(projeto_id, data);
CREATE INDEX IF NOT EXISTS ag_apontamentos_util_idx    ON public.ag_apontamentos(empresa_id, utilizador_id, data);

ALTER TABLE public.ag_apontamentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ag_apontamentos_empresa ON public.ag_apontamentos;
CREATE POLICY ag_apontamentos_empresa ON public.ag_apontamentos
  FOR ALL
  USING      ((SELECT user_has_empresa_access(empresa_id)))
  WITH CHECK ((SELECT user_has_empresa_access(empresa_id)));

-- ============================================================================
-- 7. VISTA DE RENTABILIDADE — previsto vs realizado por projeto
-- ============================================================================
-- security_invoker = on: a vista respeita a RLS de quem a consulta.
-- Sem isto, uma vista SECURITY DEFINER por omissão fura o isolamento.

CREATE OR REPLACE VIEW public.ag_v_projeto_resumo
WITH (security_invoker = on) AS
SELECT
  p.id                                            AS projeto_id,
  p.empresa_id,
  p.numero,
  p.ano,
  p.nome,
  p.cliente_id,
  p.cliente_nome,
  p.estado,
  p.budget,
  p.horas_previstas,
  COALESCE(j.total_jobs, 0)                       AS total_jobs,
  COALESCE(j.jobs_concluidos, 0)                  AS jobs_concluidos,
  COALESCE(a.minutos_apontados, 0) / 60.0         AS horas_apontadas,
  COALESCE(a.custo_real, 0)                       AS custo_real,
  p.budget - COALESCE(a.custo_real, 0)            AS margem_prevista
FROM public.ag_projetos p
LEFT JOIN (
  SELECT projeto_id,
         COUNT(*)                                    AS total_jobs,
         COUNT(*) FILTER (WHERE concluido)           AS jobs_concluidos
  FROM public.ag_jobs GROUP BY projeto_id
) j ON j.projeto_id = p.id
LEFT JOIN (
  SELECT projeto_id,
         SUM(minutos)                                              AS minutos_apontados,
         SUM((minutos / 60.0) * COALESCE(custo_hora_snap, 0))      AS custo_real
  FROM public.ag_apontamentos GROUP BY projeto_id
) a ON a.projeto_id = p.id;

-- ============================================================================
-- 8. A CHAVE PT / BR — bi-regional desde a raiz
-- ============================================================================
-- DECISÃO DE ARQUITETURA (utilizador, 2026-08-01): o Operand brasileiro NÃO é
-- substituído pelo modelo português. Os dois coexistem, e uma chave por empresa
-- decide qual está ativo. Clientes brasileiros são um mercado previsto, não
-- hipotético — o Clariza já serve o ITC/Educa Pro no Amapá.
--
-- Consequência para todo o vertical: nada específico de um país pode ser
-- hardcoded. Moeda, fuso, identificador fiscal, regime de impostos, encargos
-- laborais, modelo de comissão e vocabulário são TODOS lidos destas tabelas.
-- Um campo que só existe num país (praça, bi-semana, BV) fica na tabela e é
-- escondido pela UI conforme o país — nunca removido do modelo.

CREATE TABLE IF NOT EXISTS public.ag_empresas_vertical (
  empresa_id  UUID PRIMARY KEY REFERENCES public.empresas(id) ON DELETE CASCADE,
  ativo       BOOLEAN NOT NULL DEFAULT TRUE,
  pais        TEXT NOT NULL DEFAULT 'PT' CHECK (pais IN ('PT','BR')),  -- ← A CHAVE
  ativado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ag_empresas_vertical ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ag_empresas_vertical_empresa ON public.ag_empresas_vertical;
CREATE POLICY ag_empresas_vertical_empresa ON public.ag_empresas_vertical
  FOR ALL
  USING      ((SELECT user_has_empresa_access(empresa_id)))
  WITH CHECK ((SELECT user_has_empresa_access(empresa_id)));

-- ── 8.1 Configuração por país ───────────────────────────────────────────────
-- Tabela de referência global (sem empresa_id): é conhecimento do produto,
-- igual para todos. Leitura livre a qualquer autenticado; escrita só por SQL.

CREATE TABLE IF NOT EXISTS public.ag_paises_config (
  pais                TEXT PRIMARY KEY CHECK (pais IN ('PT','BR')),
  nome                TEXT NOT NULL,
  locale              TEXT NOT NULL,   -- pt-PT | pt-BR
  moeda               TEXT NOT NULL,   -- EUR  | BRL
  moeda_simbolo       TEXT NOT NULL,
  simbolo_a_esquerda  BOOLEAN NOT NULL,
  fuso_horario        TEXT NOT NULL,
  id_fiscal_label     TEXT NOT NULL,   -- NIF | CNPJ/CPF
  imposto_label       TEXT NOT NULL,   -- IVA | Impostos sobre serviços
  imposto_por_fora    BOOLEAN NOT NULL,-- PT: acresce ao preço; BR: embutido
  doc_fatura_label    TEXT NOT NULL,   -- Fatura | Nota Fiscal (NFS-e)
  comissao_meios_padrao NUMERIC(5,2),  -- BR: 20% institucional; PT: NULL (negociada)
  usa_praca           BOOLEAN NOT NULL DEFAULT FALSE,
  usa_bisemana        BOOLEAN NOT NULL DEFAULT FALSE,
  usa_bonificacao_bv  BOOLEAN NOT NULL DEFAULT FALSE,
  usa_rede_afiliadas  BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE public.ag_paises_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ag_paises_config_leitura ON public.ag_paises_config;
CREATE POLICY ag_paises_config_leitura ON public.ag_paises_config
  FOR SELECT TO authenticated USING (TRUE);

INSERT INTO public.ag_paises_config (
  pais, nome, locale, moeda, moeda_simbolo, simbolo_a_esquerda, fuso_horario,
  id_fiscal_label, imposto_label, imposto_por_fora, doc_fatura_label,
  comissao_meios_padrao, usa_praca, usa_bisemana, usa_bonificacao_bv, usa_rede_afiliadas
) VALUES
  ('PT','Portugal','pt-PT','EUR','€',FALSE,'Europe/Lisbon',
   'NIF','IVA',TRUE,'Fatura',
   NULL, FALSE, FALSE, FALSE, FALSE),
  ('BR','Brasil','pt-BR','BRL','R$',TRUE,'America/Sao_Paulo',
   'CNPJ/CPF','Impostos sobre serviços',FALSE,'Nota Fiscal (NFS-e)',
   20.00, TRUE, TRUE, TRUE, TRUE)
ON CONFLICT (pais) DO NOTHING;

-- ── 8.2 Regimes fiscais dos dois países ─────────────────────────────────────
-- BR: o bloco "Aplicar Encargos" do Operand (Simples Nacional, Lucro Presumido).
-- PT: IVA liquidado por fora, retenção na fonte de IRS, autoliquidação intra-UE.
--
-- ATENÇÃO: as percentagens abaixo são VALORES DE ARRANQUE, não verdade fiscal.
-- Taxas mudam por ano, município (ISS), anexo/faixa (Simples Nacional) e região
-- (IVA Açores/Madeira). Devem ser confirmadas com o contabilista de cada
-- empresa e são editáveis — é por isso que estão em tabela e não em código.

CREATE TABLE IF NOT EXISTS public.ag_regimes_fiscais (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pais          TEXT NOT NULL REFERENCES public.ag_paises_config(pais),
  empresa_id    UUID REFERENCES public.empresas(id) ON DELETE CASCADE,  -- NULL = modelo global
  codigo        TEXT NOT NULL,
  nome          TEXT NOT NULL,
  descricao     TEXT,
  percentagem   NUMERIC(6,3),
  por_fora      BOOLEAN NOT NULL DEFAULT TRUE,   -- acresce (PT) vs embutido (BR)
  ordem         INTEGER NOT NULL DEFAULT 0,
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (pais, empresa_id, codigo)
);

CREATE INDEX IF NOT EXISTS ag_regimes_fiscais_pais_idx ON public.ag_regimes_fiscais(pais, ativo);

ALTER TABLE public.ag_regimes_fiscais ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ag_regimes_fiscais_acesso ON public.ag_regimes_fiscais;
CREATE POLICY ag_regimes_fiscais_acesso ON public.ag_regimes_fiscais
  FOR ALL
  USING      (empresa_id IS NULL OR (SELECT user_has_empresa_access(empresa_id)))
  WITH CHECK (empresa_id IS NOT NULL AND (SELECT user_has_empresa_access(empresa_id)));

INSERT INTO public.ag_regimes_fiscais (pais, codigo, nome, descricao, percentagem, por_fora, ordem) VALUES
  -- Portugal
  ('PT','sem_encargo','Sem encargo','Sem imposto aplicado à linha.',            0,     TRUE, 0),
  ('PT','iva_normal','IVA — taxa normal','Continente. Confirmar taxa em vigor.', 23,    TRUE, 1),
  ('PT','iva_intermedia','IVA — taxa intermédia','Continente.',                  13,    TRUE, 2),
  ('PT','iva_reduzida','IVA — taxa reduzida','Continente.',                       6,    TRUE, 3),
  ('PT','iva_autoliq','Autoliquidação intracomunitária','IVA devido pelo adquirente noutro EM da UE.', 0, TRUE, 4),
  ('PT','iva_isento','Isento','Indicar o motivo/artigo na fatura.',               0,    TRUE, 5),
  ('PT','ret_irs_25','Retenção na fonte IRS','Prestação de serviços, categoria B. Confirmar taxa.', 25, FALSE, 6),
  -- Brasil (o bloco "Aplicar Encargos" do Operand)
  ('BR','sem_encargo','Sem encargo','Sem encargo aplicado à linha.',             0,    FALSE, 0),
  ('BR','simples_nacional','Simples Nacional','Alíquota efetiva depende do anexo e da faixa de faturamento. Confirmar com o contabilista.', NULL, FALSE, 1),
  ('BR','lucro_presumido','Lucro Presumido','Valor de arranque agregado; ISS varia por município.', 18, FALSE, 2),
  ('BR','lucro_real','Lucro Real','Apuração sobre lucro efetivo.',            NULL,    FALSE, 3),
  ('BR','iss','ISS — Imposto Sobre Serviços','Municipal, 2% a 5% conforme município e código de serviço.', NULL, FALSE, 4),
  ('BR','pis_cofins','PIS/COFINS','Cumulativo: PIS 0,65% + COFINS 3%.',       3.65,    FALSE, 5)
ON CONFLICT (pais, empresa_id, codigo) DO NOTHING;

-- ── 8.3 Encargos laborais — a fórmula do custo-hora, por país ───────────────
-- Se a fórmula de custo-hora ficar com encargos brasileiros (FGTS, 13.º,
-- férias +1/3) numa agência portuguesa — ou o contrário — a margem por projeto
-- sai errada e todo o relatório de rentabilidade perde sentido.

CREATE TABLE IF NOT EXISTS public.ag_encargos_laborais (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pais         TEXT NOT NULL REFERENCES public.ag_paises_config(pais),
  empresa_id   UUID REFERENCES public.empresas(id) ON DELETE CASCADE,  -- NULL = modelo global
  codigo       TEXT NOT NULL,
  nome         TEXT NOT NULL,
  percentagem  NUMERIC(6,3),
  meses_ano    NUMERIC(4,2),   -- PT: 14 (subsídios férias/Natal) | BR: 13.33
  notas        TEXT,
  ativo        BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (pais, empresa_id, codigo)
);

ALTER TABLE public.ag_encargos_laborais ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ag_encargos_laborais_acesso ON public.ag_encargos_laborais;
CREATE POLICY ag_encargos_laborais_acesso ON public.ag_encargos_laborais
  FOR ALL
  USING      (empresa_id IS NULL OR (SELECT user_has_empresa_access(empresa_id)))
  WITH CHECK (empresa_id IS NOT NULL AND (SELECT user_has_empresa_access(empresa_id)));

INSERT INTO public.ag_encargos_laborais (pais, codigo, nome, percentagem, meses_ano, notas) VALUES
  ('PT','tsu','TSU — contribuição patronal',        23.75, 14,   'Taxa Social Única a cargo da entidade patronal. Confirmar taxa em vigor.'),
  ('PT','seguro_at','Seguro de acidentes de trabalho', 1.00, NULL,'Valor de arranque; varia com a atividade.'),
  ('PT','sub_alimentacao','Subsídio de alimentação',  NULL, NULL,'Valor diário, não percentagem. Definir por empresa.'),
  ('BR','inss_patronal','INSS patronal',              20.00, 13.33,'Confirmar conforme enquadramento e desoneração.'),
  ('BR','fgts','FGTS',                                 8.00, NULL,'Fundo de Garantia por Tempo de Serviço.'),
  ('BR','ferias_terco','Férias + 1/3',                 11.11, NULL,'Provisão de férias acrescida do terço constitucional.'),
  ('BR','decimo_terceiro','13.º salário',              8.33, NULL,'Provisão mensal.')
ON CONFLICT (pais, empresa_id, codigo) DO NOTHING;

-- ── 8.4 Ajuda: país ativo de uma empresa ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ag_pais_da_empresa(p_empresa_id UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT pais FROM ag_empresas_vertical WHERE empresa_id = p_empresa_id),
    'PT'
  )
$$;

-- ============================================================================
-- NOTA DE APLICAÇÃO
-- ============================================================================
-- Esta migration NÃO foi aplicada automaticamente.
--
-- 1) Ativar o vertical numa agência (a chave PT/BR é aqui):
--      INSERT INTO ag_empresas_vertical (empresa_id, pais)
--      VALUES ('<uuid-da-empresa>', 'PT');    -- ou 'BR'
--
--    Mudar de país mais tarde é só:
--      UPDATE ag_empresas_vertical SET pais = 'BR' WHERE empresa_id = '<uuid>';
--
-- 2) Semear as etapas iniciais de kanban dessa empresa:
--      INSERT INTO ag_job_etapas (empresa_id, nome, cor, ordem) VALUES
--        ('<uuid>', 'Briefing',    '#94a3b8', 0),
--        ('<uuid>', 'Pesquisa',    '#6366f1', 1),
--        ('<uuid>', 'Criação',     '#f59e0b', 2),
--        ('<uuid>', 'Revisão',     '#06b6d4', 3),
--        ('<uuid>', 'Aprovação',   '#a855f7', 4),
--        ('<uuid>', 'Concluído',   '#22c55e', 5);
--      UPDATE ag_job_etapas SET final = TRUE
--        WHERE nome = 'Concluído' AND empresa_id = '<uuid>';
--
-- 3) As percentagens fiscais e de encargos laborais semeadas acima são valores
--    de ARRANQUE e devem ser confirmadas com o contabilista de cada empresa
--    antes de qualquer relatório de margem ser levado a sério.
-- ============================================================================
