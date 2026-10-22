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
