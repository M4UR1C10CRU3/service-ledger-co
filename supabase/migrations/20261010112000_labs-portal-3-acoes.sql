-- CLARIZA LABS · Área de cliente — PARTE 3 de 3: o que o cliente pode fazer
-- Pressupõe as partes 1 e 2. Cada função só age nos registos do cliente do token.

-- Aprovar ou recusar um orçamento de assistência (só se estiver à espera de resposta).
CREATE OR REPLACE FUNCTION public.lb_portal_decidir_orcamento(p_token TEXT, p_assistencia UUID, p_aprovar BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  a public.lb_portal_acessos;
  s public.lb_assistencias;
BEGIN
  a := public.lb_portal_acesso(p_token);
  IF a.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'erro', 'Link inválido ou expirado.'); END IF;

  SELECT s2.* INTO s FROM public.lb_assistencias s2 JOIN public.ordens_servico o ON o.id = s2.os_id
  WHERE s2.id = p_assistencia AND s2.empresa_id = a.empresa_id AND o.cliente_id = a.cliente_id;
  IF s.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'erro', 'Assistência não encontrada.'); END IF;
  IF s.fase <> 'orcamento' THEN RETURN jsonb_build_object('ok', false, 'erro', 'Este orçamento já não está à espera de resposta.'); END IF;

  UPDATE public.lb_assistencias
     SET fase = CASE WHEN p_aprovar THEN 'aprovado' ELSE 'recusado' END,
         decisao_em = now(), decisao_canal = 'área de cliente', atualizado_em = now()
   WHERE id = s.id;
  UPDATE public.ordens_servico SET estado = CASE WHEN p_aprovar THEN 'aprovada' ELSE 'cancelada' END WHERE id = s.os_id;
  RETURN jsonb_build_object('ok', true);
END $$;

-- Abrir um pedido de suporte (numerado pelo mesmo contador da app, escopo «suporte»).
CREATE OR REPLACE FUNCTION public.lb_portal_pedir_suporte(p_token TEXT, p_titulo TEXT, p_descricao TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  a public.lb_portal_acessos;
  v_ano INTEGER := EXTRACT(YEAR FROM now());
  v_num INTEGER;
  v_contrato UUID;
BEGIN
  a := public.lb_portal_acesso(p_token);
  IF a.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'erro', 'Link inválido ou expirado.'); END IF;
  IF coalesce(trim(p_titulo), '') = '' THEN RETURN jsonb_build_object('ok', false, 'erro', 'Diga-nos o que se passa.'); END IF;

  INSERT INTO public.ag_sequencias (empresa_id, escopo, ano, ultimo) VALUES (a.empresa_id, 'suporte', v_ano, 1)
  ON CONFLICT (empresa_id, escopo, ano) DO UPDATE SET ultimo = public.ag_sequencias.ultimo + 1
  RETURNING ultimo INTO v_num;

  SELECT c.id INTO v_contrato FROM public.lb_contratos_sla c
  WHERE c.empresa_id = a.empresa_id AND c.cliente_id = a.cliente_id AND c.ativo
  ORDER BY c.criado_em DESC LIMIT 1;

  INSERT INTO public.lb_pedidos_suporte (empresa_id, numero, ano, cliente_id, cliente_nome, contrato_id, titulo, descricao, canal)
  VALUES (a.empresa_id, v_num, v_ano, a.cliente_id, a.cliente_nome, v_contrato,
          left(trim(p_titulo), 200), left(p_descricao, 4000), 'site');
  RETURN jsonb_build_object('ok', true, 'numero', v_num || '/' || v_ano);
END $$;

REVOKE ALL ON FUNCTION public.lb_portal_decidir_orcamento(TEXT, UUID, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lb_portal_pedir_suporte(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lb_portal_decidir_orcamento(TEXT, UUID, BOOLEAN) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lb_portal_pedir_suporte(TEXT, TEXT, TEXT) TO anon, authenticated;

-- Verificação: devem aparecer as 4 funções lb_portal_*
SELECT proname FROM pg_proc WHERE proname LIKE 'lb_portal_%' ORDER BY 1;
