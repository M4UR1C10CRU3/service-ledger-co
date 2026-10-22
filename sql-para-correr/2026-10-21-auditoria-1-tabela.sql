-- AUDITORIA TOTAL do Clariza — parte 1 de 7: tabela, leitores e funções de acesso. 21/10/2026
-- Porquê: «tudo o que um utilizador fizer tem de ser rastreável» (caso da checklist do Ricardo).
-- O rasto é escrito pela BASE (gatilho), não pela app: a app pode esquecer-se ou falhar.
-- Correr as partes 1 a 7 por ordem, uma de cada vez. Não altera nenhum dado existente.
-- Reverter: 2026-10-21-auditoria-REVERTER.sql · Confirmar: 2026-10-21-auditoria-VERIFICAR.sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.auditoria (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  quando      timestamptz NOT NULL DEFAULT now(),
  auth_uid    uuid,                 -- conta que fez (nulo = sistema / SQL Editor)
  autor_id    uuid,                 -- ficha em liberty_utilizadores
  autor_nome  text NOT NULL,        -- nome da FICHA nesse momento (nunca do profiles)
  autor_email text,
  papel       text,                 -- authenticated, service_role, anon, postgres…
  sessao_id   uuid,                 -- sessão de login (distingue computadores/separadores)
  ip          text,
  empresa_id  uuid,
  grupo_id    uuid,
  ambito      text NOT NULL DEFAULT 'global' CHECK (ambito IN ('empresa', 'grupo', 'global')),
  tabela      text NOT NULL,
  operacao    text NOT NULL CHECK (operacao IN ('INSERT', 'UPDATE', 'DELETE', 'EVENTO')),  -- EVENTO: sem tabela (ex.: exportar)
  registo_id  text,
  rotulo      text,                 -- «123/2026 · Cliente X», para ler sem abrir o registo
  contexto    text,                 -- registo-pai (ex.: cartão de uma tarefa da checklist)
  campos      text[],               -- colunas que mudaram (só UPDATE)
  antes       jsonb,
  depois      jsonb,
  automatica  boolean NOT NULL DEFAULT false,  -- consequência de outro gatilho ou de cascata
  erro        text                  -- só quando o registo completo falhou
);
CREATE INDEX IF NOT EXISTS auditoria_autor_quando   ON public.auditoria (auth_uid, quando DESC);
CREATE INDEX IF NOT EXISTS auditoria_tabela_registo ON public.auditoria (tabela, registo_id);
CREATE INDEX IF NOT EXISTS auditoria_empresa_quando ON public.auditoria (empresa_id, quando DESC);
CREATE INDEX IF NOT EXISTS auditoria_quando         ON public.auditoria (quando DESC);

-- Tabelas que NÃO se auditam, e porquê (a parte 4 junta as cópias de segurança antigas).
CREATE TABLE IF NOT EXISTS public.auditoria_excluidas (tabela text PRIMARY KEY, motivo text NOT NULL);
INSERT INTO public.auditoria_excluidas (tabela, motivo) VALUES
  ('liberty_atividades', 'registo antigo escrito pela app'),
  ('notificacoes_internas', 'avisos gerados automaticamente'),
  ('marketing_tarefa_notificacoes', 'avisos gerados automaticamente'),
  ('school_notificacoes', 'avisos gerados automaticamente'),
  ('adm_documento_alertas', 'alertas gerados automaticamente'),
  ('worker_execucoes', 'registo de execuções dos workers'),
  ('alert_logs', 'registo de alertas enviados'),
  ('quadro_automacao_execucoes', 'registo de execuções das automações'),
  ('backups', 'cópia de hora a hora (pg_cron)'),
  ('marketing_tarefa_etapa_historico', 'já é histórico; a tarefa é auditada'),
  ('followup_historico_fases', 'já é histórico; a oportunidade é auditada'),
  ('planeamento_historico', 'já é histórico; o cartão é auditado'),
  ('adm_documento_historico', 'já é histórico; o documento é auditado'),
  ('doc_sequencias', 'contador de numeração'),
  ('ag_sequencias', 'contador de numeração'),
  ('school_certificados_seq', 'contador de numeração'),
  ('school_pedidos_formacao_seq', 'contador de numeração'),
  ('school_agenda_tokens', 'chaves de acesso à agenda'),
  ('tc_produtos', 'assistente da loja (sincronização automática)'),
  ('tc_documents', 'assistente da loja'),
  ('tc_conversations', 'assistente da loja'),
  ('tc_messages', 'assistente da loja'),
  ('tc_escalations', 'assistente da loja')
ON CONFLICT (tabela) DO NOTHING;

-- Quem lê. VAZIA = todos os administradores ativos; com linhas = só esses administradores.
CREATE TABLE IF NOT EXISTS public.auditoria_leitores (
  utilizador_id uuid PRIMARY KEY REFERENCES public.liberty_utilizadores (id) ON DELETE CASCADE,
  criado_em     timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.auditoria_pode_ler() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM liberty_utilizadores u
    WHERE u.auth_user_id = auth.uid() AND u.perfil = 'administrador'
      AND coalesce(u.ativo, false) AND NOT coalesce(u.eliminado, false)
      AND (NOT EXISTS (SELECT 1 FROM auditoria_leitores)
           OR EXISTS (SELECT 1 FROM auditoria_leitores l WHERE l.utilizador_id = u.id)))
$$;
CREATE OR REPLACE FUNCTION public.auditoria_minhas_empresas() RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(array_agg(lue.empresa_id), '{}') FROM liberty_utilizador_empresas lue
  JOIN liberty_utilizadores lu ON lu.id = lue.utilizador_id WHERE lu.auth_user_id = auth.uid()
$$;
CREATE OR REPLACE FUNCTION public.auditoria_meus_grupos() RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(array_agg(DISTINCT e.grupo_id), '{}') FROM empresas e
  WHERE e.grupo_id IS NOT NULL AND e.id = ANY (public.auditoria_minhas_empresas())
$$;
-- «global» (catálogos, registos sem empresa): só quem tem acesso a TODAS as empresas.
CREATE OR REPLACE FUNCTION public.auditoria_acesso_global() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (SELECT 1 FROM empresas e WHERE NOT (e.id = ANY (public.auditoria_minhas_empresas())))
$$;

COMMIT;
