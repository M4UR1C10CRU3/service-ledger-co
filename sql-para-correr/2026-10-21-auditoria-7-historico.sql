-- AUDITORIA TOTAL — parte 7 de 7: trazer o registo antigo (liberty_atividades) para a auditoria. 21/10/2026
-- Pode correr-se mais vezes sem duplicar (cada linha leva o id antigo). CORRER OUTRA VEZ depois de publicar
-- a versão nova da app em produção: até lá, a versão antiga continua a escrever em liberty_atividades.
-- O nome é o que ficou gravado na altura (numa conta reaproveitada, o da pessoa de então).
-- A tabela liberty_atividades NÃO é apagada (fica como estava; pode retirar-se mais tarde).
BEGIN;

INSERT INTO public.auditoria (quando, auth_uid, autor_nome, papel, empresa_id, grupo_id, ambito, tabela, operacao,
  registo_id, rotulo, contexto, depois)
SELECT a.data_hora, a.utilizador_id,
  -- o registo antigo gravava «Utilizador» quando o perfil faltava: aí, o nome ATUAL da conta (assinalado)
  CASE WHEN coalesce(btrim(a.utilizador_nome), '') IN ('', 'Utilizador')
       THEN coalesce(lu.nome || ' (nome atual da conta)', 'Utilizador') ELSE a.utilizador_nome END,
  'authenticated', a.empresa_id, e.grupo_id, 'empresa',
  CASE
    WHEN a.modulo = 'Clientes' THEN 'clientes'
    WHEN a.modulo = 'Propostas' THEN 'propostas'
    WHEN a.modulo = 'Follow-up' THEN 'followup_oportunidades'
    WHEN a.acao IN ('atualizou_aparencia', 'atualizou_notificacoes') THEN 'liberty_configuracoes_utilizador'
    WHEN a.acao = 'atualizou_dados_empresa' THEN 'liberty_empresas_config'
    WHEN a.acao LIKE '%utilizador%' OR a.acao IN ('atualizou_permissoes', 'repos_senha') THEN 'liberty_utilizadores'
    ELSE 'evento' END,
  'EVENTO', a.entidade_id::text, a.entidade_ref, 'registo antigo da app',
  jsonb_strip_nulls(jsonb_build_object('acao', a.acao, 'descricao', a.descricao, 'modulo_antigo', a.modulo,
    'entidade_tipo', a.entidade_tipo, 'dados', a.metadata, 'id_antigo', a.id))
FROM public.liberty_atividades a
LEFT JOIN public.empresas e ON e.id = a.empresa_id
LEFT JOIN public.liberty_utilizadores lu ON lu.auth_user_id = a.utilizador_id
WHERE a.id::text NOT IN (SELECT x.depois ->> 'id_antigo' FROM public.auditoria x
                          WHERE x.operacao = 'EVENTO' AND x.depois ? 'id_antigo')
ORDER BY a.data_hora;

COMMIT;

SELECT (SELECT count(*) FROM public.liberty_atividades) AS registos_antigos,
       (SELECT count(*) FROM public.auditoria WHERE operacao = 'EVENTO' AND depois ? 'id_antigo') AS ja_na_auditoria;
