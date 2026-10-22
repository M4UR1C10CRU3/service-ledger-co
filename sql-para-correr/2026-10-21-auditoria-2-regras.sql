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
