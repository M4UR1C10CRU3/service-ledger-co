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
