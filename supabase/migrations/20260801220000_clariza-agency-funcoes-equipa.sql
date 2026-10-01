-- ============================================================================
-- CLARIZA AGENCY — modelo de equipa: funções, atribuição e medição
-- ============================================================================
-- Traz para dentro do sistema o manual de funções de uma agência pequena:
-- as nove responsabilidades que têm de ter dono, o que se espera de cada uma,
-- e os quatro campos que faltavam para os indicadores serem automáticos.
--
-- O objetivo declarado pelo utilizador: permitir conduzir a equipa de forma
-- assertiva mesmo sem experiência prévia de gestão. Daí guardar-se, além das
-- responsabilidades, os SINAIS DE ALERTA e a fronteira entre o que se decide
-- sozinho e o que se escala — que é o que mais falta a quem lidera pela
-- primeira vez.
--
-- Padrão: templates globais (empresa_id NULL) que cada agência pode adaptar,
-- igual ao já usado em ag_regimes_fiscais / ag_encargos_laborais.
-- ============================================================================

-- ── 1. Catálogo de funções ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ag_funcoes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID REFERENCES public.empresas(id) ON DELETE CASCADE, -- NULL = modelo global
  codigo        TEXT NOT NULL,
  nome          TEXT NOT NULL,
  aliases       TEXT,
  area          TEXT NOT NULL CHECK (area IN ('relacao','criacao','audiovisual','digital','suporte')),
  missao        TEXT NOT NULL,
  responsabilidades JSONB NOT NULL DEFAULT '[]'::jsonb,
  entregaveis   JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- [{indicador, origem: automatico|campo_novo|manual}]
  indicadores   JSONB NOT NULL DEFAULT '[]'::jsonb,
  sinais_alerta TEXT,
  decide_sozinho TEXT,
  escala        TEXT,
  ordem         INTEGER NOT NULL DEFAULT 0,
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (empresa_id, codigo)
);

ALTER TABLE public.ag_funcoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ag_funcoes_acesso ON public.ag_funcoes;
CREATE POLICY ag_funcoes_acesso ON public.ag_funcoes
  FOR ALL
  USING      (empresa_id IS NULL OR (SELECT user_has_empresa_access(empresa_id)))
  WITH CHECK (empresa_id IS NOT NULL AND (SELECT user_has_empresa_access(empresa_id)));

-- ── 2. Atribuição de funções a pessoas ──────────────────────────────────────
-- Numa agência pequena ninguém faz uma coisa só: a mesma pessoa acumula
-- funções, e a mesma função pode ser partilhada. Daí N:N, com uma marcada
-- como principal.
CREATE TABLE IF NOT EXISTS public.ag_colaborador_funcoes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  utilizador_id UUID REFERENCES public.liberty_utilizadores(id) ON DELETE CASCADE,
  employee_id   UUID,
  funcao_id     UUID NOT NULL REFERENCES public.ag_funcoes(id) ON DELETE CASCADE,
  senioridade   TEXT NOT NULL DEFAULT 'pleno' CHECK (senioridade IN ('junior','pleno','senior')),
  principal     BOOLEAN NOT NULL DEFAULT FALSE,
  desde         DATE NOT NULL DEFAULT CURRENT_DATE,
  ate           DATE,
  notas         TEXT,
  UNIQUE (empresa_id, utilizador_id, funcao_id)
);
CREATE INDEX IF NOT EXISTS ag_col_funcoes_emp_idx ON public.ag_colaborador_funcoes(empresa_id, utilizador_id);

ALTER TABLE public.ag_colaborador_funcoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ag_colaborador_funcoes_empresa ON public.ag_colaborador_funcoes;
CREATE POLICY ag_colaborador_funcoes_empresa ON public.ag_colaborador_funcoes
  FOR ALL
  USING      ((SELECT user_has_empresa_access(empresa_id)))
  WITH CHECK ((SELECT user_has_empresa_access(empresa_id)));

-- ── 3. Os quatro campos que faltavam para medir sem trabalho manual ─────────

-- Rondas de revisão e motivo do retrabalho, no trabalho.
-- Revela briefings fracos ANTES de virarem prejuízo, e diz de quem é o
-- problema sem obrigar ninguém a julgar.
ALTER TABLE public.ag_jobs
  ADD COLUMN IF NOT EXISTS revisoes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS motivo_retrabalho TEXT
    CHECK (motivo_retrabalho IN ('briefing','execucao','mudanca_cliente','externo'));

-- Teto de investimento em meios autorizado pelo cliente.
ALTER TABLE public.ag_projetos
  ADD COLUMN IF NOT EXISTS verba_autorizada NUMERIC(12,2);

-- Alterações de âmbito depois da aprovação — a fuga de margem mais comum.
CREATE TABLE IF NOT EXISTS public.ag_alteracoes_ambito (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id   UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  projeto_id   UUID NOT NULL,
  descricao    TEXT NOT NULL,
  origem       TEXT NOT NULL DEFAULT 'cliente'
               CHECK (origem IN ('cliente','agencia','externo')),
  com_custo    BOOLEAN NOT NULL DEFAULT FALSE,
  valor        NUMERIC(12,2),
  horas_extra  NUMERIC(8,2),
  aceite       BOOLEAN NOT NULL DEFAULT FALSE,
  registado_por UUID,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (projeto_id, empresa_id)
    REFERENCES public.ag_projetos(id, empresa_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ag_alt_ambito_proj_idx ON public.ag_alteracoes_ambito(projeto_id);

ALTER TABLE public.ag_alteracoes_ambito ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ag_alteracoes_ambito_empresa ON public.ag_alteracoes_ambito;
CREATE POLICY ag_alteracoes_ambito_empresa ON public.ag_alteracoes_ambito
  FOR ALL
  USING      ((SELECT user_has_empresa_access(empresa_id)))
  WITH CHECK ((SELECT user_has_empresa_access(empresa_id)));

-- ── 4. As nove funções, como modelo global ─────────────────────────────────

INSERT INTO public.ag_funcoes
  (empresa_id, codigo, nome, aliases, area, missao, responsabilidades, entregaveis,
   indicadores, sinais_alerta, decide_sozinho, escala, ordem)
VALUES

(NULL,'gestor_cliente','Gestor de Cliente','Account · Gestor de Contas · Responsável de Cliente','relacao',
 'Ser a única pessoa que o cliente precisa de conhecer, e garantir que o que foi vendido é o que é entregue — no prazo, no orçamento e com a margem prevista.',
 '["Recolher o briefing e traduzi-lo para a equipa em linguagem executável","Elaborar a proposta, defendê-la e negociar alterações de âmbito","Abrir o projeto no sistema e mantê-lo fiel à realidade","Ser o primeiro a saber quando algo derrapa — e o primeiro a avisar o cliente","Recolher aprovações formais antes de a produção avançar","Fechar o projeto: verificar entregas, confirmar faturação"]'::jsonb,
 '["Briefing escrito e validado pelo cliente","Proposta com âmbito, prazos e condições","Relatório de campanha ou de período","Ata das decisões tomadas em reunião","Pedido de alteração de âmbito, por escrito"]'::jsonb,
 '[{"i":"Margem real dos projetos que gere","o":"automatico"},{"i":"Desvio entre horas orçamentadas e apontadas","o":"automatico"},{"i":"Percentagem de propostas que chegam a aprovada","o":"automatico"},{"i":"Alterações de âmbito depois da aprovação","o":"campo_novo"},{"i":"Renovação e crescimento da carteira","o":"manual"}]'::jsonb,
 'Projetos que só ficam completos no sistema depois de terminados; o cliente a contactar diretamente quem executa; alterações aceites de boca sem ficarem escritas; margem sistematicamente abaixo do previsto nos mesmos clientes.',
 'Prioridade entre trabalhos do mesmo cliente; pequenas cortesias sem custo relevante; marcação e condução de reuniões.',
 'Descontos; alargamento de âmbito sem revisão de preço; prazos que obriguem a trabalho fora de horas; conflito com o cliente.', 1),

(NULL,'estrategista','Estrategista','Marketeer · Planner · Consultor de Marketing','relacao',
 'Transformar o objetivo de negócio do cliente num plano de comunicação que a equipa consiga executar e cujo resultado se consiga medir.',
 '["Diagnosticar o ponto de partida: mercado, concorrência, público, posicionamento","Definir objetivos mensuráveis e o que se considera sucesso","Escolher canais e definir a mensagem central","Traduzir a estratégia em plano trimestral ou de campanha","Ler os resultados e corrigir o rumo — não só apresentar números","Formar a equipa no que aprendeu com cada campanha"]'::jsonb,
 '["Diagnóstico e posicionamento","Plano de comunicação com objetivos e métricas","Plano editorial trimestral","Análise de concorrência","Relatório de resultados com recomendação"]'::jsonb,
 '[{"i":"Objetivos do plano efetivamente atingidos","o":"campo_novo"},{"i":"Horas de estratégia contra horas de execução","o":"automatico"},{"i":"O cliente agiu com base na recomendação?","o":"manual"},{"i":"Campanhas repetidas por terem funcionado","o":"manual"}]'::jsonb,
 'Planos que descrevem atividades em vez de objetivos; relatórios só com números e sem dizer o que fazer a seguir; estratégias iguais para clientes de setores diferentes; a agência a produzir muito sem ninguém saber para quê.',
 'Metodologia de diagnóstico; escolha de canais dentro do orçamento aprovado; ajustes de plano que não alterem o custo.',
 'Mudança de posicionamento da marca; alteração de orçamento de meios; recomendar ao cliente que pare uma campanha em curso.', 2),

(NULL,'redator','Redator','Copywriter · Redator Publicitário · Roteirista · Conteudista','criacao',
 'Dar voz à marca — encontrar as palavras que fazem alguém parar, perceber e agir, mantendo o mesmo tom em todos os sítios onde a marca fala.',
 '["Escrever textos de campanha: títulos, corpo, chamadas à ação","Escrever guiões de vídeo e áudio, com estrutura e tempo","Produzir conteúdo editorial: artigos, newsletters, redes","Definir e defender o tom de voz de cada marca","Rever textos de terceiros antes de saírem","Adaptar o mesmo conteúdo aos formatos de cada canal"]'::jsonb,
 '["Conceito criativo e chamada principal","Guião com tempos e indicações de imagem","Legendas e textos para redes","Artigo ou página com preocupação de pesquisa","Guia de tom de voz da marca"]'::jsonb,
 '[{"i":"Horas por peça contra o previsto","o":"automatico"},{"i":"Rondas de revisão até à aprovação","o":"campo_novo"},{"i":"Trabalhos entregues dentro do prazo","o":"automatico"},{"i":"Consistência de tom entre peças da mesma marca","o":"manual"}]'::jsonb,
 'Textos que precisam sempre de três ou mais revisões; todas as marcas a soarem igual; o redator a receber o trabalho já com o design feito; entregas à última hora que impedem revisão.',
 'Abordagem criativa dentro do briefing; estrutura do texto; escolha de referências e exemplos.',
 'Afirmações sobre o produto que não consegue verificar; humor ou tomadas de posição arriscadas; desvio deliberado do tom aprovado.', 3),

(NULL,'designer','Designer','Diretor de Arte · Designer Gráfico · Designer Digital','criacao',
 'Dar forma visual à mensagem — e garantir que a marca é reconhecível em qualquer peça, em qualquer formato, sem parecer feita por pessoas diferentes.',
 '["Conceber e produzir peças gráficas para digital e impressão","Criar e manter identidades visuais e respetivos manuais","Adaptar cada peça aos formatos de cada canal, sem perder qualidade","Preparar ficheiros para produção — cor, sangria, resolução, perfis","Organizar e manter os ficheiros abertos e as bibliotecas de marca","Garantir legibilidade e acessibilidade básica: contraste, tamanho, hierarquia"]'::jsonb,
 '["Peça final nos formatos pedidos, pronta a publicar","Manual de identidade e biblioteca de elementos","Ficheiro preparado para gráfica, com especificações","Modelos reutilizáveis para conteúdo recorrente","Maquetas de apresentação ao cliente"]'::jsonb,
 '[{"i":"Horas por peça contra o previsto","o":"automatico"},{"i":"Rondas de revisão até à aprovação","o":"campo_novo"},{"i":"Erros detetados depois da entrega","o":"campo_novo"},{"i":"Reutilização: quanto vira modelo","o":"manual"}]'::jsonb,
 'Cada peça a demorar mais do que a anterior, sinal de que não há modelos; ficheiros que ninguém encontra quando o designer não está; peças que voltam da gráfica com erro; a mesma marca com aspetos diferentes em canais diferentes.',
 'Composição, tipografia e cor dentro da identidade; escolha de imagens do banco; formato técnico dos ficheiros.',
 'Alterar elementos da identidade da marca; compra de fontes ou imagens com custo; sugerir ao cliente que mude o logótipo.', 4),

(NULL,'videomaker','Videomaker','Operador de Câmara · Realizador · Fotógrafo','audiovisual',
 'Captar material que sirva a ideia — e trazer do terreno tudo o que a pós-produção vai precisar, porque voltar a filmar custa muito mais do que filmar bem à primeira.',
 '["Preparar a filmagem: local, luz, som, plano de planos, autorizações","Filmar e fotografar com qualidade técnica consistente","Garantir som limpo — o erro mais caro e o menos recuperável","Enquadrar prevendo os formatos finais, incluindo vertical","Fazer cópia de segurança do material no próprio dia","Entregar o material organizado e identificado à edição"]'::jsonb,
 '["Material bruto organizado, com cópia de segurança","Plano de filmagem e lista de planos","Autorizações de imagem assinadas","Fotografia de apoio à campanha","Notas de rodagem para quem vai editar"]'::jsonb,
 '[{"i":"Regressos ao terreno por material em falta","o":"campo_novo"},{"i":"Horas de filmagem contra o previsto","o":"automatico"},{"i":"Percentagem do material que chega ao corte final","o":"manual"},{"i":"Autorizações de imagem em falta","o":"campo_novo"}]'::jsonb,
 'Som com problemas de forma recorrente; material entregue sem organização, obrigando a edição a procurar; ausência de cópia de segurança; filmar sem plano e resolver depois na edição — que é sempre mais caro.',
 'Enquadramento e movimento de câmara; equipamento a usar; ajustes de luz no local.',
 'Mudança de local ou de data; aluguer de equipamento; filmagem com pessoas não previstas; filmar em espaço que exija licença.', 5),

(NULL,'editor_video','Editor de Vídeo / Colorista','Montador · Pós-produção · Motion Designer','audiovisual',
 'Transformar material bruto em peça que prende — ritmo, som e cor ao serviço da mensagem, entregue em todos os formatos que os canais exigem.',
 '["Montar respeitando o guião, e propor quando o material pedir outra coisa","Tratar o som: níveis, ruído, música, locução","Corrigir e uniformizar a cor entre planos","Criar grafismos animados, legendas e separadores","Exportar nos formatos e proporções de cada canal","Arquivar projeto e ficheiros de forma recuperável"]'::jsonb,
 '["Vídeo final nas várias proporções e durações","Versão legendada — a maioria vê sem som","Cortes curtos para redes a partir da peça principal","Projeto arquivado e recuperável","Peças de motion e vinhetas reutilizáveis"]'::jsonb,
 '[{"i":"Horas de edição por minuto de vídeo final","o":"automatico"},{"i":"Rondas de revisão até à aprovação","o":"campo_novo"},{"i":"Entregas no prazo, com todos os formatos","o":"automatico"},{"i":"Consistência técnica: som e cor","o":"manual"}]'::jsonb,
 'Edição sempre a rebentar o orçamento — normalmente o problema está na captação ou no briefing; formatos entregues a conta-gotas; projetos que ninguém consegue reabrir; som com volumes diferentes entre peças da mesma marca.',
 'Ritmo e estrutura do corte; escolha de música do catálogo licenciado; tratamento de cor.',
 'Afastar-se do guião aprovado; música fora do catálogo; durações diferentes das contratadas; pedir nova filmagem.', 6),

(NULL,'social_media','Social Media','Community Manager · Gestor de Redes Sociais','digital',
 'Manter a marca viva e a responder — publicar com regularidade, conversar com quem aparece, e ser o primeiro a detetar quando algo corre mal em público.',
 '["Construir e manter o calendário editorial","Publicar e agendar, garantindo que nada falha em datas relevantes","Responder a comentários e mensagens dentro do prazo acordado","Moderar a comunidade e escalar situações delicadas","Acompanhar métricas e reportar o que interessa, não tudo","Trazer de volta o que a audiência está a dizer — é informação estratégica"]'::jsonb,
 '["Calendário editorial aprovado pelo cliente","Publicações agendadas com texto e imagem finais","Relatório mensal com leitura, não só números","Registo de interações relevantes e de crises evitadas","Sugestões de conteúdo a partir do que a comunidade pede"]'::jsonb,
 '[{"i":"Horas por cliente contra as horas de avença","o":"automatico"},{"i":"Publicações feitas contra planeadas","o":"campo_novo"},{"i":"Tempo de resposta a mensagens","o":"manual"},{"i":"Crescimento e interação por canal","o":"manual"}]'::jsonb,
 'Horas de avença a esgotarem antes do fim do mês, todos os meses; calendário aprovado tarde, obrigando a improviso; publicações sem responder a nenhum objetivo do plano; mensagens de clientes sem resposta durante dias.',
 'Respostas dentro do guião acordado; pequenos ajustes de calendário; aproveitar temas do momento alinhados com a marca.',
 'Qualquer reclamação pública; temas polémicos ou políticos; pedidos de reembolso ou queixas legais; alterar a linha editorial.', 7),

(NULL,'gestor_meios','Gestor de Meios','Gestor de Tráfego Pago · Media Buyer · Profissional de Mídia','digital',
 'Fazer render o dinheiro que o cliente investe em divulgação — e saber dizer, com números, o que cada euro trouxe de volta.',
 '["Planear onde investir, com que verba e com que objetivo","Configurar e gerir campanhas nas plataformas de anúncios","Definir públicos, testar variantes e otimizar com método","Controlar a verba diariamente — nunca gastar além do autorizado","Instalar e verificar a medição: conversões, eventos, etiquetas","Negociar com meios locais quando o plano os inclua"]'::jsonb,
 '["Plano de meios com verba por canal e objetivo","Campanhas configuradas e a correr","Relatório de desempenho com custo por resultado","Registo de testes e do que se aprendeu","Reconciliação entre o investido e o faturado ao cliente"]'::jsonb,
 '[{"i":"Custo por resultado e sua evolução","o":"manual"},{"i":"Retorno do investimento","o":"manual"},{"i":"Desvio entre verba autorizada e gasta","o":"campo_novo"},{"i":"Horas de gestão contra a comissão cobrada","o":"automatico"}]'::jsonb,
 'Verba gasta acima do autorizado, mesmo que por pouco; relatórios com métricas de vaidade em vez de custo por resultado; campanhas a correr meses sem alteração; medição de conversões partida sem ninguém dar por isso.',
 'Distribuição da verba entre campanhas dentro do plano; pausar o que não funciona; testes de criativos e públicos.',
 'Aumentar a verba total; investir em canal não previsto; pausar campanha que o cliente pediu expressamente; suspeita de fraude ou dados errados.', 8),

(NULL,'producao','Produção / Tráfego','Gestor de Projeto · Coordenador de Produção','suporte',
 'Fazer o trabalho fluir — garantir que cada trabalho tem dono, prazo e material, e que ninguém está parado à espera nem a fazer duas coisas ao mesmo tempo.',
 '["Distribuir os trabalhos e equilibrar a carga da equipa","Manter o quadro de trabalhos fiel ao que se passa na realidade","Detetar bloqueios antes de virarem atrasos","Contratar e acompanhar fornecedores externos","Garantir que as horas são apontadas — sem isso não há gestão possível","Preparar os números para as reuniões de equipa"]'::jsonb,
 '["Quadro de trabalhos atualizado","Mapa de carga por pessoa e por semana","Pedidos a fornecedores com prazo e preço fechados","Relatório semanal de atrasos e riscos"]'::jsonb,
 '[{"i":"Trabalhos concluídos dentro do prazo","o":"automatico"},{"i":"Horas apontadas contra horas disponíveis","o":"automatico"},{"i":"Trabalhos parados há demasiado tempo","o":"automatico"},{"i":"Equilíbrio de carga entre pessoas","o":"manual"}]'::jsonb,
 'Horas apontadas muito abaixo das horas trabalhadas — sinal de que o registo não está a acontecer e todos os números ficam inúteis; trabalhos que ficam semanas na mesma coluna; a mesma pessoa sempre sobrecarregada; fornecedores contratados sem preço fechado.',
 'Distribuição diária de trabalho; reordenar prioridades dentro da semana; escolher entre fornecedores já aprovados.',
 'Prazo que não é possível cumprir; necessidade de contratar reforço; fornecedor novo; conflito de prioridades entre clientes.', 9)

ON CONFLICT (empresa_id, codigo) DO NOTHING;

-- ── 5. Vista: quem faz o quê, com as horas do último trimestre ──────────────
CREATE OR REPLACE VIEW public.ag_v_equipa
WITH (security_invoker = on) AS
SELECT
  cf.empresa_id,
  cf.utilizador_id,
  lu.nome                                   AS pessoa,
  f.id                                      AS funcao_id,
  f.codigo                                  AS funcao_codigo,
  f.nome                                    AS funcao,
  f.area,
  cf.senioridade,
  cf.principal,
  COALESCE(a.minutos, 0) / 60.0             AS horas_90d,
  COALESCE(a.custo, 0)                      AS custo_90d
FROM public.ag_colaborador_funcoes cf
JOIN public.ag_funcoes f        ON f.id = cf.funcao_id
LEFT JOIN public.liberty_utilizadores lu ON lu.id = cf.utilizador_id
LEFT JOIN (
  SELECT utilizador_id, empresa_id,
         SUM(minutos)                                        AS minutos,
         SUM((minutos/60.0) * COALESCE(custo_hora_snap, 0))  AS custo
  FROM public.ag_apontamentos
  WHERE data >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY utilizador_id, empresa_id
) a ON a.utilizador_id = cf.utilizador_id AND a.empresa_id = cf.empresa_id
WHERE cf.ate IS NULL OR cf.ate >= CURRENT_DATE;

-- ============================================================================
-- NOTA
-- ============================================================================
-- As nove funções entram como MODELO GLOBAL (empresa_id NULL): ficam visíveis
-- a todas as agências e nenhuma as pode alterar. Cada agência que queira
-- adaptar uma função cria a sua própria versão com o mesmo código — a política
-- de escrita só permite gravar linhas com empresa_id preenchido.
-- ============================================================================
