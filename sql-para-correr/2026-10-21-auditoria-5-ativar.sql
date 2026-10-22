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
