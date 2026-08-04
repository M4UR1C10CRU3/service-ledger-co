-- ============================================================================
-- Fechar os Quadros ao nível da base de dados
-- ----------------------------------------------------------------------------
-- A migration de junho criou, em nove tabelas, a mesma política:
--   FOR ALL TO authenticated USING (auth.uid() IS NOT NULL)
-- Ou seja: qualquer pessoa com sessão iniciada lê e escreve nos quadros de
-- qualquer empresa. O ecrã filtra; a API não.
--
-- Enquanto os utilizadores eram todos vossos, isso aguentava. Com uma conta de
-- demonstração entregue a alguém de fora, deixa de aguentar — bastava abrir a
-- consola do browser para ler os cartões da Obrajusta.
--
-- CADA POLÍTICA É SUBSTITUÍDA, NUNCA APENAS REMOVIDA. Em nenhum momento uma
-- tabela fica com RLS ligado e sem política — isso trancaria toda a gente fora
-- do próprio trabalho.
-- ============================================================================

-- ── Os três de topo: têm empresa_id próprio ─────────────────────────────────
DROP POLICY IF EXISTS quadros_auth ON public.quadros;
DROP POLICY IF EXISTS quadros_acesso ON public.quadros;
CREATE POLICY quadros_acesso ON public.quadros
  FOR ALL TO authenticated
  USING      ((SELECT user_has_empresa_access(empresa_id)))
  WITH CHECK ((SELECT user_has_empresa_access(empresa_id)));

DROP POLICY IF EXISTS quadro_listas_auth ON public.quadro_listas;
DROP POLICY IF EXISTS quadro_listas_empresa ON public.quadro_listas;
DROP POLICY IF EXISTS quadro_listas_acesso ON public.quadro_listas;
CREATE POLICY quadro_listas_acesso ON public.quadro_listas
  FOR ALL TO authenticated
  USING      ((SELECT user_has_empresa_access(empresa_id)))
  WITH CHECK ((SELECT user_has_empresa_access(empresa_id)));

DROP POLICY IF EXISTS quadro_cartoes_auth ON public.quadro_cartoes;
DROP POLICY IF EXISTS quadro_cartoes_acesso ON public.quadro_cartoes;
CREATE POLICY quadro_cartoes_acesso ON public.quadro_cartoes
  FOR ALL TO authenticated
  USING      ((SELECT user_has_empresa_access(empresa_id)))
  WITH CHECK ((SELECT user_has_empresa_access(empresa_id)));

-- ── As filhas do cartão: herdam pelo cartão ─────────────────────────────────
-- EXISTS com a chave indexada, não um JOIN — a política corre a cada linha
-- devolvida, e uma consulta mal escrita aqui faz o quadro demorar segundos.
DO $$
DECLARE
  t TEXT;
  fk TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['cartao_checklists','cartao_comentarios','cartao_membros','cartao_etiqueta_rel'] LOOP
    fk := 'cartao_id';
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_auth', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_acesso', t);
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
      FOR ALL TO authenticated
      USING      (EXISTS (SELECT 1 FROM public.quadro_cartoes c
                           WHERE c.id = %I.%I AND user_has_empresa_access(c.empresa_id)))
      WITH CHECK (EXISTS (SELECT 1 FROM public.quadro_cartoes c
                           WHERE c.id = %I.%I AND user_has_empresa_access(c.empresa_id)))
    $f$, t || '_acesso', t, t, fk, t, fk);
  END LOOP;
END $$;

-- Os itens da checklist estão a dois saltos do cartão.
DROP POLICY IF EXISTS cartao_checklist_items_auth ON public.cartao_checklist_items;
DROP POLICY IF EXISTS cartao_checklist_items_acesso ON public.cartao_checklist_items;
CREATE POLICY cartao_checklist_items_acesso ON public.cartao_checklist_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cartao_checklists cl
    JOIN public.quadro_cartoes c ON c.id = cl.cartao_id
    WHERE cl.id = cartao_checklist_items.checklist_id
      AND user_has_empresa_access(c.empresa_id)))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cartao_checklists cl
    JOIN public.quadro_cartoes c ON c.id = cl.cartao_id
    WHERE cl.id = cartao_checklist_items.checklist_id
      AND user_has_empresa_access(c.empresa_id)));

-- ── Etiquetas: leitura larga de PROPÓSITO ───────────────────────────────────
-- A aplicação mostra deliberadamente as etiquetas de todos os quadros das
-- empresas não-ITC, para a equipa reaproveitar o vocabulário já criado em vez
-- de reinventar "Urgente" em cada quadro. Fechar isto por empresa partia uma
-- funcionalidade que alguém pensou.
--
-- Compromisso: LER as etiquetas dos quadros a que se tem acesso, mas CRIAR e
-- ALTERAR só nas próprias. Assim ninguém mexe no vocabulário de outra empresa.
DROP POLICY IF EXISTS cartao_etiquetas_auth ON public.cartao_etiquetas;
DROP POLICY IF EXISTS cartao_etiquetas_leitura ON public.cartao_etiquetas;
DROP POLICY IF EXISTS cartao_etiquetas_escrita ON public.cartao_etiquetas;

CREATE POLICY cartao_etiquetas_leitura ON public.cartao_etiquetas
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.quadros q
                  WHERE q.id = cartao_etiquetas.quadro_id
                    AND user_has_empresa_access(q.empresa_id)));

CREATE POLICY cartao_etiquetas_escrita ON public.cartao_etiquetas
  FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM public.quadros q
                       WHERE q.id = cartao_etiquetas.quadro_id
                         AND user_has_empresa_access(q.empresa_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.quadros q
                       WHERE q.id = cartao_etiquetas.quadro_id
                         AND user_has_empresa_access(q.empresa_id)));

-- ── Anexos, se a tabela existir ─────────────────────────────────────────────
DO $$
BEGIN
  IF to_regclass('public.cartao_anexos') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS cartao_anexos_auth ON public.cartao_anexos';
    EXECUTE 'DROP POLICY IF EXISTS cartao_anexos_acesso ON public.cartao_anexos';
    EXECUTE $p$
      CREATE POLICY cartao_anexos_acesso ON public.cartao_anexos
      FOR ALL TO authenticated
      USING      (EXISTS (SELECT 1 FROM public.quadro_cartoes c
                           WHERE c.id = cartao_anexos.cartao_id
                             AND user_has_empresa_access(c.empresa_id)))
      WITH CHECK (EXISTS (SELECT 1 FROM public.quadro_cartoes c
                           WHERE c.id = cartao_anexos.cartao_id
                             AND user_has_empresa_access(c.empresa_id)))
    $p$;
  END IF;
END $$;

-- ============================================================================
-- Depois de correr, confirme que ainda vê os seus quadros ANTES de fechar o
-- SQL Editor. Se alguma coisa desaparecer, o remédio é imediato:
--   CREATE POLICY quadros_emergencia ON public.quadros FOR ALL TO authenticated
--     USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
-- ============================================================================
