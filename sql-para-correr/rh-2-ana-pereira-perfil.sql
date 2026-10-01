-- Perfil crítico da candidata Ana Rita Rebeca Pereira (vaga Técnico Administrativo Comercial, Obrajusta II)
-- Substitui a análise automática (que não correu) pela análise feita a 14/09/2026 a partir do CV + certificado.
update public.rh_candidatos c set
  estado = 'em_analise',
  ia_processado_em = now(),
  ia_erro = null,
  ia_anos_experiencia = 10,
  ia_formacao = 'CEF Técnico Administrativo, Escola Sec. Júlio Dantas (Lagos), 2006–07, 1200 h, 13 valores — certificado oficial (confere 12.º ano + qualificação nível 3/QNQ 4; formação prática 210 h). Curso nível 5 Contabilidade e Gestão, IEFP Portimão, 09/2025–30/09/2026 (a decorrer; sem certificado).',
  ia_idiomas = '["Português (materna)", "Inglês B2 ouvir/ler/falar, A2 escrita"]'::jsonb,
  ia_resumo_perfil = '39 anos, Frechas. ~10 anos em ambiente comercial no Algarve: 3,7 anos lojista (Phone House) e 6,7 anos backoffice no Bricomarché Lagos (faturação, notas de encomenda, stock, pós-venda, fornecedores) — experiência muito próxima da vaga, mas terminada há 7 anos. Depois 3,6 anos em cozinha de hotel e 3 anos sem registo. Reforço recente em contabilidade (IEFP). Compatível com reservas: continuidade, competências digitais e rigor a confirmar em entrevista.',
  ia_experiencia = '["Bricomarché Lagos — backoffice/escritório, 12/2012–09/2019: faturação e recibos, conferência de notas de encomenda, correção de erros de faturação, arquivo, stock físico vs sistema, apoio a vendedores, pós-venda, reclamações e devoluções, encomendas loja/online e fornecedores", "The Phone House Lagos — lojista, 04/2009–12/2012: venda de serviços e equipamentos, pagamentos, caixa e depósitos, encomendas", "Hotel Iberostar Lagos — pequenos-almoços/cozinha, 03/2019–10/2022 (sem relevância; sobrepõe 5 meses com o Bricomarché)"]'::jsonb,
  ia_competencias_tec = '["Faturação e documentos comerciais", "Gestão de encomendas e stock", "Atendimento e pós-venda", "Caixa e depósitos bancários", "Arquivo físico e digital", "Noções de SNC/fiscalidade (curso em curso)", "Software de gestão/Excel: NÃO declarado — verificar"]'::jsonb,
  ia_competencias_trans = '["Permanência longa nos empregos", "Atendimento ao público", "Trabalho com dinheiro", "Comunicação oral", "Organização (afirmada, não demonstrada no CV)"]'::jsonb,
  ia_pontos_fortes = '["6,7 anos de backoffice comercial em loja de materiais de construção — quase a realidade da Obrajusta", "Formação de base adequada e comprovada por certificado (13 valores)", "Reforço recente em contabilidade/fiscalidade", "Estabilidade: 3,7 / 6,7 / 3,6 anos por empregador", "Experiência com caixa e depósitos — confiança já testada"]'::jsonb,
  ia_pontos_atencao = '["CV diverge do certificado: estágio 500 h (CV) vs 210 h (certificado); nível 4 (CV) vs nível 3 (certificado)", "Datas sobrepostas Bricomarché/Iberostar (03–09/2019); saída de escritório para cozinha sem explicação", "Hiatos sem registo: 07/2007–04/2009 e 11/2022–09/2025", "Curso IEFP em Portimão termina 30/09/2026 com estágio de 500 h — disponibilidade real?", "Mudança Algarve → Frechas: raízes ou passagem?", "Descuido no CV (About me por preencher, gralhas) vs atenção ao detalhe afirmada", "Descrição do Bricomarché com aspeto de texto gerado — confirmar com casos concretos", "Zero competências de software declaradas (Excel, ERP, faturação)", "Carta de condução não indicada"]'::jsonb,
  ia_adequacao_vaga = 'Compatível com reservas',
  ia_justificacao = 'O núcleo da experiência (backoffice comercial em loja de materiais) é raro e é o que a vaga pede. Riscos: 7 anos afastada da função, dois hiatos, mudança de região, competências digitais não demonstradas e CV com incoerências. Nenhum é eliminatório; todos são verificáveis em entrevista (guião: circuito de encomenda, erro de faturação real, programa usado, Excel/teste prático, explicar 500 h vs 210 h, e-mail escrito na hora, 2022–25, ponto do curso e data de início, porquê Frechas, carta, salário).'
from public.empresas e
where c.empresa_id = e.id and e.nome ilike 'Obrajusta II%'
  and c.nome = 'Ana Rita Rebeca Pereira';
-- devolve 1 linha se atualizou
select nome, estado, ia_adequacao_vaga, ia_processado_em from public.rh_candidatos where nome = 'Ana Rita Rebeca Pereira';
