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

-- Semente 2/3 e 3/3: os artigos do mapa. Correr DEPOIS da semente 1.
insert into public.cp_mapa_itens
  (empresa_id, concurso_id, codigo, nivel, descricao, unidade, quantidade, preco_unitario, origem_preco, codigo_v1, quantidade_v1, posicao)
select e.id, c.id, v.codigo, v.nivel, v.descricao, v.unidade, v.quantidade, v.preco_unitario, v.origem_preco, v.codigo_v1, v.quantidade_v1, v.posicao
from (values
  ('0', 'capitulo', 'TRABALHOS PRELIMINARES', null, null, null, null, null, null, 0),
  ('0.1', 'artigo', 'Trabalhos relativos ao estaleiro principal e/ou secundário, ou relativos a quaisquer outras instalações provisórias de apoio à execução dos trabalhos, incluindo as correspondentes instalações, redes provisórias de água, de esgoto, de electricidade e de meios de telecomunicações, vias internas de circulação, equipamento de segurança e sinalização previsto no Plano de Segurança e Saúde e todos os trabalhos necessários, para o conjunto dos trabalhos incluídos na empreitada, conforme especificações do C.E.:', null, null, null, null, null, null, 1),
  ('0.1.1', 'item', 'Montagem e construção do estaleiro e instalações provisórias, incluindo preparação da área a utilizar e vedação.', 'un', 1, 2785, 'reutilizado', '0.1.1', 1, 2),
  ('0.1.2', 'item', 'Exploração do estaleiro e instalações provisórias.', 'un', 1, 1250, 'reutilizado', '0.1.2', 1, 3),
  ('0.1.3', 'item', 'Desmontagem e demolição do estaleiro e instalações provisórias, incluindo remoção de todos os materiais e arranjo paisagístico da área ocupada após a desmontagem.', 'un', 1, 1250, 'reutilizado', '0.1.3', 1, 4),
  ('0.1.4', 'item', 'Fornecimento e montagem de painéis de publicidade à empreitada com desmontagem e remoção final, conforme indicação da Câmara Municipal.', 'un', 1, 550, 'reutilizado', '0.1.4', 1, 5),
  ('0.1.5', 'item', 'Sinalização temporária de trabalhos, de acordo com DL33/88 de 12 de Setembro, referente a sinalização vertical, horizontal e outros equipamentos necessários, incluindo fornecimento, implantação e colocação.', 'un', 1, 494.7, 'reutilizado', '0.1.5', 1, 6),
  ('0.1.6', 'item', 'Conservação durante o prazo da empreitada, das estradas, arruamentos ou caminhos utilizados pelo adjudicatário durante a execução da obra.', 'un', 1, 750, 'reutilizado', '0.1.6', 1, 7),
  ('0.1.7', 'item', 'Elaboração do Plano de Segurança e Saúde (PSS) para a fase de obra, de acordo com o Decreto-Lei n.º 273/2003, de 29 de Outubro e toda a legislação em vigor que regula a actividade.', 'un', 1, 750, 'reutilizado', '0.1.7', 1, 8),
  ('0.1.8', 'item', 'Implementação do Plano de Segurança e Saúde (PSS), de acordo com o PSS para a fase de obra elaborado pelo adjudicatário e demais Legislação em vigor.', 'un', 1, 750, 'reutilizado', '0.1.8', 1, 9),
  ('0.1.9', 'item', 'Execução da Compilação Técnica (elaboração de dossier).', 'un', 1, 750, 'reutilizado', '0.1.9', 1, 10),
  ('0.1.10', 'item', 'Implementação do Plano de Prevenção e Gestão de Resíduos de Construção e Demolição (PPG-RCD), de acordo com o estudo apresentado e demais Legislação em vigor.', 'un', 1, 550, 'reutilizado', '0.1.10', 1, 11),
  ('0.1.11', 'item', 'Elaboração da versão definitiva do Plano da Qualidade da Empreitada de acordo com as normas em vigor.', 'un', 1, 700, 'reutilizado', '0.1.11', 1, 12),
  ('0.1.12', 'item', 'Implementação do Plano da Qualidade da Empreitada, de acordo com o Plano elaborado pelo adjudicatário e aprovado pelo Dono de Obra.', 'un', 1, 750, 'reutilizado', '0.1.12', 1, 13),
  ('0.1.13', 'item', 'Execução de telas finais de acordo com a obra realizada e nas condições do Caderno de Encargos.', 'un', 1, 750, 'reutilizado', '0.1.13', 1, 14),
  ('0.1.14', 'item', 'Apoio de construção civil às restantes artes intervenientes na empreitada, incluíndo nomeadamente abertura e tapamento de roços, ranhuras e valas, cedência de mão-de-obra e demais trabalhos que venham a ser solicitados pela fiscalização, de acordo com as peças desenhadas.', 'un', 1, 1350, 'reutilizado', '0.1.14', 1, 15),
  ('1', 'capitulo', 'ARQUITECTURA', null, null, null, null, null, null, 16),
  ('1.1', 'artigo', 'PAVIMENTAÇÃO - PARQUE INFANTIL', null, null, null, null, null, null, 17),
  ('1.1.1', 'item', 'Fornecimento e colocação de revestimento de pavimento executado em formato INSITU de 20mm espessura, com camada inferior em SBR preto com 10mm de espessura e camada superior em EPDM com 10mm de espessura, com capacidade de absorção de queda até 0,80m, tipo “ PISOS INSITU da FLGASPAR” ou equivalente, com pendente para escoamento de águas superficiais de 2%, incluindo execução de betonilha armada com malhasol CQ 30, com espessura de 10cm, sobre camada de material granular britado com 20cm de espessura, incluindo decapagem ou escavação e preparação do terreno à cota necessária de arranque, abertura dos caboucos, remoção dos produtos escavados, betão limpeza com 10cm, cortes, remates, limpeza e todos os materiais e trabalhos necessários, de acordo com peças desenhadas e CTE. Cores do pavimento a escolher pelo projetista.', 'm2', 105, 120, 'qtd_alterada', '1.1.1', 95, 18),
  ('1.1.2', 'item', 'Fornecimento e assentamento de novos lancis de betão, boleado para canteiros, 1000x80x200, tipo "L4 da PAVIMIR", ou equivalente, em fundação 30x30cm de betão ciclópico, incluindo decapagem ou escavação e preparação do terreno à cota necessária de arranque, abertura dos caboucos, remoção dos produtos escavados, betão limpeza, cortes, remates, limpeza e todos os trabalhos necessários.', 'm', 42, null, 'novo', null, null, 19),
  ('1.2', 'artigo', 'PAVIMENTAÇÃO - CAMPO DE JOGOS SUPERIOR', null, null, null, null, null, null, 20),
  ('1.2.1', 'item', 'Fornecimento e execução de pavimentação exterior com caixa de areia de 10cm e rachão compactado de 15cm, sobre piso existente, devidamente regularizado e limpo, para assentamento de patelas de betão, tipo “PAVIMIR”, em cor semelhante ao existente, com 6cm de espessura, ou equivalente, assentes com juntas ao traço seco de 1:3 de cimento e areia, com pendente de 2% para escoamento de águas superficiais, incluindo decapagem ou escavação e preparação do terreno à cota necessária de arranque, remoção de lancis e respetiva fundação para permitir alinhamento do novo pavimento com o existente, remoção dos produtos escavados, cortes, remates, execução de aro em betonilha à cor da patela envolvendo caixas de visita ou sarjetas, limpeza e todos os trabalhos necessários.', 'm2', 400, null, 'novo', null, null, 21),
  ('1.2.2', 'item', 'Fornecimento e assentamento de novos lancis de betão, boleado para canteiros, 1000x80x200, tipo "L4 da PAVIMIR", ou equivalente, em fundação 30x30cm de betão ciclópico, incluindo decapagem ou escavação e preparação do terreno à cota necessária de arranque, abertura dos caboucos, remoção dos produtos escavados, betão limpeza, cortes, remates, limpeza e todos os trabalhos necessários.', 'm', 52, null, 'novo', null, null, 22),
  ('1.2.3', 'item', 'Fornecimento e construção de sapatas em betão ciclópico 30x30x30cm, para fixação de balizas, incluindo betão de limpeza, cortes, remates, assentamento de patela com argamassa e camada de EPDM, limpeza e todos os materiais e trabalhos necessários, conforme peças desenhadas.', 'm3', 0.15, null, 'novo', null, null, 23),
  ('1.3', 'artigo', 'PAVIMENTAÇÃO - LOGRADOURO INFERIOR', null, null, null, null, null, null, 24),
  ('1.3.1', 'item', 'Fornecimento e execução de pavimentação exterior com caixa de areia de 10cm e rachão compactado de 15cm, sobre piso existente, devidamente regularizado e limpo, para assentamento de patelas de betão, tipo “PAVIMIR”, em cor semelhante ao existente, com 6cm de espessura, ou equivalente, assentes com juntas ao traço seco de 1:3 de cimento e areia, com pendente de 2% para escoamento de águas superficiais, incluindo decapagem ou escavação e preparação do terreno à cota necessária de arranque, remoção de lancis e respetiva fundação para permitir alinhamento do novo pavimento com o existente, remoção dos produtos escavados, cortes, remates, execução de aro em betonilha à cor da patela envolvendo caixas de visita ou sarjetas, limpeza e todos os trabalhos necessários.', 'm2', 48, null, 'novo', null, null, 25),
  ('1.3.2', 'item', 'Fornecimento e assentamento de novos lancis de betão, boleado para canteiros, 1000x80x200, tipo "L4 da PAVIMIR", ou equivalente, em fundação 30x30cm de betão ciclópico, incluindo decapagem ou escavação e preparação do terreno à cota necessária de arranque, abertura dos caboucos, remoção dos produtos escavados, betão limpeza, cortes, remates, limpeza e todos os trabalhos necessários.', 'm', 32, null, 'novo', null, null, 26),
  ('1.4', 'artigo', 'PAVIMENTAÇÃO - CAMPO DE JOGOS INFERIOR', null, null, null, null, null, null, 27),
  ('1.4.1', 'item', 'Fornecimento e colocação de revestimento de pavimento executado em formato INSITU de 20mm espessura, com camada inferior em SBR preto com 10mm de espessura e camada superior em EPDM com 10mm de espessura, com capacidade de absorção de queda até 0,80m, tipo “ PISOS INSITU da FLGASPAR” ou equivalente, com pendente para escoamento de águas superficiais de 2%, incluindo execução de betonilha armada com malhasol CQ 30, com espessura de 10cm, sobre camada de material granular britado com 20cm de espessura, incluindo decapagem ou escavação e preparação do terreno à cota necessária de arranque, abertura dos caboucos, remoção dos produtos escavados, betão limpeza com 10cm, cortes, remates, limpeza e todos os materiais e trabalhos necessários, de acordo com peças desenhadas e CTE. Cores do pavimento a escolher pelo projetista.', 'm2', 243, 120, 'qtd_alterada', '1.4.1', 255, 28),
  ('1.4.2', 'item', 'Fornecimento e assentamento de novos lancis de betão, boleado para canteiros, 1000x80x200, tipo "L4 da PAVIMIR", ou equivalente, em fundação 30x30cm de betão ciclópico, incluindo decapagem ou escavação e preparação do terreno à cota necessária de arranque, abertura dos caboucos, remoção dos produtos escavados, betão limpeza, cortes, remates, limpeza e todos os trabalhos necessários.', 'm', 68, null, 'novo', null, null, 29),
  ('1.4.3', 'item', 'Fornecimento e construção de sapatas em betão ciclópico 30x30x30cm, para fixação de balizas existentes, incluindo betão de limpeza, cortes, remates, assentamento de patela com argamassa e camada de EPDM, limpeza e todos os materiais e trabalhos necessários, conforme peças desenhadas.', 'm3', 0.15, null, 'novo', null, null, 30),
  ('1.4.4', 'item', 'Fornecimento e construção de sapatas em betão ciclópico 80x80x80cm, para fixação de tabelas de basquetebol, incluindo betão de limpeza, cortes, remates, limpeza e todos os materiais e trabalhos necessários, conforme peças desenhadas.', 'm3', 0.55, null, 'novo', null, null, 31),
  ('1.5', 'artigo', 'PASSEIO PÚBLICO', null, null, null, null, null, null, 32),
  ('1.5.1', 'item', 'Fornecimento e construção de passeio novo com 2,00m de largura, executado com patelas de betão para pavimento exterior, tipo “PAVIMIR”, em cor semelhante ao existente no arruamento, com 6cm de espessura, ou equivalente, assentes em caixa de areia de 10cm, sobre camada de rachão compactado de 20cm, execução de juntas ao traço seco de 1:3 de cimento e areia, incluindo escavação e remoção dos produtos escavados, cortes, remates, execução de aro em betonilha à cor da patela envolvendo caixas de visita ou saneamento, limpeza e todos os trabalhos necessários.', 'm2', 243, null, 'novo', null, null, 33),
  ('1.5.2', 'item', 'Fornecimento e instalação de lancis viários tipo "PAVIMIR L6" ou equivalente, em fundação 40x40cm de betão ciclópico, incluindo escavação, abertura dos caboucos e remoção dos produtos escavados, betão limpeza, cortes, remates, limpeza e todos os trabalhos necessários.', 'm', 46, null, 'novo', null, null, 34),
  ('1.6', 'artigo', 'ESTACIONAMENTO PÚBLICO', null, null, null, null, null, null, 35),
  ('1.6.1', 'item', 'Fornecimento e construção de faixa de estacionamento viário / zona de "drop-off" de alunos, executado em cubos de granito de cor cinza com as dimensões de 0.11x0.11x0.11m, de 1ª qualidade, assentes paralelamente à faixa de rodagem na faixa de estacionamento/paragem, conforme peças desenhadas apresentadas, incluindo escavação e remoção de pavimento existente, fornecimento, transporte, e aplicação de camada de assentamento constituída por mistura de cimento e areia a traço seco (1:3) com 0.05m de espessura, base em material granular britado (de granulometria extensa) com espessura de 0.20m após compactação, nas zona de estacionamento proposta, demolição de murete existente, remoção cuidadosa e armazenamento em obra, de rede metálica de vedação para posterior reutilização, remoção dos produtos escavados e demolidos com transporte a vazadouro certificado, cortes, remates, execução de aro em betonilha à cor da patela envolvendo caixas de visita existentes, limpeza e todos os trabalhos necessários.', 'm2', 94, null, 'novo', null, null, 36),
  ('1.7', 'artigo', 'ESCADAS EXTERIORES', null, null, null, null, null, null, 37),
  ('1.7.1', 'item', 'Fornecimento e execução de escadas novas em betão armado em local de escadas existentes, com a mesma configuração, com revestimento de pavimento em patela de betão de 6cm, tipo “PAVIMIR”, em cor a definir pelo projectista, com 6cm de espessura, ou equivalente, sobre piso laje de massame de betão armado com malhasol CQ30, com 15cm espessura, betonilha de regularização, incluindo demolição e remoção de escada existente e transporte a vazadouro certificado, assentamento de patelas com argamassa de cimento, cortes, remates, lixamento, limpeza e todos os materiais e trabalhos necessários.', 'm2', 38, null, 'novo', null, null, 38)
) as v(codigo, nivel, descricao, unidade, quantidade, preco_unitario, origem_preco, codigo_v1, quantidade_v1, posicao),
     (select id from public.empresas where nome ilike 'Obrajusta II%' limit 1) e,
     (select id from public.cp_concursos where entidade_referencia = 'CP1389DAG' order by criado_em desc limit 1) c
where not exists (select 1 from public.cp_mapa_itens m where m.concurso_id = c.id and m.codigo = v.codigo);

-- Semente 3/3: os artigos do mapa. Correr DEPOIS da semente 1.
insert into public.cp_mapa_itens
  (empresa_id, concurso_id, codigo, nivel, descricao, unidade, quantidade, preco_unitario, origem_preco, codigo_v1, quantidade_v1, posicao)
select e.id, c.id, v.codigo, v.nivel, v.descricao, v.unidade, v.quantidade, v.preco_unitario, v.origem_preco, v.codigo_v1, v.quantidade_v1, v.posicao
from (values
  ('1.8', 'artigo', 'MURO DE VEDAÇÃO', null, null, null, null, null, null, 39),
  ('1.8.1', 'item', 'Fornecimento e construção de murete novo, executado em blocos de cimento com 20cm largura, com acabamento rebocado a areado fino e pintura a tinta areada plástica em duas demãos, incluindo fornecimento e execução de pilaretes e vigas de capeamento em betão armado, com fundação de 40x40cm em betão ciclópico, betão limpeza, abertura dos caboucos e remoção dos produtos escavados, cortes, remates, instalação de rede e pilares metálicos existentes do tipo BEKAERT ou equivalente, com instalação de novos elementos semelhantes à vedação existente (postes metálicos, rede tipo BEKAERT ou equivalente,e acessórios de montagem), limpeza e todos os materiais e trabalhos necessários. Altura do murete e vedação, igual ao existente. Inclui a retirada do muro existente.', 'm2', 45, null, 'novo', null, null, 40),
  ('1.9', 'artigo', 'REVESTIMENTOS', null, null, null, null, null, null, 41),
  ('1.9.1', 'item', 'Fornecimento e realização de revestimento de muretes novos com argamassa de cimento e areia ao traço de 1:3 com incorporação de um hidrófugo de massa, acabamento a areado fino, para posterior pintura com tinta plástica, incluindo emboço de regularização, remates, limpeza e todos os materiais e trabalhos necessários, de acordo com peças desenhadas.', 'm2', 105, null, 'novo', null, null, 42),
  ('1.10', 'artigo', 'PINTURAS', null, null, null, null, null, null, 43),
  ('1.10.1', 'item', 'Fornecimento e aplicação de marcações de campo de jogos com tinta para pavimentos exteriores, da marca tipo CIN ou equivalente, de acordo com normas técnicas para recintos escolares, incluindo remates, limpeza e todos os materiais e trabalhos necessários, conforme peças desenhadas.', 'm2', 153, null, 'novo', null, null, 44),
  ('1.10.2', 'item', 'Fornecimento e aplicação de primário tipo "CIN PRIMÁRIO CINOLITE” ou equivalente, em 1 demão, incluindo preparação das superfícies e limpeza.', 'm2', 105, null, 'novo', null, null, 45),
  ('1.10.3', 'item', 'Fornecimento e aplicação de tinta plástica tipo "CIN NOVATEX HD (tinta areada fina), ou equivalente, em 2 demãos, incluindo preparação das superfícies, limpeza e aplicação de uma demão diluída até 10%. Cor Branco.', 'm2', 105, null, 'novo', null, null, 46),
  ('1.11', 'artigo', 'GUARDAS', null, null, null, null, null, null, 47),
  ('1.11.1', 'item', 'Fornecimento e montagem de guarda metálica, executada com os seguintes elementos: corrimão em tubular metálico rectangular de 60x30mm (altura 0,90m) com encaixe macho-fêmea entre secções; prumos verticais de suporte em barras metálicas com secção 50x10mm, soldados a placas de amarração de 6mm de espessura (espaçamento de 1,00m aos eixos); tubulares rectangulares metálicos horizontais com secção 50x20mm, soldados aos prumos verticais (altura do pavimento 0,45m), fixos a sapatas em massame de betão, incluindo fornecimento e realização de fundações em betão ciclópico, abertura de caboucos, peças acessórias, cortes, remates e todos os trabalhos necessários, conforme peças desenhadas e CTE. Guarda com acabamento lacado cor RAL7012M.', 'm', 105, 168, 'reutilizado', '1.6.1', 105, 48),
  ('1.11.2', 'item', 'Fornecimento e montagem de guarda metálica de escadas, executada com os seguintes elementos: corrimão tubular metálico rectangular com secção 60x30mm (altura 0,90m); prumos verticais de suporte em barras metálicas com secção 50x10mm, soldados a placas de amarração de 10mm de espessura (espaçamento de 1,00m aos eixos); tubulares metálicos horizontais com secção 50x20mm, soldados aos prumos verticais (altura do pavimento 0,45m), pintura à pistola uma demão de primário e tinta de esmalte em duas demãos, cortes, remates, lixamento, soldaduras, limpeza e todos os materiais e trabalhos necessários. Guarda com acabamento lacado cor RAL7012M.', 'm', 32, null, 'novo', null, null, 49),
  ('1.12', 'artigo', 'COBERTURA - PARQUE INFANTIL', null, null, null, null, null, null, 50),
  ('1.12.1', 'item', 'Fornecimento e realização de cobertura de duas águas, em painel sandwich com isolamento térmico em poliuretano de 30mm espessura, tipo “PAINEL 2000 modelo PC1100”, com tapa juntas e topos selados com a chapa da face superior do painel, ou equivalente, incluindo cumeeira e remates em chapa metálica, de acabamento lacado, cortes, peças acessórias e todos os trabalhos necessários de acordo com peças desenhadas e CTE. Cor da face superior da cobertura e chapas da cumeeira CINZA RAL9006, cor da face inferior da cobertura BRANCO RAL 9010. (medição em planta)', 'm2', 110, 55, 'reutilizado', '1.7.1', 110, 51),
  ('1.12.2', 'item', 'Fornecimento e realização de caixas receptoras de águas pluviais, de pavimento, em betão, assentes em caixa de areia incluindo grelha reticulada com acabamento galvanizado, cortes, remates, limpeza e ligações à rede de drenagem de águas pluviais do logradouro, peças acessórias e todos os trabalhos necessários, de acordo com peças desenhadas e CTE.', 'un', 4, 350, 'reutilizado', '1.7.2', 4, 52),
  ('1.12.3', 'item', 'Fornecimento e realização de caleira de águas pluviais, em chapa metálica, com acabamento lacado, fixa à estrutura metálica, incluindo cortes, remates, peças acessórias e todos os trabalhos necessários, de acordo com peças desenhadas e CTE.', 'm', 25, 35, 'reutilizado', '1.7.3', 25, 53),
  ('1.12.4', 'item', 'Fornecimento e realização de tubos de queda, em chapa metálica, com acabamento lacado, fixa à estrutura metálica, incluindo cortes, remates, peças acessórias e todos os trabalhos necessários, de acordo com peças desenhadas e CTE.', 'm', 13, 35, 'reutilizado', '1.7.4', 13, 54),
  ('1.13', 'artigo', 'EQUIPAMENTO URBANO', null, null, null, null, null, null, 55),
  ('1.13.1', 'item', 'Fornecimento e montagem de caixa de areia tipo “BRICANTEL SAND CIRCLE” ou equivalente. Dimensões: 2,95m x 2,55m, incluindo colocação de areia própria para parques infantis, de 1ª qualidade e lona de proteção e todos os trabalhos necessários, conforme peças desenhadas e CTE.', 'un', 1, 4750, 'reutilizado', '1.8.1', 1, 56),
  ('1.13.2', 'item', 'Fornecimento e instalação de tabelas de basquetebol, tipo BRICANTEL BRO18-1 ou equivalente, incluindo placa de amarração em aço carbono e prumos de fixação chumbados na fundação, remates, limpeza e todos os materiais e trabalhos necessários, conforme peças desenhadas e normas do fabricante.', 'un', 2, null, 'novo', null, null, 57),
  ('1.14', 'artigo', 'ARRANJOS EXTERIORES', null, null, null, null, null, null, 58),
  ('1.14.1', 'item', 'Fornecimento e instalação de hidrossementeira a colocar nos taludes, constituída à base de uma mistura de herbáceas: 10% Lolium rigidum, 9 % Festuca arundinacea, 1% Poa compressa, 10% Agropyrum cristatum, 8 % Agropyrum desertotum, 5% Agropyrum intermedium, 10% Lolium multiflorum, 1% Eragrostis curvula, 10% Medicago sativa, 15% Melilotus officinalis, 10% Onobrychis sativa, 10% Vicia villosa, 1% Buchloe dactyloides.', 'm2', 715, null, 'novo', null, null, 59),
  ('1.14.2', 'item', 'Fornecimento e instalação de hidrossementeira a colocar em áreas planas de espaços verdes, constituída à base de uma mistura de herbáceas: 10% Lolium rigidum, 9 % Festuca arundinacea, 1% Poa compressa, 10% Agropyrum cristatum, 8 % Agropyrum desertotum, 5% Agropyrum intermedium, 10% Lolium multiflorum, 1% Eragrostis curvula, 10% Medicago sativa, 15% Melilotus officinalis, 10% Onobrychis sativa, 10% Vicia villosa, 1% Buchloe dactyloides.', 'm2', 486, null, 'novo', null, null, 60),
  ('1.14.3', 'item', 'Fornecimento e instalação de hidrossementeira a colocar em canteiro, constituída à base de uma mistura arbustiva: 5% Piptatherum milliaceum, 3% Cistus albidus, 10% Asphodelus fistulosus, 15% Rosa canina, 5% Stipa tenacissima, 2% Coronilla Valentina, 5% Jasminum fruticans, 5% Moricandia arvensis, 3% Lavandula Iatifolia, 2% Santolina chamaecyparissus, 20% Retama sphaerocarpa, 5% Thymus vulgaris, 5% Rosmarinus officinalis, 5% Atriplex halimus, 5% Genista scorpius, 5% Salvia lavandulifolia, incluindo camada de terra vegetal numa espessura de 20cm, bem como todos os trabalhos e materais necessários.', 'm2', 39, null, 'novo', null, null, 61),
  ('1.14.4', 'item', 'Fornecimento e plantação de árvores, incluindo o fornecimento de espécies: Malus domestica (macieira) - RN, 1 ano, abertura e enchimento das covas com terra vegetal, a adubação, a rega e a manutenção necessária, incluindo colocação de tutores em madeira de pinho tratado, torneados, com 1,50m de altura e 4cm de diâmetro incluindo fitas de borracha para amarração do tipo "Elastos" da Toltex ou equivalente.', 'un', 3, null, 'novo', null, null, 62),
  ('2', 'capitulo', 'ESTRUTURAS', null, null, null, null, null, null, 63),
  ('2.1', 'artigo', 'MOVIMENTO DE TERRAS', null, null, null, null, null, null, 64),
  ('2.1.1', 'item', 'Escavação em terreno de qualquer natureza, para abertura de caboucos em fundações, incluindo entivação, se necessário, reposição, carga, triagem e transporte a operador licenciado.', 'm3', 16.86, 35, 'reutilizado', '2.1.1', 16.86, 65),
  ('2.1.2', 'item', 'Escavação em terreno de qualquer natureza, para abertura de caboucos em fundações, incluindo entivação, se necessário, reposição, carga, triagem e transporte a operador licenciado.', 'm3', 45, null, 'novo', null, null, 66),
  ('2.2', 'artigo', 'BETÕES', null, null, null, null, null, null, 67),
  ('2.2.1', 'item', 'Fornecimento e realização de betão simples da classe NP EN206-1: C12/15 (X0(P); D12; S3; Cl1.0), para regularização e selagem de fundações.', 'm3', 1.64, 300, 'reutilizado', '2.2.1', 1.64, 68),
  ('2.2.2', 'item', 'Fornecimento e realização de betão armado da classe NP EN206-1: C25/30 (XC2(P); D12; S3; Cl0.4) / A400NR, incluindo cofragem e vibração mecânica em sapatas.', 'm3', 7.08, 350, 'reutilizado', '2.2.2', 7.08, 69),
  ('2.2.3', 'item', 'Betão simples da classe C16/20, para regularização e selagem de fundações.', 'm3', 2.5, null, 'novo', null, null, 70),
  ('2.2.4', 'item', 'Betão armado da classe NP EN206-1: C25/30; XC2(P); Cl0.4; Dmax22; S3 / A400NR, incluindo cofragem e vibração mecânica em sapatas de muros.', 'm3', 6.6, null, 'novo', null, null, 71),
  ('2.2.5', 'item', 'Betão armado da classe NP EN206-1: C25/30; XC2(P); Cl0.4; Dmax22; S3 / A400NR, incluindo cofragem, chanfro a 45º conforme desenho de pormenor, vibração mecânica em muro de suporte, inclusive todos os trabalhos e materiais para a execução do tubo de PVC para drenagem.', 'm3', 6.2, null, 'novo', null, null, 72),
  ('2.3', 'artigo', 'ESTRUTURA METÁLICA', null, null, null, null, null, null, 73),
  ('2.3.1', 'item', 'Fornecimento e realização de placa de ancoragem de aço S275JR (Fe430) em perfil plano: — 400x350x15mm', 'un', 8, 75, 'reutilizado', '2.3.1', 0, 74),
  ('2.3.2', 'item', 'Fornecimento e realização de pilares em Aço S275JR (Fe430), com peças simples de perfis laminados a quente, com ligações soldadas: — 200x120x6mm', 'kg', 574, 7, 'reutilizado', '2.3.2', 0, 75),
  ('2.3.3', 'item', 'Fornecimento e realização de vigas em Aço S275JR (Fe430), com peças simples de perfis laminados a quente, com ligações soldadas: — 120x200x6mm', 'kg', 2010.44, 7, 'reutilizado', '2.3.3', 0, 76),
  ('2.3.4', 'item', 'Fornecimento e realização de madres em Aço S275JR (Fe430), com peças simples de perfis laminados a quente, com ligações soldadas: — 50x100x3mm', 'kg', 962.28, 4, 'reutilizado', '2.3.4', 0, 77)
) as v(codigo, nivel, descricao, unidade, quantidade, preco_unitario, origem_preco, codigo_v1, quantidade_v1, posicao),
     (select id from public.empresas where nome ilike 'Obrajusta II%' limit 1) e,
     (select id from public.cp_concursos where entidade_referencia = 'CP1389DAG' order by criado_em desc limit 1) c
where not exists (select 1 from public.cp_mapa_itens m where m.concurso_id = c.id and m.codigo = v.codigo);
