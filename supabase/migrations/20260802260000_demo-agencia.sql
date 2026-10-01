-- ============================================================================
-- Empresa de demonstração do vertical de Agência
-- ----------------------------------------------------------------------------
-- Para mostrar o Clariza Agency a quem está a avaliar a plataforma, sem tocar
-- na Elo Giro real — que é a empresa do Hugo Dias e está prestes a entrar em
-- uso a sério. Encher a empresa dele com clientes inventados obrigava-o a
-- limpar tudo depois, e há sempre o risco de alguém tomar um por verdadeiro.
--
-- Esta empresa é o seu próprio GRUPO: não partilha dados-mestre com ninguém.
-- Pode ser reposta à vontade e serve o próximo interessado sem preparar nada.
--
-- Tudo o que está aqui é FICTÍCIO. Nomes, NIFs e valores são inventados e não
-- correspondem a pessoas ou empresas reais.
-- ============================================================================

DO $$
DECLARE
  v_grupo   UUID;
  v_empresa UUID;
  v_ano     INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
  v_c1 UUID; v_c2 UUID; v_c3 UUID; v_c4 UUID;
  v_p1 UUID; v_p2 UUID;
  v_e_brief UUID; v_e_pesq UUID; v_e_criacao UUID; v_e_rev UUID; v_e_aprov UUID; v_e_conc UUID;
BEGIN
  -- ── Grupo e empresa ───────────────────────────────────────────────────────
  INSERT INTO empresa_grupos (nome) VALUES ('Demonstração')
  ON CONFLICT (nome) DO NOTHING;
  SELECT id INTO v_grupo FROM empresa_grupos WHERE nome = 'Demonstração';

  INSERT INTO empresas (slug, nome, nome_legal, cor_primaria, cor_secundaria, cor_accent, grupo_id)
  VALUES ('demo-agencia', 'Agência Demo', 'Agência Demo — Demonstração Clariza',
          '#7c3aed', '#5b21b6', '#a78bfa', v_grupo)
  ON CONFLICT (slug) DO UPDATE SET grupo_id = EXCLUDED.grupo_id;
  SELECT id INTO v_empresa FROM empresas WHERE slug = 'demo-agencia';

  -- Vertical de agência ligado, em português de Portugal.
  INSERT INTO ag_empresas_vertical (empresa_id, pais)
  VALUES (v_empresa, 'PT')
  ON CONFLICT (empresa_id) DO NOTHING;

  -- Assinatura em demonstração: expira, ao contrário das internas.
  INSERT INTO assinaturas (grupo_id, plano_codigo, estado, demo_fim, cobrador)
  VALUES (v_grupo, 'business', 'demonstracao', now() + interval '90 days', 'manual')
  ON CONFLICT (grupo_id) DO NOTHING;

  -- ── Clientes fictícios ────────────────────────────────────────────────────
  INSERT INTO clientes (nome, email, telefone, nif, morada_concelho, grupo_id) VALUES
    ('Padaria Nova Estrela',    'geral@novaestrela.example',  '210 000 111', '500111222', 'Cascais',  v_grupo),
    ('Clínica Dentária Sorriso','marketing@sorriso.example',  '210 000 222', '500333444', 'Lisboa',   v_grupo),
    ('Ginásio Pulso',           'direcao@pulso.example',      '210 000 333', '500555666', 'Almada',   v_grupo),
    ('Móveis Carvalho & Filhos','comercial@carvalho.example', '210 000 444', '500777888', 'Braga',    v_grupo);

  SELECT id INTO v_c1 FROM clientes WHERE nome = 'Padaria Nova Estrela'     AND grupo_id = v_grupo;
  SELECT id INTO v_c2 FROM clientes WHERE nome = 'Clínica Dentária Sorriso' AND grupo_id = v_grupo;
  SELECT id INTO v_c3 FROM clientes WHERE nome = 'Ginásio Pulso'            AND grupo_id = v_grupo;
  SELECT id INTO v_c4 FROM clientes WHERE nome = 'Móveis Carvalho & Filhos' AND grupo_id = v_grupo;

  -- ── Etapas do kanban de jobs ──────────────────────────────────────────────
  INSERT INTO ag_job_etapas (empresa_id, nome, cor, ordem, final, estado_codigo, campos_obrigatorios) VALUES
    (v_empresa, 'Briefing',  '#94a3b8', 0, FALSE, 'briefing',  '[]'::jsonb),
    (v_empresa, 'Pesquisa',  '#6366f1', 1, FALSE, 'pesquisa',  '["responsavel_id"]'::jsonb),
    (v_empresa, 'Criação',   '#f59e0b', 2, FALSE, 'criacao',   '["responsavel_id","prazo"]'::jsonb),
    (v_empresa, 'Revisão',   '#06b6d4', 3, FALSE, 'revisao',   '[]'::jsonb),
    (v_empresa, 'Aprovação', '#a855f7', 4, FALSE, 'aprovacao', '[]'::jsonb),
    (v_empresa, 'Concluído', '#22c55e', 5, TRUE,  'concluido', '[]'::jsonb);

  SELECT id INTO v_e_brief   FROM ag_job_etapas WHERE empresa_id = v_empresa AND estado_codigo = 'briefing';
  SELECT id INTO v_e_pesq    FROM ag_job_etapas WHERE empresa_id = v_empresa AND estado_codigo = 'pesquisa';
  SELECT id INTO v_e_criacao FROM ag_job_etapas WHERE empresa_id = v_empresa AND estado_codigo = 'criacao';
  SELECT id INTO v_e_rev     FROM ag_job_etapas WHERE empresa_id = v_empresa AND estado_codigo = 'revisao';
  SELECT id INTO v_e_aprov   FROM ag_job_etapas WHERE empresa_id = v_empresa AND estado_codigo = 'aprovacao';
  SELECT id INTO v_e_conc    FROM ag_job_etapas WHERE empresa_id = v_empresa AND estado_codigo = 'concluido';

  -- ── Projetos ──────────────────────────────────────────────────────────────
  INSERT INTO ag_projetos (empresa_id, numero, ano, nome, cliente_id, cliente_nome,
                           estado, descricao, prazo_desejado, budget, horas_previstas)
  VALUES
    (v_empresa, 1, v_ano, 'Reposicionamento de marca', v_c2, 'Clínica Dentária Sorriso',
     'ativo', 'Nova identidade visual e campanha de captação de pacientes.',
     CURRENT_DATE + 45, 12500.00, 160),
    (v_empresa, 2, v_ano, 'Campanha de verão', v_c3, 'Ginásio Pulso',
     'ativo', 'Campanha de angariação para a época alta, com vídeo e redes sociais.',
     CURRENT_DATE + 20, 6800.00, 90);

  SELECT id INTO v_p1 FROM ag_projetos WHERE empresa_id = v_empresa AND numero = 1 AND ano = v_ano;
  SELECT id INTO v_p2 FROM ag_projetos WHERE empresa_id = v_empresa AND numero = 2 AND ano = v_ano;

  -- O contador de projetos tem de saber que já vão dois, senão o próximo
  -- projeto criado na demonstração rebenta com a numeração.
  INSERT INTO ag_sequencias (empresa_id, escopo, ano, ultimo)
  VALUES (v_empresa, 'projeto', v_ano, 2)
  ON CONFLICT (empresa_id, escopo, ano) DO UPDATE SET ultimo = GREATEST(ag_sequencias.ultimo, 2);

  -- ── Jobs espalhados pelas etapas, para o kanban contar uma história ───────
  INSERT INTO ag_jobs (empresa_id, projeto_id, sequencial, titulo, descricao, etapa_id,
                       prazo, horas_previstas, concluido) VALUES
    (v_empresa, v_p1, 1, 'Logótipo e manual de marca',   'Três propostas de logótipo com manual de aplicação.', v_e_aprov,  CURRENT_DATE + 10, 40, FALSE),
    (v_empresa, v_p1, 2, 'Estacionário e sinalética',    'Cartões, receituário e placa de fachada.',            v_e_criacao, CURRENT_DATE + 25, 24, FALSE),
    (v_empresa, v_p1, 3, 'Sessão fotográfica na clínica','Fotografia de equipa e instalações.',                 v_e_pesq,    CURRENT_DATE + 30, 12, FALSE),
    (v_empresa, v_p1, 4, 'Plano de redes sociais',       'Calendário editorial para três meses.',               v_e_brief,   NULL,              16, FALSE),
    (v_empresa, v_p2, 1, 'Vídeo promocional 30s',        'Guião, filmagem e montagem.',                         v_e_criacao, CURRENT_DATE + 12, 30, FALSE),
    (v_empresa, v_p2, 2, 'Cartazes para o espaço',       'Seis cartazes A2 para o interior.',                   v_e_rev,     CURRENT_DATE + 8,  10, FALSE),
    (v_empresa, v_p2, 3, 'Anúncios para redes',          'Seis peças estáticas e duas animadas.',               v_e_conc,    CURRENT_DATE - 3,  14, TRUE);

  INSERT INTO ag_sequencias (empresa_id, escopo, ano, ultimo)
  VALUES (v_empresa, 'job:' || v_p1::text, v_ano, 4),
         (v_empresa, 'job:' || v_p2::text, v_ano, 3)
  ON CONFLICT (empresa_id, escopo, ano) DO NOTHING;

  RAISE NOTICE 'Demonstração criada. empresa_id = %', v_empresa;
END $$;
