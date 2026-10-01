-- ── 5. Criar um quadro a partir de um modelo ────────────────────────────────
CREATE OR REPLACE FUNCTION public.quadro_criar_de_modelo(
  p_empresa_id UUID, p_modelo TEXT, p_nome TEXT
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quadro UUID;
  v_tipo   TEXT;
BEGIN
  IF NOT user_has_empresa_access(p_empresa_id) THEN
    RAISE EXCEPTION 'Sem acesso a esta empresa.';
  END IF;
  SELECT tipo INTO v_tipo FROM quadro_modelos WHERE codigo = p_modelo;
  IF v_tipo IS NULL THEN RAISE EXCEPTION 'Modelo de quadro inexistente: %', p_modelo; END IF;

  INSERT INTO quadros (empresa_id, nome, tipo, modelo_codigo)
  VALUES (p_empresa_id, p_nome, v_tipo, p_modelo)
  RETURNING id INTO v_quadro;

  INSERT INTO quadro_listas
    (quadro_id, empresa_id, nome, posicao, estado_codigo, campos_obrigatorios, final, bloqueada, cor)
  SELECT v_quadro, p_empresa_id, ml.nome, ml.posicao, ml.estado_codigo,
         ml.campos_obrigatorios, ml.final, ml.bloqueada, ml.cor
  FROM quadro_modelo_listas ml
  WHERE ml.modelo_codigo = p_modelo
  ORDER BY ml.posicao;

  RETURN v_quadro;
END $$;

-- ── 6. Validação: o cartão tem o que a coluna exige? ────────────────────────
-- Devolve os campos em falta. Vazio = pode avançar.
-- A UI chama isto ANTES de mover, para explicar em vez de recusar em silêncio.
CREATE OR REPLACE FUNCTION public.quadro_campos_em_falta(
  p_cartao_id UUID, p_lista_destino UUID
) RETURNS TEXT[]
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req   JSONB;
  v_card  RECORD;
  v_falta TEXT[] := '{}';
  v_campo TEXT;
BEGIN
  SELECT campos_obrigatorios INTO v_req FROM quadro_listas WHERE id = p_lista_destino;
  IF v_req IS NULL OR jsonb_array_length(v_req) = 0 THEN RETURN v_falta; END IF;

  SELECT * INTO v_card FROM quadro_cartoes WHERE id = p_cartao_id;
  IF v_card IS NULL THEN RETURN ARRAY['cartao_inexistente']; END IF;

  FOR v_campo IN SELECT jsonb_array_elements_text(v_req) LOOP
    IF (v_campo = 'cliente_id'     AND v_card.cliente_id     IS NULL)
    OR (v_campo = 'supplier_id'    AND v_card.supplier_id    IS NULL)
    OR (v_campo = 'responsavel_id' AND v_card.responsavel_id IS NULL)
    OR (v_campo = 'contacto_email' AND COALESCE(v_card.contacto_email,'') = '')
    OR (v_campo = 'valor'          AND v_card.valor          IS NULL)
    OR (v_campo = 'data_limite'    AND v_card.data_limite    IS NULL)
    OR (v_campo = 'descricao'      AND COALESCE(v_card.descricao,'') = '')
    THEN
      v_falta := array_append(v_falta, v_campo);
    END IF;
  END LOOP;
  RETURN v_falta;
END $$;

