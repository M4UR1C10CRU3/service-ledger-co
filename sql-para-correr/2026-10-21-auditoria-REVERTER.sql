-- REVERTER a auditoria total (partes 1 a 7 de 2026-10-21-auditoria) — 21/10/2026
-- Desliga o registo: tira o gatilho de todas as tabelas, as regras de leitura e as funções.
-- A gravação normal da app não depende de nada disto. O RASTO JÁ REGISTADO FICA (tabela
-- auditoria, que continua imutável), só deixa de se ler pela app. Voltar a correr as partes
-- 1 a 7 religa tudo e mantém o histórico (a parte 7 não duplica o registo antigo).
-- ATENÇÃO: sem a parte 6, a app deixa de conseguir registar exportações (o registo antigo já não é usado).
BEGIN;
SET LOCAL client_min_messages = warning;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT c.relname FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
           JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'public' AND t.tgname = 'auditoria_rasto' LOOP
    EXECUTE format('DROP TRIGGER auditoria_rasto ON public.%I', r.relname);
  END LOOP;
END $$;

DROP POLICY IF EXISTS auditoria_leitura ON public.auditoria;
DROP POLICY IF EXISTS auditoria_excluidas_leitura ON public.auditoria_excluidas;
DROP POLICY IF EXISTS auditoria_leitores_leitura ON public.auditoria_leitores;

DROP FUNCTION IF EXISTS public.auditoria_evento(text, text, text, text, text, uuid, jsonb);
DROP FUNCTION IF EXISTS public.auditoria_registar();
DROP FUNCTION IF EXISTS public.auditoria_ambito(text, text, jsonb, uuid);
DROP FUNCTION IF EXISTS public.auditoria_limpar(jsonb);
DROP FUNCTION IF EXISTS public.auditoria_rotulo(jsonb);
DROP FUNCTION IF EXISTS public.auditoria_ativar(text);
DROP FUNCTION IF EXISTS public.auditoria_purgar(int);
DROP FUNCTION IF EXISTS public.auditoria_acesso_global();
DROP FUNCTION IF EXISTS public.auditoria_meus_grupos();
DROP FUNCTION IF EXISTS public.auditoria_minhas_empresas();
DROP FUNCTION IF EXISTS public.auditoria_pode_ler();

COMMIT;

-- Só se quiser apagar também o rasto registado (IRREVERSÍVEL):
-- DROP TABLE IF EXISTS public.auditoria, public.auditoria_leitores, public.auditoria_excluidas;
-- DROP FUNCTION IF EXISTS public.auditoria_imutavel();
