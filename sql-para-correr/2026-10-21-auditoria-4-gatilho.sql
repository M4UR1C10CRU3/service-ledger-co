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
