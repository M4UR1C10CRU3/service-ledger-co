-- =============================================================================
-- DADOS DE DEMONSTRACAO — segunda parte
--
-- Enche o que ficou por preencher, para os ecras nao terem tracos por todo o
-- lado quando o sistema for mostrado. Continua a nao sobrepor nada existente.
--
-- Telefones no formato do Amapa (DDD 96). CPF e CNPJ ja estavam preenchidos.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Alunos — telefone e data de nascimento
-- -----------------------------------------------------------------------------
update public.school_alunos a set
  telefone = coalesce(a.telefone, '(96) 9' || lpad(((abs(hashtext(a.id::text)) % 9000) + 1000)::text, 4, '0')
                                  || '-' || lpad(((abs(hashtext(a.nome)) % 9000) + 1000)::text, 4, '0')),
  data_nascimento = coalesce(a.data_nascimento,
    ('1980-01-01'::date + ((abs(hashtext(a.id::text)) % 6570))::int))
where a.empresa_id = 'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b';

-- -----------------------------------------------------------------------------
-- 2) Instrutores — telefone
--
--    A ASSINATURA fica de fora de proposito. So existem cinco assinaturas
--    digitalizadas e sao de pessoas concretas; pôr a assinatura do Fabio por
--    baixo do nome do Carlos seria fabricar um documento assinado por quem nao
--    o assinou. Os 11 restantes emitem com a linha e o nome ate as suas
--    proprias assinaturas serem carregadas.
-- -----------------------------------------------------------------------------
update public.school_docentes d set
  telefone = coalesce(d.telefone, '(96) 9' || lpad(((abs(hashtext(d.id::text)) % 9000) + 1000)::text, 4, '0')
                                  || '-' || lpad(((abs(hashtext(d.nome)) % 9000) + 1000)::text, 4, '0')),
  resumo = coalesce(d.resumo,
    'Instrutor com experiência em ' || coalesce(d.area_especializacao, 'segurança do trabalho') ||
    '. Atua em formação prática e teórica nas normas regulamentadoras aplicáveis.')
where d.empresa_id = 'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b';

-- -----------------------------------------------------------------------------
-- 3) Cursos — sigla do certificado
--
--    A sigla entra na codificacao e na organizacao do arquivo. Derivada da
--    norma que cada curso serve.
-- -----------------------------------------------------------------------------
update public.school_cursos c set sigla_certificado = v.sigla
from (values
  ('Supervisor de Trabalho em Altura%',   'NR35SUP'),
  ('Trabalhador Autorizado em Altura%',   'NR35TA'),
  ('Resgate em Altura%',                  'NR35RES'),
  ('Eletricista de Alta e Baixa%',        'NR10'),
  ('Agente de Portaria%',                 'NR16'),
  ('Assentador Cer%',                     'NR18AC'),
  ('Pedreiro de Alvenaria%',              'NR8PA'),
  ('Instalador Hidr%',                    'NR8IH'),
  ('Operador de Ro%',                     'NR12'),
  ('Bombeiro Civil%',                     'BCR'),
  ('Refrigera%',                          'REFRI'),
  ('Assistente Administrativo%',          'ADM')
) as v(padrao, sigla)
where c.empresa_id = 'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b'
  and c.nome like v.padrao
  and (c.sigla_certificado is null or c.sigla_certificado = '');

-- Reconhecimento e metodologia onde faltarem, para o verso do certificado
-- nunca sair com o texto genérico de reserva.
update public.school_cursos set
  reconhecimento = coalesce(reconhecimento,
    'Certificado reconhecido pelo Conselho Estadual de Educação do Amapá (CEE-AP), em conformidade com as Normas Regulamentadoras do Ministério do Trabalho e Emprego.'),
  metodologia = coalesce(metodologia,
    'Aulas teóricas com suporte audiovisual, demonstrações práticas supervisionadas e avaliação de desempenho individual. Certificado emitido após aprovação na nota mínima exigida.'),
  objetivo = coalesce(objetivo,
    'Capacitar o participante para o exercício seguro da atividade, conforme os requisitos legais e as boas práticas do setor.'),
  aprovacao_minima = coalesce(aprovacao_minima, 70),
  validade_meses = coalesce(validade_meses, 24)
where empresa_id = 'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b';

-- -----------------------------------------------------------------------------
-- 4) Turmas — vagas
-- -----------------------------------------------------------------------------
update public.school_turmas set vagas = coalesce(vagas, 16)
where empresa_id = 'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b';

-- -----------------------------------------------------------------------------
-- 5) Clientes corporativos — responsavel, cargo e contactos
-- -----------------------------------------------------------------------------
with nomes as (
  select id, nome,
         (array['Ana Paula Ribeiro','Carlos Eduardo Lima','Fernanda Souza Alves','Marcelo Tavares',
                'Juliana Nunes Prado','Roberto Carvalho','Patrícia Gomes Freitas','Anderson Melo',
                'Camila Duarte','Rafael Andrade'])[((abs(hashtext(id::text)) % 10) + 1)] resp,
         (array['Coordenador de SESMT','Gerente de RH','Técnico de Segurança do Trabalho',
                'Supervisor de Operações','Analista de Treinamento'])[((abs(hashtext(nome)) % 5) + 1)] cargo
  from public.school_clientes_corp
  where empresa_id = 'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b'
)
update public.school_clientes_corp c set
  responsavel = coalesce(c.responsavel, n.resp),
  cargo_responsavel = coalesce(c.cargo_responsavel, n.cargo),
  telefone = coalesce(c.telefone, '(96) 3' || lpad(((abs(hashtext(c.id::text)) % 900) + 100)::text, 3, '0')
                                  || '-' || lpad(((abs(hashtext(c.nome)) % 9000) + 1000)::text, 4, '0')),
  email = coalesce(c.email,
    'contato.' || left(regexp_replace(lower(translate(c.nome,
      'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
      'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')), '[^a-z]', '', 'g'), 14)
    || '@demo.itctreinamentos.com')
from nomes n where n.id = c.id;

-- Um contacto com acesso ao portal para cada cliente que ainda nao tenha
insert into public.school_corp_contactos (empresa_id, cliente_id, nome, email, cargo)
select c.empresa_id, c.id, c.responsavel,
       'rh.' || left(regexp_replace(lower(translate(c.nome,
         'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
         'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')), '[^a-z]', '', 'g'), 14)
       || '@demo.itctreinamentos.com',
       c.cargo_responsavel
from public.school_clientes_corp c
where c.empresa_id = 'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b'
  and c.responsavel is not null
  and not exists (select 1 from public.school_corp_contactos cc where cc.cliente_id = c.id)
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- 6) Contratos para os clientes que tem formandos
-- -----------------------------------------------------------------------------
insert into public.school_contratos_corp (empresa_id, cliente_id, descricao, valor_total, inicio, fim, status, observacao)
select distinct a.empresa_id, a.cliente_corp_id,
       'Formação NR 35 — contrato anual',
       8500 + (abs(hashtext(a.cliente_corp_id::text)) % 12) * 500,
       '2026-01-01'::date, '2026-12-31'::date, 'ativo',
       'Contrato anual de formação — inclui reciclagem bienal e emissão de certificados.'
from public.school_alunos a
where a.empresa_id = 'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b'
  and a.cliente_corp_id is not null
  and not exists (
    select 1 from public.school_contratos_corp k where k.cliente_id = a.cliente_corp_id
  );
