-- Agência Demo — bloco 3 de 3: projetos e jobs.
-- Os jobs ficam espalhados por várias etapas de propósito: um kanban com tudo
-- numa coluna não mostra nada a quem está a avaliar a plataforma.
DO $$
DECLARE
  v_empresa UUID;
  v_ano     INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
  v_c2 UUID; v_c3 UUID;
  v_p1 UUID; v_p2 UUID;
  e_brief UUID; e_pesq UUID; e_cria UUID; e_rev UUID; e_apro UUID; e_conc UUID;
BEGIN
  SELECT id INTO v_empresa FROM empresas WHERE slug = 'demo-agencia';
  IF v_empresa IS NULL THEN RAISE EXCEPTION 'Corra primeiro o bloco 1.'; END IF;
  IF EXISTS (SELECT 1 FROM ag_projetos WHERE empresa_id = v_empresa) THEN
    RAISE NOTICE 'Já existem projetos. Nada a fazer.';
    RETURN;
  END IF;

  SELECT id INTO v_c2 FROM clientes WHERE nome = 'Clínica Dentária Sorriso';
  SELECT id INTO v_c3 FROM clientes WHERE nome = 'Ginásio Pulso';

  SELECT id INTO e_brief FROM ag_job_etapas WHERE empresa_id=v_empresa AND estado_codigo='briefing';
  SELECT id INTO e_pesq  FROM ag_job_etapas WHERE empresa_id=v_empresa AND estado_codigo='pesquisa';
  SELECT id INTO e_cria  FROM ag_job_etapas WHERE empresa_id=v_empresa AND estado_codigo='criacao';
  SELECT id INTO e_rev   FROM ag_job_etapas WHERE empresa_id=v_empresa AND estado_codigo='revisao';
  SELECT id INTO e_apro  FROM ag_job_etapas WHERE empresa_id=v_empresa AND estado_codigo='aprovacao';
  SELECT id INTO e_conc  FROM ag_job_etapas WHERE empresa_id=v_empresa AND estado_codigo='concluido';

  INSERT INTO ag_projetos (empresa_id, numero, ano, nome, cliente_id, cliente_nome,
                           estado, descricao, prazo_desejado, budget, horas_previstas) VALUES
    (v_empresa, 1, v_ano, 'Reposicionamento de marca', v_c2, 'Clínica Dentária Sorriso',
     'ativo', 'Nova identidade visual e campanha de captação de pacientes.',
     CURRENT_DATE + 45, 12500.00, 160),
    (v_empresa, 2, v_ano, 'Campanha de verão', v_c3, 'Ginásio Pulso',
     'ativo', 'Campanha de angariação para a época alta, com vídeo e redes sociais.',
     CURRENT_DATE + 20, 6800.00, 90);

  SELECT id INTO v_p1 FROM ag_projetos WHERE empresa_id=v_empresa AND numero=1 AND ano=v_ano;
  SELECT id INTO v_p2 FROM ag_projetos WHERE empresa_id=v_empresa AND numero=2 AND ano=v_ano;

  INSERT INTO ag_jobs (empresa_id, projeto_id, sequencial, titulo, descricao, etapa_id,
                       prazo, horas_previstas, concluido) VALUES
    (v_empresa, v_p1, 1, 'Logótipo e manual de marca',    'Três propostas com manual de aplicação.', e_apro, CURRENT_DATE+10, 40, FALSE),
    (v_empresa, v_p1, 2, 'Estacionário e sinalética',     'Cartões, receituário e placa.',           e_cria, CURRENT_DATE+25, 24, FALSE),
    (v_empresa, v_p1, 3, 'Sessão fotográfica na clínica', 'Fotografia de equipa e instalações.',     e_pesq, CURRENT_DATE+30, 12, FALSE),
    (v_empresa, v_p1, 4, 'Plano de redes sociais',        'Calendário editorial para três meses.',   e_brief, NULL,           16, FALSE),
    (v_empresa, v_p2, 1, 'Vídeo promocional 30s',         'Guião, filmagem e montagem.',             e_cria, CURRENT_DATE+12, 30, FALSE),
    (v_empresa, v_p2, 2, 'Cartazes para o espaço',        'Seis cartazes A2 para o interior.',       e_rev,  CURRENT_DATE+8,  10, FALSE),
    (v_empresa, v_p2, 3, 'Anúncios para redes',           'Seis peças estáticas e duas animadas.',   e_conc, CURRENT_DATE-3,  14, TRUE);

  -- Sem isto, o primeiro projeto que o visitante criar colide com estes.
  INSERT INTO ag_sequencias (empresa_id, escopo, ano, ultimo) VALUES
    (v_empresa, 'projeto', v_ano, 2),
    (v_empresa, 'job:' || v_p1::text, v_ano, 4),
    (v_empresa, 'job:' || v_p2::text, v_ano, 3)
  ON CONFLICT (empresa_id, escopo, ano) DO UPDATE SET ultimo = GREATEST(ag_sequencias.ultimo, EXCLUDED.ultimo);
END $$;

SELECT p.nome AS projeto, p.cliente_nome, count(j.id) AS jobs
FROM ag_projetos p LEFT JOIN ag_jobs j ON j.projeto_id = p.id
WHERE p.empresa_id = (SELECT id FROM empresas WHERE slug = 'demo-agencia')
GROUP BY p.nome, p.cliente_nome ORDER BY p.nome;
