-- CLARIZA LABS · Área de cliente — PARTE 2 de 3: o que o cliente vê
-- Pressupõe a parte 1. Devolve só campos escolhidos a dedo (nunca custos, notas internas nem acessos).

CREATE OR REPLACE FUNCTION public.lb_portal_dados(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  a public.lb_portal_acessos;
  r JSONB;
BEGIN
  a := public.lb_portal_acesso(p_token);
  IF a.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Este link não é válido ou expirou. Peça um novo à Webtech Labs.');
  END IF;
  UPDATE public.lb_portal_acessos SET ultimo_acesso_em = now() WHERE id = a.id;

  SELECT jsonb_build_object(
    'ok', true,
    'cliente', (SELECT c.nome FROM public.clientes c WHERE c.id = a.cliente_id),
    'empresa', (SELECT e.nome FROM public.empresas e WHERE e.id = a.empresa_id),
    'assistencias', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', s.id, 'os', o.numero, 'fase', s.fase,
        'equipamento', concat_ws(' ', s.marca, s.modelo), 'tipo', s.equipamento_tipo,
        'avaria', s.avaria_relatada, 'diagnostico', CASE WHEN s.fase <> 'rececao' THEN s.diagnostico END,
        'orcamento', s.orcamento_valor, 'entrada', s.criado_em, 'entregue', s.entregue_em,
        'garantia_ate', s.garantia_ate) ORDER BY s.criado_em DESC)
      FROM public.lb_assistencias s JOIN public.ordens_servico o ON o.id = s.os_id
      WHERE s.empresa_id = a.empresa_id AND o.cliente_id = a.cliente_id
        AND (s.entregue_em IS NULL OR s.entregue_em > now() - INTERVAL '365 days')), '[]'::jsonb),
    'projetos', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'nome', p.nome, 'estado', p.estado, 'prazo', p.prazo_estimado,
        'fases', (SELECT count(*) FROM public.ag_jobs j WHERE j.projeto_id = p.id),
        'feitas', (SELECT count(*) FROM public.ag_jobs j WHERE j.projeto_id = p.id AND j.concluido)) ORDER BY p.criado_em DESC)
      FROM public.ag_projetos p
      WHERE p.empresa_id = a.empresa_id AND p.cliente_id = a.cliente_id AND NOT p.arquivado AND p.estado <> 'cancelado'), '[]'::jsonb),
    'renovacoes', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'nome', t.nome, 'tipo', t.tipo, 'renovacao', t.renovacao, 'automatica', t.renovacao_automatica,
        'preco', t.preco_cliente, 'moeda', t.moeda) ORDER BY t.renovacao NULLS LAST)
      FROM public.lb_ativos t
      WHERE t.empresa_id = a.empresa_id AND t.cliente_id = a.cliente_id AND t.estado = 'ativo'), '[]'::jsonb),
    'growth', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'mes', g.mes, 'plataforma', ca.plataforma, 'conta', ca.nome, 'investimento', g.investimento,
        'leads', g.leads, 'conversoes', g.conversoes, 'receita', g.receita, 'moeda', ca.moeda) ORDER BY g.mes DESC, ca.nome)
      FROM public.lb_growth_resultados g JOIN public.lb_contas_anuncios ca ON ca.id = g.conta_id
      WHERE g.empresa_id = a.empresa_id AND ca.cliente_id = a.cliente_id
        AND g.mes >= date_trunc('month', now()) - INTERVAL '6 months'), '[]'::jsonb),
    'suporte', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'numero', ps.numero || '/' || ps.ano, 'titulo', ps.titulo, 'estado', ps.estado,
        'aberto', ps.aberto_em, 'resolvido', ps.resolvido_em) ORDER BY ps.aberto_em DESC)
      FROM public.lb_pedidos_suporte ps
      WHERE ps.empresa_id = a.empresa_id AND ps.cliente_id = a.cliente_id
        AND ps.aberto_em > now() - INTERVAL '180 days'), '[]'::jsonb)
  ) INTO r;
  RETURN r;
END $$;

REVOKE ALL ON FUNCTION public.lb_portal_dados(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lb_portal_dados(TEXT) TO anon, authenticated;
