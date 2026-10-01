-- ============================================================================
-- Fechar o acesso em toda a base — de forma sistemática
-- ----------------------------------------------------------------------------
-- O inventário mostrou que quase todas as tabelas têm ~3 políticas do tipo
-- "qualquer utilizador autenticado". Não é um descuido pontual: é um padrão
-- aplicado em bloco no início do projeto. Escrever quarenta políticas à mão
-- seria garantir que me escapava alguma — por isso é a base que descobre as
-- tabelas, a partir das colunas que elas têm.
--
-- REGRAS DE ÂMBITO (decisão do utilizador, 2026-08-02):
--   • clientes, suppliers, employees  → GRUPO  (as 5 empresas partilham de propósito)
--   • tudo o resto com empresa_id     → EMPRESA
--   • tabelas sem empresa_id nem grupo_id → NÃO SE TOCA, e ficam listadas no fim
--
-- SEGURANÇA DA OPERAÇÃO: a política nova é criada ANTES de a antiga ser
-- removida. Como as políticas permissivas se somam, o acesso mantém-se aberto
-- durante a transição e fecha só no fim. Em nenhum instante alguém fica sem
-- acesso ao próprio trabalho.
-- ============================================================================

DO $$
DECLARE
  r            RECORD;
  v_ambito     TEXT;
  v_cond       TEXT;
  v_sem_ambito TEXT[] := '{}';
  v_feitas     INTEGER := 0;
  p            RECORD;
BEGIN
  FOR r IN
    SELECT c.relname AS tabela,
           EXISTS (SELECT 1 FROM information_schema.columns col
                    WHERE col.table_schema='public' AND col.table_name=c.relname
                      AND col.column_name='empresa_id') AS tem_empresa,
           EXISTS (SELECT 1 FROM information_schema.columns col
                    WHERE col.table_schema='public' AND col.table_name=c.relname
                      AND col.column_name='grupo_id')   AS tem_grupo
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
      AND EXISTS (SELECT 1 FROM pg_policies pp
                   WHERE pp.schemaname='public' AND pp.tablename=c.relname
                     AND pp.qual ILIKE '%uid() is not null%')
    ORDER BY c.relname
  LOOP
    -- Que âmbito se aplica a esta tabela?
    IF r.tabela IN ('clientes') AND r.tem_grupo THEN
      v_ambito := 'grupo_proprio';
      v_cond   := format('EXISTS (SELECT 1 FROM empresas e WHERE e.grupo_id = %I.grupo_id '
                       || 'AND user_has_empresa_access(e.id))', r.tabela);
    ELSIF r.tabela IN ('suppliers','employees') AND r.tem_empresa THEN
      v_ambito := 'grupo';
      v_cond   := format('user_has_grupo_access(%I.empresa_id)', r.tabela);
    ELSIF r.tem_empresa THEN
      v_ambito := 'empresa';
      v_cond   := format('user_has_empresa_access(%I.empresa_id)', r.tabela);
    ELSE
      -- Sem coluna que diga de quem é a linha, não há como decidir. Deixa-se
      -- como está e regista-se: fechar às cegas trancava utilizadores fora.
      v_sem_ambito := array_append(v_sem_ambito, r.tabela);
      CONTINUE;
    END IF;

    -- 1) Criar a política nova PRIMEIRO (as permissivas somam-se: nada fecha ainda)
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.tabela || '_acesso', r.tabela);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (%s) WITH CHECK (%s)',
      r.tabela || '_acesso', r.tabela, v_cond, v_cond);

    -- 2) Só agora remover as antigas — e só as permissivas, nunca outras
    FOR p IN
      SELECT policyname FROM pg_policies
      WHERE schemaname='public' AND tablename=r.tabela
        AND qual ILIKE '%uid() is not null%'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, r.tabela);
    END LOOP;

    v_feitas := v_feitas + 1;
    RAISE NOTICE 'fechada: % (%)', r.tabela, v_ambito;
  END LOOP;

  RAISE NOTICE '--- % tabelas fechadas ---', v_feitas;
  IF array_length(v_sem_ambito, 1) > 0 THEN
    RAISE NOTICE 'SEM COLUNA DE DONO, ficaram abertas: %', array_to_string(v_sem_ambito, ', ');
  END IF;
END $$;
