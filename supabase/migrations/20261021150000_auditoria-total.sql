-- Auditoria total do Clariza — 21/10/2026. Junção das 7 partes em sql-para-correr/2026-10-21-auditoria-[1-7]-*.sql
-- (o SQL Editor do Supabase não aceita mais de ~100 linhas: correr as partes, por ordem).
-- Reverter: sql-para-correr/2026-10-21-auditoria-REVERTER.sql · Confirmar: ...-VERIFICAR.sql

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

-- AUDITORIA TOTAL — parte 2 de 7: quem lê, ninguém escreve, e limpeza do que se guarda. 21/10/2026
BEGIN;

GRANT EXECUTE ON FUNCTION public.auditoria_pode_ler(), public.auditoria_minhas_empresas(),
  public.auditoria_meus_grupos(), public.auditoria_acesso_global() TO authenticated;

-- Leitura: só administradores (ou os da lista auditoria_leitores) e só do que lhes pertence:
-- registo de uma empresa → quem tem acesso a essa empresa; dado-mestre do grupo (clientes,
-- fornecedores, colaboradores, utilizadores) → quem é do grupo; resto → quem tem acesso a tudo.
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auditoria_leitura ON public.auditoria;
CREATE POLICY auditoria_leitura ON public.auditoria FOR SELECT TO authenticated USING (
  (SELECT public.auditoria_pode_ler()) AND CASE ambito
    WHEN 'empresa' THEN empresa_id = ANY ((SELECT public.auditoria_minhas_empresas())::uuid[])
    WHEN 'grupo'   THEN grupo_id   = ANY ((SELECT public.auditoria_meus_grupos())::uuid[])
    ELSE (SELECT public.auditoria_acesso_global())
  END);
-- Escrita: nenhuma regra = ninguém escreve nem apaga pela app. Só o gatilho (SECURITY DEFINER).
REVOKE ALL ON public.auditoria FROM anon, authenticated;
GRANT SELECT ON public.auditoria TO authenticated;

ALTER TABLE public.auditoria_excluidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_leitores  ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auditoria_excluidas_leitura ON public.auditoria_excluidas;
CREATE POLICY auditoria_excluidas_leitura ON public.auditoria_excluidas FOR SELECT TO authenticated
  USING ((SELECT public.auditoria_pode_ler()));
DROP POLICY IF EXISTS auditoria_leitores_leitura ON public.auditoria_leitores;
CREATE POLICY auditoria_leitores_leitura ON public.auditoria_leitores FOR SELECT TO authenticated
  USING ((SELECT public.auditoria_pode_ler()));
REVOKE ALL ON public.auditoria_excluidas, public.auditoria_leitores FROM anon, authenticated;
GRANT SELECT ON public.auditoria_excluidas, public.auditoria_leitores TO authenticated;

-- Imutável, também para o SQL Editor: nada se altera nem se apaga, exceto a purga por antiguidade.
CREATE OR REPLACE FUNCTION public.auditoria_imutavel() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('auditoria.purgar', true) = 'sim' THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'A auditoria não se altera nem se apaga (só auditoria_purgar, por antiguidade).';
END $$;
DROP TRIGGER IF EXISTS auditoria_imutavel ON public.auditoria;
CREATE TRIGGER auditoria_imutavel BEFORE UPDATE OR DELETE ON public.auditoria
  FOR EACH ROW EXECUTE FUNCTION public.auditoria_imutavel();
DROP TRIGGER IF EXISTS auditoria_sem_truncate ON public.auditoria;
CREATE TRIGGER auditoria_sem_truncate BEFORE TRUNCATE ON public.auditoria
  FOR EACH STATEMENT EXECUTE FUNCTION public.auditoria_imutavel();

-- O que se guarda: palavras-passe, segredos e chaves ficam «oculto» (vê-se QUE mudaram, não o
-- valor); ficheiros em base64 e conteúdos enormes ficam só com o tamanho.
CREATE OR REPLACE FUNCTION public.auditoria_limpar(j jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE STRICT SET search_path = public AS $$
  SELECT coalesce(jsonb_object_agg(k, CASE
    WHEN k ~* '(^|_)(pass|password|senha|secret|segredo|token|api_?key|chave_api|private_key)($|_)'
      THEN to_jsonb('«oculto»'::text)
    WHEN jsonb_typeof(v) = 'string' AND left(v #>> '{}', 5) = 'data:'
         AND strpos(v #>> '{}', ';base64,') > 0
      THEN to_jsonb(format('«ficheiro em base64 · %s KB»', length(v #>> '{}') / 1365))
    WHEN length(v::text) > 20000
      THEN to_jsonb(format('«conteúdo extenso · %s KB»', length(v::text) / 1024))
    ELSE v END), '{}'::jsonb)
  FROM jsonb_each(j) AS e (k, v)
$$;

-- Nome legível do registo: número (proposta, OS, serviço…) + título/nome.
CREATE OR REPLACE FUNCTION public.auditoria_rotulo(r jsonb) RETURNS text
LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE k text; v text; v_num text; v_nome text;
BEGIN
  FOREACH k IN ARRAY ARRAY['numero_proposta','numero_documento','numero_po','service_id','codigo',
                           'ref_interna','produto_ref','numero'] LOOP
    v := nullif(btrim(r ->> k), '');
    -- ignorar chaves que são uuid, e o «numero» da morada (fornecedores)
    IF v IS NOT NULL AND v !~* '^[0-9a-f]{8}-[0-9a-f]{4}-' AND NOT (k = 'numero' AND r ? 'logradouro') THEN
      v_num := v; EXIT;
    END IF;
  END LOOP;
  FOREACH k IN ARRAY ARRAY['titulo','nome','full_name','nome_fantasia','razao_social','designacao',
                           'produto_desc','cliente_nome','texto','description','descricao','servico',
                           'email','record_date','data_aula','data_matricula','data'] LOOP
    v := nullif(btrim(r ->> k), '');
    IF v IS NOT NULL THEN v_nome := left(v, 120); EXIT; END IF;
  END LOOP;
  RETURN nullif(concat_ws(' · ', v_num, v_nome), '');
END $$;

COMMIT;

-- AUDITORIA TOTAL — parte 3 de 7: a que empresa/grupo pertence cada registo, e o registo-pai. 21/10/2026
-- Muitas tabelas não têm empresa_id (tarefas da checklist, comentários, linhas…): vai-se ao pai.
-- Se o pai já foi apagado na mesma operação (cascata), lê-se o que a auditoria guardou dele.
-- p_tipo: 'empresa' (documentos), 'grupo' (dados-mestre partilhados) ou 'global' (catálogos).
BEGIN;

DROP FUNCTION IF EXISTS public.auditoria_ambito(text, text, jsonb, uuid);
CREATE FUNCTION public.auditoria_ambito(p_tabela text, p_tipo text, r jsonb, p_uid uuid,
  OUT o_empresa uuid, OUT o_grupo uuid, OUT o_ambito text, OUT o_contexto text, OUT o_cascata boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pai_t text; v_pai_id text; v_nome_pai text; v_pai jsonb; v_pai_amb record; v_aud record;
        v_emp uuid; v_n int; v_grupos uuid[];
BEGIN
  o_empresa := nullif(r ->> 'empresa_id', '')::uuid;
  o_grupo   := nullif(r ->> 'grupo_id', '')::uuid;
  o_cascata := false;
  v_pai_t := CASE
    WHEN p_tabela = 'cartao_checklist_items' THEN 'cartao_checklists'
    WHEN p_tabela IN ('cartao_anexos', 'cartao_checklists', 'cartao_comentarios', 'cartao_etiqueta_rel',
                      'cartao_membros') THEN 'quadro_cartoes'
    WHEN p_tabela = 'cartao_etiquetas' THEN 'quadros'
    WHEN p_tabela = 'checklist_template_items' THEN 'checklist_templates'
    WHEN p_tabela = 'os_checklist_template_itens' THEN 'os_checklist_templates'
    WHEN p_tabela IN ('notas_encomenda_items', 'notas_encomenda_checklist') THEN 'notas_encomenda'
    WHEN p_tabela = 'ordens_servico_checklist' THEN 'ordens_servico'
    WHEN p_tabela = 'account_payments' THEN 'accounts_payable'
    WHEN p_tabela = 'propostas_linhas' THEN 'propostas'
    WHEN p_tabela = 'po_linhas' THEN 'pedidos_orcamento'
    WHEN p_tabela = 'time_records' THEN 'employees'
    WHEN p_tabela = 'school_matriculas' THEN 'school_alunos'
    WHEN p_tabela = 'school_frequencia' THEN 'school_matriculas'
    WHEN p_tabela = 'school_formacao_normas' THEN 'school_formacoes' END;
  v_pai_id := r ->> CASE v_pai_t
    WHEN 'cartao_checklists' THEN 'checklist_id'   WHEN 'quadro_cartoes' THEN 'cartao_id'
    WHEN 'quadros' THEN 'quadro_id'                WHEN 'checklist_templates' THEN 'template_id'
    WHEN 'os_checklist_templates' THEN 'template_id' WHEN 'notas_encomenda' THEN 'ne_id'
    WHEN 'ordens_servico' THEN 'os_id'             WHEN 'accounts_payable' THEN 'account_payable_id'
    WHEN 'propostas' THEN 'proposta_id'            WHEN 'pedidos_orcamento' THEN 'po_id'
    WHEN 'employees' THEN 'employee_id'            WHEN 'school_alunos' THEN 'aluno_id'
    WHEN 'school_matriculas' THEN 'matricula_id'   WHEN 'school_formacoes' THEN 'formacao_id' END;

  IF v_pai_id IS NOT NULL THEN
    v_nome_pai := CASE v_pai_t
      WHEN 'quadro_cartoes' THEN 'cartão' WHEN 'cartao_checklists' THEN 'checklist' WHEN 'quadros' THEN 'quadro'
      WHEN 'notas_encomenda' THEN 'NE' WHEN 'ordens_servico' THEN 'OS' WHEN 'accounts_payable' THEN 'conta'
      WHEN 'propostas' THEN 'proposta' WHEN 'pedidos_orcamento' THEN 'pedido' WHEN 'employees' THEN 'colaborador'
      WHEN 'school_alunos' THEN 'aluno' WHEN 'school_matriculas' THEN 'matrícula'
      WHEN 'school_formacoes' THEN 'formação' ELSE 'modelo' END;
    EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE t.id = $1', v_pai_t) INTO v_pai USING v_pai_id::uuid;
    IF v_pai IS NOT NULL THEN          -- pai vivo: empresa e contexto dele (e do avô, se houver)
      SELECT * INTO v_pai_amb FROM public.auditoria_ambito(v_pai_t, p_tipo, v_pai, p_uid);
      v_emp := v_pai_amb.o_empresa;
      o_contexto := concat_ws(' · ', v_pai_amb.o_contexto,
                              v_nome_pai || ' «' || coalesce(public.auditoria_rotulo(v_pai), '?') || '»');
    ELSE                               -- pai apagado nesta mesma operação: cascata
      SELECT a.empresa_id, a.contexto, a.rotulo INTO v_aud FROM auditoria a
       WHERE a.tabela = v_pai_t AND a.registo_id = v_pai_id AND a.operacao = 'DELETE' AND a.quando = now()
       ORDER BY a.id DESC LIMIT 1;
      IF FOUND THEN
        v_emp := v_aud.empresa_id; o_cascata := true;
        o_contexto := concat_ws(' · ', v_aud.contexto, v_nome_pai || ' «' || v_aud.rotulo || '» (apagado)');
      END IF;
    END IF;
  ELSIF p_tabela = 'empresas' THEN o_empresa := (r ->> 'id')::uuid;
  ELSIF p_tabela = 'empresa_grupos' THEN o_grupo := (r ->> 'id')::uuid;
  ELSIF p_tabela = 'liquidacoes' THEN   -- service_id é o nº do trabalho; pode repetir-se entre empresas
    SELECT min(s.empresa_id::text)::uuid, count(DISTINCT s.empresa_id) INTO v_emp, v_n
      FROM services s WHERE s.service_id = r ->> 'service_id';
    IF v_n <> 1 THEN v_emp := NULL; END IF;
    o_contexto := 'serviço ' || (r ->> 'service_id');
  ELSIF p_tabela IN ('liberty_utilizadores', 'liberty_configuracoes_utilizador') THEN   -- grupo das empresas da pessoa
    SELECT array_agg(DISTINCT e.grupo_id) INTO v_grupos FROM liberty_utilizador_empresas lue JOIN empresas e ON e.id = lue.empresa_id
     WHERE lue.utilizador_id = (r ->> CASE p_tabela WHEN 'liberty_utilizadores' THEN 'id' ELSE 'utilizador_id' END)::uuid;
    IF array_length(v_grupos, 1) = 1 THEN o_grupo := v_grupos[1]; END IF;
  END IF;

  o_empresa := coalesce(o_empresa, v_emp);
  IF o_grupo IS NULL AND o_empresa IS NOT NULL THEN
    SELECT e.grupo_id INTO o_grupo FROM empresas e WHERE e.id = o_empresa;
  END IF;
  -- Nada no registo nem no pai: o grupo de quem fez, se for um só.
  IF o_empresa IS NULL AND o_grupo IS NULL AND p_tipo <> 'global' AND p_uid IS NOT NULL THEN
    SELECT array_agg(DISTINCT e.grupo_id) INTO v_grupos FROM liberty_utilizador_empresas lue
      JOIN liberty_utilizadores lu ON lu.id = lue.utilizador_id JOIN empresas e ON e.id = lue.empresa_id
      WHERE lu.auth_user_id = p_uid;
    IF array_length(v_grupos, 1) = 1 THEN o_grupo := v_grupos[1]; END IF;
  END IF;
  o_ambito := CASE WHEN p_tipo = 'empresa' AND o_empresa IS NOT NULL THEN 'empresa'
                   WHEN o_grupo IS NOT NULL THEN 'grupo'
                   WHEN o_empresa IS NOT NULL THEN 'empresa'
                   ELSE 'global' END;
  o_contexto := left(o_contexto, 200);
END $$;

COMMIT;

-- AUDITORIA TOTAL — parte 4 de 7: o gatilho que regista cada criação, alteração e eliminação. 21/10/2026
-- Quem: a conta da sessão (auth.uid()) e o nome da FICHA liberty_utilizadores — nunca o profiles,
-- que guarda o nome antigo das contas reaproveitadas (caso André Tiago / Cristiana Batista).
-- Se a auditoria falhar, a gravação do utilizador NÃO é afetada: fica uma linha mínima com o erro.
BEGIN;

CREATE OR REPLACE FUNCTION public.auditoria_registar() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_linha jsonb; v_antes jsonb; v_depois jsonb; v_campos text[]; v_reg text;
  v_uid uuid; v_claims jsonb; v_papel text; v_email text; v_sessao uuid; v_ip text;
  v_autor_id uuid; v_autor_nome text; v_amb record;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- só as colunas que mudaram de facto. Não contam: carimbos automáticos e a ordem de
    -- arrastar (posicao/ordem muda em muitos registos de cada vez; mudar de lista conta, pela lista_id)
    SELECT array_agg(n.key ORDER BY n.key), jsonb_object_agg(n.key, o.value), jsonb_object_agg(n.key, n.value)
      INTO v_campos, v_antes, v_depois
      FROM jsonb_each(to_jsonb(NEW)) n JOIN jsonb_each(to_jsonb(OLD)) o ON o.key = n.key
     WHERE n.value IS DISTINCT FROM o.value
       AND n.key NOT IN ('updated_at', 'atualizado_em', 'atualizada_em', 'posicao', 'ordem',
                         'concluido_alterado_em', 'concluido_alterado_por', 'concluido_alterado_por_nome');
    IF v_campos IS NULL THEN RETURN NULL; END IF;
    v_linha := to_jsonb(NEW);
  ELSIF TG_OP = 'INSERT' THEN
    v_linha := to_jsonb(NEW); v_depois := v_linha;
    -- as linhas «atividade» do feed do cartão já são rasto da ação, que é auditada à parte
    IF TG_TABLE_NAME = 'cartao_comentarios' AND v_linha ->> 'tipo' = 'atividade' THEN RETURN NULL; END IF;
  ELSE
    v_linha := to_jsonb(OLD); v_antes := v_linha;
  END IF;

  IF coalesce(TG_ARGV[1], 'id') = 'id' THEN
    v_reg := v_linha ->> 'id';
  ELSE
    SELECT string_agg(v_linha ->> c, '/' ORDER BY i) INTO v_reg
      FROM unnest(string_to_array(TG_ARGV[1], ',')) WITH ORDINALITY AS t (c, i);
  END IF;

  v_uid    := auth.uid();
  v_claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  v_papel  := coalesce(v_claims ->> 'role', current_user::text);
  v_email  := v_claims ->> 'email';
  IF v_claims ->> 'session_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_sessao := (v_claims ->> 'session_id')::uuid;
  END IF;
  v_ip := nullif(btrim(split_part(
            nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-forwarded-for', ',', 1)), '');
  IF v_uid IS NOT NULL THEN
    SELECT u.id, nullif(btrim(u.nome), '') INTO v_autor_id, v_autor_nome
      FROM liberty_utilizadores u WHERE u.auth_user_id = v_uid;
  END IF;
  v_autor_nome := coalesce(v_autor_nome, v_email, CASE v_papel
                    WHEN 'service_role' THEN 'Sistema (automático)'
                    WHEN 'anon' THEN 'Anónimo (sem sessão)'
                    WHEN 'authenticated' THEN 'Conta sem ficha'
                    WHEN 'postgres' THEN 'SQL Editor (administração da base)'
                    ELSE 'Sistema (' || v_papel || ')' END);

  SELECT * INTO v_amb FROM public.auditoria_ambito(TG_TABLE_NAME, coalesce(TG_ARGV[0], 'empresa'), v_linha, v_uid);
  -- cartão mudado de lista: guardar os nomes (as listas podem ser renomeadas ou apagadas depois)
  IF TG_TABLE_NAME = 'quadro_cartoes' AND 'lista_id' = ANY (v_campos) THEN
    v_amb.o_contexto := concat_ws(' · ', v_amb.o_contexto, 'de «'
      || coalesce((SELECT nome FROM quadro_listas WHERE id = (v_antes ->> 'lista_id')::uuid), '?') || '» para «'
      || coalesce((SELECT nome FROM quadro_listas WHERE id = (v_depois ->> 'lista_id')::uuid), '?') || '»');
  END IF;

  INSERT INTO public.auditoria (auth_uid, autor_id, autor_nome, autor_email, papel, sessao_id, ip,
    empresa_id, grupo_id, ambito, tabela, operacao, registo_id, rotulo, contexto, campos, antes, depois, automatica)
  VALUES (v_uid, v_autor_id, v_autor_nome, v_email, v_papel, v_sessao, v_ip,
    v_amb.o_empresa, v_amb.o_grupo, v_amb.o_ambito, TG_TABLE_NAME, TG_OP, v_reg,
    public.auditoria_rotulo(v_linha), v_amb.o_contexto, v_campos,
    public.auditoria_limpar(v_antes), public.auditoria_limpar(v_depois),
    pg_trigger_depth() > 1 OR coalesce(v_amb.o_cascata, false));
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  BEGIN
    INSERT INTO public.auditoria (auth_uid, autor_nome, tabela, operacao, registo_id, erro)
    VALUES (auth.uid(), coalesce(v_autor_nome, 'desconhecido'), TG_TABLE_NAME, TG_OP, v_reg,
            SQLSTATE || ': ' || SQLERRM);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'auditoria falhou em % (%): %', TG_TABLE_NAME, TG_OP, SQLERRM;
  END;
  RETURN NULL;
END $$;

-- Funções internas: não ficam expostas como RPC à app (a auditoria_ambito lê dados de qualquer empresa).
REVOKE EXECUTE ON FUNCTION public.auditoria_registar() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auditoria_ambito(text, text, jsonb, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auditoria_limpar(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auditoria_rotulo(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auditoria_imutavel() FROM PUBLIC, anon, authenticated;

COMMIT;

-- AUDITORIA TOTAL — parte 5 de 7: ligar o gatilho a todas as tabelas de negócio, e a purga. 21/10/2026
-- Liga TODAS as tabelas do esquema public, exceto as de auditoria_excluidas e as cópias de
-- segurança antigas (*_bak_*, bkp_*, _bk_*, _dup*). Tabela nova no futuro: SELECT public.auditoria_ativar('nome');
BEGIN;
SET LOCAL client_min_messages = warning;   -- sem os ~180 avisos «trigger does not exist, skipping»

CREATE OR REPLACE FUNCTION public.auditoria_ativar(p_tabela text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pk text; v_tipo text;
BEGIN
  IF p_tabela = 'auditoria' OR EXISTS (SELECT 1 FROM auditoria_excluidas WHERE tabela = p_tabela) THEN
    RETURN p_tabela || ': excluída';
  END IF;
  SELECT string_agg(a.attname, ',' ORDER BY array_position(i.indkey::int2[], a.attnum)) INTO v_pk
    FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY (i.indkey)
   WHERE i.indrelid = format('public.%I', p_tabela)::regclass AND i.indisprimary;
  v_tipo := CASE
    -- dados-mestre partilhados pelas empresas do grupo
    WHEN p_tabela IN ('clientes', 'suppliers', 'employees', 'subempreiteiros', 'subempreiteiros_documentos',
                      'liberty_utilizadores', 'liberty_utilizador_empresas', 'liberty_utilizador_permissoes', 'liberty_configuracoes_utilizador',
                      'profiles', 'job_positions', 'rh_funcoes', 'rh_criterios', 'rh_aval_perfis',
                      'rh_funcao_passagens', 'assinaturas', 'assinatura_faturas', 'empresa_grupos') THEN 'grupo'
    -- catálogos comuns a todas as empresas
    WHEN p_tabela IN ('adm_paises', 'adm_tipos_documento', 'ag_paises_config', 'lb_taxas_cambio', 'planos',
                      'quadro_modelos', 'quadro_modelo_listas', 'auditoria_excluidas', 'auditoria_leitores') THEN 'global'
    ELSE 'empresa' END;
  BEGIN   -- uma tabela de outro dono (ex.: criada no painel) não trava as outras; o VERIFICAR mostra-a
    EXECUTE format('DROP TRIGGER IF EXISTS auditoria_rasto ON public.%I', p_tabela);
    EXECUTE format('CREATE TRIGGER auditoria_rasto AFTER INSERT OR UPDATE OR DELETE ON public.%I '
                   'FOR EACH ROW EXECUTE FUNCTION public.auditoria_registar(%L, %L)',
                   p_tabela, v_tipo, coalesce(v_pk, 'id'));
  EXCEPTION WHEN OTHERS THEN
    RETURN p_tabela || ': NÃO LIGADA — ' || SQLERRM;
  END;
  RETURN p_tabela || ': ' || v_tipo;
END $$;

-- Purga por antiguidade (fica registada na própria auditoria). Mínimo 12 meses.
CREATE OR REPLACE FUNCTION public.auditoria_purgar(p_meses int DEFAULT 24) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n bigint;
BEGIN
  IF p_meses IS NULL OR p_meses < 12 THEN RAISE EXCEPTION 'Guardar pelo menos 12 meses de auditoria.'; END IF;
  PERFORM set_config('auditoria.purgar', 'sim', true);
  DELETE FROM auditoria WHERE quando < now() - make_interval(months => p_meses);
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM set_config('auditoria.purgar', '', true);
  INSERT INTO auditoria (autor_nome, papel, tabela, operacao, rotulo)
  VALUES ('Sistema (purga)', current_user, 'auditoria', 'DELETE',
          format('purga: %s registos com mais de %s meses', n, p_meses));
  RETURN n;
END $$;

REVOKE EXECUTE ON FUNCTION public.auditoria_ativar(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auditoria_purgar(int) FROM PUBLIC, anon, authenticated;

-- As cópias de segurança antigas ficam registadas como excluídas (lista explícita, sem surpresas).
INSERT INTO public.auditoria_excluidas (tabela, motivo)
SELECT c.relname, 'cópia de segurança antiga' FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname ~ '(_bak_|^bkp_|^_bk_|^_dup|^lue_bak)'
ON CONFLICT (tabela) DO NOTHING;

-- Ligar. Devolve uma linha por tabela com o âmbito escolhido.
SELECT public.auditoria_ativar(c.relname) AS tabela_ativada
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND c.relname <> 'auditoria'
   AND c.relname NOT IN (SELECT tabela FROM public.auditoria_excluidas)
 ORDER BY c.relname;

COMMIT;

-- Purga automática (OPCIONAL, decidir antes): todos os dias 1 às 03:30, guarda 24 meses.
-- SELECT cron.schedule('auditoria-purga', '30 3 1 * *', 'SELECT public.auditoria_purgar(24)');

-- AUDITORIA TOTAL — parte 6 de 7: ações que não escrevem numa tabela (ex.: exportar dados). 21/10/2026
-- Substitui o registo antigo da app (liberty_atividades): a app chama supabase.rpc('auditoria_evento', …).
-- Quem fez vem SEMPRE da sessão (não se pode assinar por outro) e só utilizadores internos registam.
BEGIN;

CREATE OR REPLACE FUNCTION public.auditoria_evento(p_acao text, p_descricao text, p_tabela text DEFAULT NULL,
  p_registo_id text DEFAULT NULL, p_rotulo text DEFAULT NULL, p_empresa_id uuid DEFAULT NULL, p_dados jsonb DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_claims jsonb; v_autor record; v_tabela text; v_emp uuid; v_grupo uuid; v_grupos uuid[];
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sem sessão iniciada.'; END IF;
  SELECT u.id, nullif(btrim(u.nome), '') AS nome INTO v_autor FROM liberty_utilizadores u WHERE u.auth_user_id = v_uid;
  IF v_autor.id IS NULL THEN RAISE EXCEPTION 'Só utilizadores internos registam eventos.'; END IF;
  v_claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;

  -- a tabela só conta se existir (decide o módulo no ecrã); a empresa só se a pessoa lá tiver acesso
  SELECT c.relname INTO v_tabela FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname = p_tabela;
  IF p_empresa_id IS NOT NULL AND public.user_has_empresa_access(p_empresa_id) THEN
    v_emp := p_empresa_id;
    SELECT e.grupo_id INTO v_grupo FROM empresas e WHERE e.id = v_emp;
  ELSE
    SELECT array_agg(DISTINCT e.grupo_id) INTO v_grupos FROM liberty_utilizador_empresas lue
      JOIN empresas e ON e.id = lue.empresa_id WHERE lue.utilizador_id = v_autor.id;
    IF array_length(v_grupos, 1) = 1 THEN v_grupo := v_grupos[1]; END IF;
  END IF;

  INSERT INTO auditoria (auth_uid, autor_id, autor_nome, autor_email, papel, sessao_id, ip, empresa_id, grupo_id,
    ambito, tabela, operacao, registo_id, rotulo, depois)
  VALUES (v_uid, v_autor.id, coalesce(v_autor.nome, v_claims ->> 'email', 'Conta sem nome'), v_claims ->> 'email',
    'authenticated',
    CASE WHEN v_claims ->> 'session_id' ~* '^[0-9a-f-]{36}$' THEN (v_claims ->> 'session_id')::uuid END,
    nullif(btrim(split_part(nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-forwarded-for', ',', 1)), ''),
    v_emp, v_grupo, CASE WHEN v_emp IS NOT NULL THEN 'empresa' WHEN v_grupo IS NOT NULL THEN 'grupo' ELSE 'global' END,
    coalesce(v_tabela, 'evento'), 'EVENTO', left(p_registo_id, 100), left(p_rotulo, 160),
    public.auditoria_limpar(jsonb_strip_nulls(jsonb_build_object(
      'acao', left(p_acao, 60), 'descricao', left(p_descricao, 500),
      'dados', CASE WHEN length(p_dados::text) <= 4000 THEN p_dados END))));
END $$;

REVOKE EXECUTE ON FUNCTION public.auditoria_evento(text, text, text, text, text, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.auditoria_evento(text, text, text, text, text, uuid, jsonb) TO authenticated;

COMMIT;

-- AUDITORIA TOTAL — parte 7 de 7: trazer o registo antigo (liberty_atividades) para a auditoria. 21/10/2026
-- Pode correr-se mais vezes sem duplicar (cada linha leva o id antigo). CORRER OUTRA VEZ depois de publicar
-- a versão nova da app em produção: até lá, a versão antiga continua a escrever em liberty_atividades.
-- O nome é o que ficou gravado na altura (numa conta reaproveitada, o da pessoa de então).
-- A tabela liberty_atividades NÃO é apagada (fica como estava; pode retirar-se mais tarde).
BEGIN;

INSERT INTO public.auditoria (quando, auth_uid, autor_nome, papel, empresa_id, grupo_id, ambito, tabela, operacao,
  registo_id, rotulo, contexto, depois)
SELECT a.data_hora, a.utilizador_id,
  -- o registo antigo gravava «Utilizador» quando o perfil faltava: aí, o nome ATUAL da conta (assinalado)
  CASE WHEN coalesce(btrim(a.utilizador_nome), '') IN ('', 'Utilizador')
       THEN coalesce(lu.nome || ' (nome atual da conta)', 'Utilizador') ELSE a.utilizador_nome END,
  'authenticated', a.empresa_id, e.grupo_id, 'empresa',
  CASE
    WHEN a.modulo = 'Clientes' THEN 'clientes'
    WHEN a.modulo = 'Propostas' THEN 'propostas'
    WHEN a.modulo = 'Follow-up' THEN 'followup_oportunidades'
    WHEN a.acao IN ('atualizou_aparencia', 'atualizou_notificacoes') THEN 'liberty_configuracoes_utilizador'
    WHEN a.acao = 'atualizou_dados_empresa' THEN 'liberty_empresas_config'
    WHEN a.acao LIKE '%utilizador%' OR a.acao IN ('atualizou_permissoes', 'repos_senha') THEN 'liberty_utilizadores'
    ELSE 'evento' END,
  'EVENTO', a.entidade_id::text, a.entidade_ref, 'registo antigo da app',
  jsonb_strip_nulls(jsonb_build_object('acao', a.acao, 'descricao', a.descricao, 'modulo_antigo', a.modulo,
    'entidade_tipo', a.entidade_tipo, 'dados', a.metadata, 'id_antigo', a.id))
FROM public.liberty_atividades a
LEFT JOIN public.empresas e ON e.id = a.empresa_id
LEFT JOIN public.liberty_utilizadores lu ON lu.auth_user_id = a.utilizador_id
WHERE a.id::text NOT IN (SELECT x.depois ->> 'id_antigo' FROM public.auditoria x
                          WHERE x.operacao = 'EVENTO' AND x.depois ? 'id_antigo')
ORDER BY a.data_hora;

COMMIT;

SELECT (SELECT count(*) FROM public.liberty_atividades) AS registos_antigos,
       (SELECT count(*) FROM public.auditoria WHERE operacao = 'EVENTO' AND depois ? 'id_antigo') AS ja_na_auditoria;

