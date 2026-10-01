-- QUADROS DA RESISERV (01/10/2026) — mesma estrutura da Tudo Casa Warm e da Obrajusta II.
-- Copia, dos quadros originais, as COLUNAS (pela ordem real) e as ETIQUETAS de cada quadro.
-- Só CRIA: não altera nem apaga nada. Se um quadro com o mesmo nome já existir na Resiserv, salta-o.
-- As checklists-modelo de cada etapa já são partilhadas por todas as empresas do grupo (não há nada a copiar).
-- Para usar noutra empresa do grupo, basta trocar o slug na linha v_slug.
DO $$
DECLARE
  v_slug  text := 'resiserv';
  v_emp   uuid;
  v_q     uuid;
  r       record;
  -- Quadros de origem: Tudo Casa Warm (TC) e Obrajusta II (OJ)
  tc_com  uuid := '558d2b7d-7b4f-4864-b4e3-20a1d15cddaf';  oj_com  uuid := '3d48729c-9ca9-4774-84d4-9b3e2f2a70c4';
  tc_cmp  uuid := '3b5218a3-dff1-469b-a00a-86f0d0497f88';  oj_cmp  uuid := '178a0740-7f15-46f5-ac46-8f7100b70859';
  tc_prd  uuid := '53251a9c-f179-45dc-b495-cd1e15d5910f';  oj_prd  uuid := '5a15374d-c11d-438e-90bd-625c142cd35a';
  oj_fin  uuid := 'c8b84f15-d944-46ff-80ee-cc7bddcc8826';
  tc_adm  uuid := '89f09401-1531-4736-a946-2f893f4e77be';  oj_adm  uuid := 'f20e8fd5-bb2f-4bc9-804e-0096cd86d1fe';
BEGIN
  SELECT id INTO v_emp FROM empresas WHERE slug = v_slug;
  IF v_emp IS NULL THEN RAISE EXCEPTION 'Empresa % não encontrada', v_slug; END IF;

  FOR r IN SELECT * FROM (VALUES
    ('Comercial — Pipeline', '#3b82f6',
      ARRAY['PO Recebido','Em Análise','Proposta em Elaboração','Proposta Enviada','Em Negociação',
            'Follow-up, em espera','Adjudicado','Perdido'],
      ARRAY[tc_com, oj_com]),
    ('Compras — Pipeline', '#f59e0b',
      ARRAY['Necessidade Identificada','Em Cotação','Aguarda Aprovação','Encomendado / Pago','Em Trânsito',
            'Recebido / Conferido','Finalizado','Aguardar pagamento','Reclamações','Notas de Crédito'],
      ARRAY[tc_cmp, oj_cmp]),
    ('Produção — Ordens de Serviço', '#8b5cf6',
      ARRAY['Planeado','Em curso','Receção Final','Concluído','Entregue / Faturado','Em Débito'],
      ARRAY[tc_prd, oj_prd]),
    ('Financeiro — Faturação & Recebimentos', '#10b981',
      ARRAY['A Faturar','Faturado','Recebido','Em Atraso'],
      ARRAY[oj_fin]),
    ('Administrativo — Planeamento', '#6366f1',
      ARRAY['Ideia','Em Levantamento','Em Pesquisa','Em Consulta Externa','Em Validação','Aprovado','Concluído'],
      ARRAY[tc_adm, oj_adm])
  ) AS t(nome, cor, colunas, origens)
  LOOP
    IF EXISTS (SELECT 1 FROM quadros WHERE empresa_id = v_emp AND nome = r.nome) THEN
      RAISE NOTICE 'Já existe, não mexi: %', r.nome;
      CONTINUE;
    END IF;

    INSERT INTO quadros (empresa_id, nome, cor) VALUES (v_emp, r.nome, r.cor) RETURNING id INTO v_q;

    -- Colunas pela ordem do processo. «Adjudicado» fica marcada como ganho e «Perdido» como perdido:
    -- é isso que faz a aplicação propor a passagem do cartão para a Produção.
    INSERT INTO quadro_listas (quadro_id, empresa_id, nome, posicao, resultado)
    SELECT v_q, v_emp, c.nome, (c.ord - 1)::int,
           CASE c.nome WHEN 'Adjudicado' THEN 'ganho' WHEN 'Perdido' THEN 'perdido' END
    FROM unnest(r.colunas) WITH ORDINALITY AS c(nome, ord);

    -- Etiquetas dos quadros de origem (sem repetidas e sem as que não têm nome).
    INSERT INTO cartao_etiquetas (quadro_id, nome, cor)
    SELECT v_q, e.nome, min(e.cor)
    FROM cartao_etiquetas e
    WHERE e.quadro_id = ANY (r.origens) AND trim(e.nome) <> ''
    GROUP BY e.nome;

    RAISE NOTICE 'Criado: %', r.nome;
  END LOOP;
END $$;

-- Conferência: os quadros da Resiserv com o número de colunas e de etiquetas.
SELECT q.nome AS quadro,
       (SELECT count(*) FROM quadro_listas l WHERE l.quadro_id = q.id) AS colunas,
       (SELECT string_agg(l.nome, ' → ' ORDER BY l.posicao) FROM quadro_listas l WHERE l.quadro_id = q.id) AS etapas,
       (SELECT count(*) FROM cartao_etiquetas e WHERE e.quadro_id = q.id) AS etiquetas
FROM quadros q
JOIN empresas emp ON emp.id = q.empresa_id
WHERE emp.slug = 'resiserv' AND NOT q.arquivado
ORDER BY q.nome;
