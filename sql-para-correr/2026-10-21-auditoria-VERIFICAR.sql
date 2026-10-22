-- VERIFICAR a auditoria total — SÓ LEITURA. 21/10/2026
-- Correr depois das partes 1 a 7. Esperado: linha 2 = 0; linhas 4, 5, 6 e 7 = OK; linha 8 = «2 de 2»;
-- linha 10 = «N de N» (todo o registo antigo trazido para a auditoria).
-- Depois fazer uma alteração na app (ex.: marcar uma tarefa da checklist) e correr outra vez:
-- aparece no fim da lista, com o seu nome e a hora.
WITH falta AS (   -- se aparecer alguma: o nome e o dono (gatilho só se cria em tabelas do «postgres»)
  SELECT count(*) AS n, string_agg(c.relname || ' (dono ' || pg_get_userbyid(c.relowner) || ')', ', ' ORDER BY c.relname) AS l
    FROM pg_class c JOIN pg_namespace s ON s.oid = c.relnamespace
   WHERE s.nspname = 'public' AND c.relkind IN ('r', 'p') AND c.relname <> 'auditoria'
     AND c.relname NOT IN (SELECT tabela FROM public.auditoria_excluidas)
     AND NOT EXISTS (SELECT 1 FROM pg_trigger t WHERE t.tgrelid = c.oid AND t.tgname = 'auditoria_rasto')
), ultimos AS (
  SELECT row_number() OVER (ORDER BY id DESC) AS rn, a.* FROM public.auditoria a ORDER BY id DESC LIMIT 15
)
SELECT 1 AS ordem, 'tabelas com o gatilho' AS verificacao,
       (SELECT count(*) FROM pg_trigger WHERE tgname = 'auditoria_rasto')::text AS resultado
UNION ALL SELECT 2, 'tabelas de negócio SEM gatilho (deve ser 0)', (SELECT n || coalesce(': ' || l, '') FROM falta)
UNION ALL SELECT 3, 'tabelas excluídas de propósito', (SELECT count(*)::text FROM public.auditoria_excluidas)
UNION ALL SELECT 4, 'regra de leitura só para administradores',
  CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'auditoria' AND policyname = 'auditoria_leitura')
       THEN 'OK' ELSE 'FALTA' END
UNION ALL SELECT 5, 'a app não escreve nem apaga a auditoria',
  CASE WHEN has_table_privilege('authenticated', 'public.auditoria', 'INSERT')
         OR has_table_privilege('authenticated', 'public.auditoria', 'UPDATE')
         OR has_table_privilege('authenticated', 'public.auditoria', 'DELETE')
         OR has_table_privilege('anon', 'public.auditoria', 'SELECT') THEN 'FALHA' ELSE 'OK' END
UNION ALL SELECT 6, 'funções internas fechadas à app',
  CASE WHEN has_function_privilege('authenticated', 'public.auditoria_ambito(text,text,jsonb,uuid)', 'EXECUTE')
         OR has_function_privilege('authenticated', 'public.auditoria_purgar(integer)', 'EXECUTE')
         OR has_function_privilege('authenticated', 'public.auditoria_ativar(text)', 'EXECUTE')
       THEN 'FALHA' ELSE 'OK' END
UNION ALL SELECT 7, 'a app regista eventos (exportações)',
  CASE WHEN to_regprocedure('public.auditoria_evento(text,text,text,text,text,uuid,jsonb)') IS NULL THEN 'FALTA a parte 6'
       WHEN has_function_privilege('authenticated', 'public.auditoria_evento(text,text,text,text,text,uuid,jsonb)', 'EXECUTE')
       THEN 'OK' ELSE 'FALHA' END
UNION ALL SELECT 8, 'proteção contra alterar/apagar',
  (SELECT count(*) || ' de 2' FROM pg_trigger WHERE tgrelid = 'public.auditoria'::regclass
      AND tgname IN ('auditoria_imutavel', 'auditoria_sem_truncate'))
UNION ALL SELECT 9, 'registos na auditoria',
  (SELECT count(*) || ' (falhas de registo: ' || count(*) FILTER (WHERE erro IS NOT NULL) || ')' FROM public.auditoria)
UNION ALL SELECT 10, 'registo antigo trazido (liberty_atividades)',
  (SELECT count(*) FROM public.auditoria WHERE operacao = 'EVENTO' AND depois ? 'id_antigo') || ' de '
  || (SELECT count(*) FROM public.liberty_atividades)
UNION ALL SELECT 11, 'quem lê',
  coalesce((SELECT string_agg(u.nome, ', ') FROM public.auditoria_leitores l
            JOIN public.liberty_utilizadores u ON u.id = l.utilizador_id), 'todos os administradores ativos')
UNION ALL SELECT 20 + rn, to_char(quando AT TIME ZONE 'Europe/Lisbon', 'DD/MM HH24:MI:SS') || ' · ' || autor_nome,
  operacao || ' ' || tabela || coalesce(' «' || left(rotulo, 60) || '»', '')
  || coalesce(' [' || array_to_string(campos, ', ') || ']', '') || coalesce(' — ERRO: ' || erro, '')
  FROM ultimos
ORDER BY ordem;
