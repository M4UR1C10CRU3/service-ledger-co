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
