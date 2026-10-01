-- =============================================================================
-- Semente: o concurso do Fomento (2.ª publicação) nasce no Quadro «Concursos
-- Públicos» da Obrajusta II, com o mapa de 61 artigos (29 já com o preço da
-- proposta de outubro) e a checklist dos 11 documentos do art. 9.º.
-- Resolve tudo por nome — não há IDs à mão. Pode correr-se mais do que uma vez.
-- =============================================================================
do $$
declare
  v_empresa  uuid;
  v_quadro   uuid;
  v_lista    uuid;
  v_cartao   uuid;
  v_conc     uuid;
  v_pos      integer;
begin
  select id into v_empresa from public.empresas where nome ilike 'Obrajusta II%' limit 1;
  if v_empresa is null then raise exception 'Empresa Obrajusta II não encontrada'; end if;

  select id into v_quadro from public.quadros
   where empresa_id = v_empresa and nome ilike 'Concursos P%blicos%' and coalesce(arquivado,false) = false
   order by criado_em desc limit 1;
  if v_quadro is null then raise exception 'Quadro «Concursos Públicos» não encontrado na Obrajusta II'; end if;

  -- o quadro passa a ser do tipo concursos e ganha as 11 listas do modelo (se ainda não as tiver)
  update public.quadros set tipo = 'concursos', modelo_codigo = 'concursos' where id = v_quadro;
  if not exists (select 1 from public.quadro_listas where quadro_id = v_quadro and estado_codigo is not null) then
    insert into public.quadro_listas (quadro_id, empresa_id, nome, posicao, estado_codigo, campos_obrigatorios, final, bloqueada, cor)
    select v_quadro, v_empresa, ml.nome, ml.posicao, ml.estado_codigo, ml.campos_obrigatorios, ml.final, ml.bloqueada, ml.cor
      from public.quadro_modelo_listas ml where ml.modelo_codigo = 'concursos' order by ml.posicao;
  end if;

  -- já existe? então não duplica
  select id into v_conc from public.cp_concursos
   where empresa_id = v_empresa and entidade_referencia = 'CP1389DAG' limit 1;
  if v_conc is not null then raise notice 'Concurso CP1389DAG já existe (%)', v_conc; return; end if;

  -- o cartão, na coluna «Preços reais» (o DC fecha os preços amanhã)
  select id into v_lista from public.quadro_listas where quadro_id = v_quadro and estado_codigo = 'precos_reais' limit 1;
  select coalesce(max(posicao),0)+1 into v_pos from public.quadro_cartoes where lista_id = v_lista;
  insert into public.quadro_cartoes (lista_id, empresa_id, titulo, descricao, posicao, data_limite, doc_tipo, dados)
  values (v_lista, v_empresa,
    'OJMEC 105/2026 — Escola básica do Fomento – Fase 2 (2.ª publicação)',
    'Município de Mirandela · CP1389DAG · preço base 180.473,13 € · 120 dias · entrega 14-09-2026 17:00 na Vortal',
    v_pos, '2026-09-14 17:00:00+01', 'concurso',
    jsonb_build_object('referencia','CP1389DAG','preco_base',180473.13,'plataforma','Vortal'))
  returning id into v_cartao;

  insert into public.cp_concursos
    (empresa_id, cartao_id, referencia_interna, versao, entidade_nome, entidade_nipc, entidade_referencia,
     designacao, tipo_procedimento, tipo_contrato, cpv, local_execucao,
     preco_base, prazo_execucao_dias, caucao_pct, criterio_adjudicacao, fundos_eu,
     anuncio_numero, anuncio_data, plataforma, prazo_propostas, prazo_manutencao_dias, habilitacao,
     estado, decisao, decisao_motivo, decisao_em, notas)
  values
    (v_empresa, v_cartao, 'OJMEC 105/2026', 2, 'Município de Mirandela', '506881784', 'CP1389DAG',
     'Escola básica do Fomento – Fase 2', 'Concurso público', 'Empreitada de obras públicas', '45214210', 'Mirandela',
     180473.13, 120, 5, 'Monofator: preço', true,
     'Anúncio de procedimento n.º 21842/2026', '2026-08-28', 'Vortal', '2026-09-14 17:00:00+01', 66,
     'Alvará IMPIC com as habilitações do art. 17.º do Programa',
     'precos_reais', 'avancar', 'Concurso adjudicado na 1.ª publicação (CP1233DAG, 135.800 €) e republicado com novo mapa. Domínio total do assunto e dos preços.', now(),
     'Versão 2 do concurso CP1233DAG (OJMEC 105/2025). Mapa passou de 40 para 61 artigos; a Câmara renumerou os artigos, o emparelhamento com a v1 foi feito pela descrição.')
  returning id into v_conc;

  update public.quadro_cartoes set doc_id = v_conc where id = v_cartao;

  -- a checklist do art. 9.º
  insert into public.cp_documentos (empresa_id, concurso_id, alinea, nome, familia, depende_do_preco, estado, posicao, notas) values
    (v_empresa, v_conc, 'a', 'Declaração de aceitação do Caderno de Encargos (Anexo I)', 'modelo', false, 'por_fazer', 0, null),
    (v_empresa, v_conc, 'b', 'Declaração do preço contratual proposto (Anexo A)', 'especifico', true, 'por_fazer', 1, null),
    (v_empresa, v_conc, 'c', 'Mapa de Quantidades de Trabalhos com preços (Excel da CMM)', 'especifico', true, 'por_fazer', 2, null),
    (v_empresa, v_conc, 'd', 'Nota justificativa do preço proposto', 'especifico', true, 'por_fazer', 3, null),
    (v_empresa, v_conc, 'e', 'Programa de Trabalhos (plano de trabalhos, mão-de-obra, equipamento, estaleiro)', 'especifico', false, 'por_fazer', 4, null),
    (v_empresa, v_conc, 'f', 'Cronograma financeiro', 'especifico', true, 'por_fazer', 5, null),
    (v_empresa, v_conc, 'g', 'Memória justificativa e descritiva do modo de execução', 'especifico', false, 'por_fazer', 6, null),
    (v_empresa, v_conc, 'h', 'Modelo de Gestão da Qualidade, Segurança e Ambiente', 'modelo', false, 'por_fazer', 7, null),
    (v_empresa, v_conc, 'i', 'Certidão do Registo Comercial atualizada', 'standing', false, 'por_fazer', 8, 'A Marta anexa a versão atualizada — as certidões têm validades distintas.'),
    (v_empresa, v_conc, 'j', 'Declaração RCBE', 'standing', false, 'por_fazer', 9, 'A Marta anexa a versão atualizada — as certidões têm validades distintas.'),
    (v_empresa, v_conc, 'k', 'Declaração de consentimento de tratamento de dados (Anexo III)', 'modelo', false, 'por_fazer', 10, null),
    (v_empresa, v_conc, '—', 'Anexo II — declaração art. 55.º CCP', 'modelo', false, 'por_fazer', 11, null),
    (v_empresa, v_conc, '—', 'Declaração de compromisso do plano de subempreitadas', 'modelo', false, 'por_fazer', 12, null),
    (v_empresa, v_conc, '—', 'Proposta de preços (declaração) e lista de preços unitários', 'especifico', true, 'por_fazer', 13, null);

  raise notice 'Concurso % criado no cartão % ', v_conc, v_cartao;
end $$;
