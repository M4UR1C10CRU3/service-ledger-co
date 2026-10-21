-- DIAGNÓSTICO A — checklist do Ricardo Pessoa — SÓ LEITURA (nada é alterado). 21/10/2026
-- Correr no SQL Editor (Supabase) e copiar o resultado (botão «Copy» > CSV ou Markdown).
-- Horas em hora de Lisboa.
WITH rp AS (
  SELECT id, auth_user_id, nome, perfil, ativo, ultimo_acesso
  FROM public.liberty_utilizadores WHERE nome ILIKE '%Ricardo%Pessoa%'
), alvo AS (   -- cartões do José Carvas com o item «Validação da proposta de fecho do serviço»
  SELECT DISTINCT c.id, c.titulo, c.empresa_id, c.arquivado, c.lista_id
  FROM public.quadro_cartoes c
  JOIN public.cartao_checklists cl ON cl.cartao_id = c.id
  JOIN public.cartao_checklist_items i ON i.checklist_id = cl.id
  WHERE i.texto ILIKE '%proposta de fecho do servi%' AND c.titulo ILIKE '%Carvas%'
), itens AS (  -- todos os itens em cartões ativos, com «ficou para trás» = por marcar com outro marcado depois
  SELECT i.*, c.arquivado,
         (NOT i.concluido AND EXISTS (SELECT 1 FROM public.cartao_checklist_items j
            WHERE j.checklist_id = i.checklist_id AND j.posicao > i.posicao AND j.concluido)) AS para_tras
  FROM public.cartao_checklist_items i
  JOIN public.cartao_checklists cl ON cl.id = i.checklist_id
  JOIN public.quadro_cartoes c ON c.id = cl.cartao_id
  WHERE NOT c.arquivado
)
SELECT * FROM (
  SELECT '01 Ricardo' AS secao, (ultimo_acesso AT TIME ZONE 'Europe/Lisbon') AS quando,
         format('%s | perfil=%s | ativo=%s | auth=%s', nome, perfil, ativo, auth_user_id) AS detalhe
  FROM rp
  UNION ALL
  SELECT '02 Empresas do Ricardo', NULL, e.nome
  FROM rp JOIN public.liberty_utilizador_empresas lue ON lue.utilizador_id = rp.id
  JOIN public.empresas e ON e.id = lue.empresa_id
  UNION ALL
  SELECT '03 Cartão', NULL, format('%s | %s | empresa=%s | arquivado=%s | coluna=%s | Ricardo tem acesso à empresa: %s',
         left(a.id::text, 8), a.titulo, e.nome, a.arquivado, l.nome,
         EXISTS (SELECT 1 FROM rp JOIN public.liberty_utilizador_empresas lue ON lue.utilizador_id = rp.id
                 WHERE lue.empresa_id = a.empresa_id))
  FROM alvo a JOIN public.empresas e ON e.id = a.empresa_id JOIN public.quadro_listas l ON l.id = a.lista_id
  UNION ALL
  SELECT '04 Item (criado em)', (i.criado_em AT TIME ZONE 'Europe/Lisbon'),
         format('%s | #%s | %s | %s | resp=%s | hora=%s data=%s', left(cl.cartao_id::text, 8), i.posicao,
                CASE WHEN i.concluido THEN '[x]' ELSE '[ ]' END, i.texto, i.responsavel_nome, i.hora, i.data_limite)
  FROM alvo a JOIN public.cartao_checklists cl ON cl.cartao_id = a.id
  JOIN public.cartao_checklist_items i ON i.checklist_id = cl.id
  UNION ALL
  SELECT '05 Feed do cartão', (m.criado_em AT TIME ZONE 'Europe/Lisbon'),
         format('%s | %s | %s | editado=%s | %s', left(m.cartao_id::text, 8), m.tipo, m.autor_nome,
                to_char(m.atualizado_em AT TIME ZONE 'Europe/Lisbon', 'DD/MM HH24:MI'), left(replace(m.texto, E'\n', ' '), 110))
  FROM alvo a JOIN public.cartao_comentarios m ON m.cartao_id = a.id
  WHERE m.criado_em >= '2026-09-25'
  UNION ALL
  SELECT '06 Política', NULL, format('%s | %s | %s | %s | roles=%s | USING=%s', tablename, policyname, permissive, cmd, roles, left(regexp_replace(qual, '\s+', ' ', 'g'), 220))
  FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('cartao_checklist_items', 'cartao_checklists', 'quadro_cartoes')
  UNION ALL
  SELECT '07 Gatilho', NULL, format('%s | %s', tgname, left(pg_get_triggerdef(t.oid), 160))
  FROM pg_trigger t WHERE tgrelid = 'public.cartao_checklist_items'::regclass AND NOT tgisinternal
  UNION ALL
  SELECT '07 Privilégio', NULL, format('authenticated pode UPDATE em cartao_checklist_items: %s',
         has_table_privilege('authenticated', 'public.cartao_checklist_items', 'UPDATE'))
  UNION ALL
  SELECT '08 Padrão por responsável', NULL,
         format('%s | itens=%s | marcados=%s | por marcar=%s | ficaram para trás=%s', coalesce(responsavel_nome, '(sem responsável)'),
                count(*), count(*) FILTER (WHERE concluido), count(*) FILTER (WHERE NOT concluido), count(*) FILTER (WHERE para_tras))
  FROM itens GROUP BY responsavel_nome
  UNION ALL
  SELECT '09 Sessões do Ricardo', (s.created_at AT TIME ZONE 'Europe/Lisbon'),
         format('atualizada=%s | %s', to_char(s.updated_at AT TIME ZONE 'Europe/Lisbon', 'DD/MM HH24:MI'), left(to_jsonb(s) ->> 'user_agent', 110))
  FROM rp JOIN auth.sessions s ON s.user_id = rp.auth_user_id
  UNION ALL
  SELECT '10 Autenticação do Ricardo (outubro)', date_trunc('day', a.created_at AT TIME ZONE 'Europe/Lisbon'),
         format('%s x %s', a.payload ->> 'action', count(*))
  FROM rp JOIN auth.audit_log_entries a ON a.payload ->> 'actor_id' = rp.auth_user_id::text
  WHERE a.created_at >= '2026-10-01'
  GROUP BY 2, a.payload ->> 'action'
  UNION ALL
  SELECT '11 Autenticação do Ricardo 08/10', (a.created_at AT TIME ZONE 'Europe/Lisbon'), a.payload ->> 'action'
  FROM rp JOIN auth.audit_log_entries a ON a.payload ->> 'actor_id' = rp.auth_user_id::text
  WHERE a.created_at >= '2026-10-08 07:00+00' AND a.created_at < '2026-10-08 14:00+00'
) r
ORDER BY secao, quando NULLS FIRST, detalhe;
