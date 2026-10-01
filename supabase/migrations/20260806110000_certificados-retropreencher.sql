-- =============================================================================
-- Retro-preenchimento dos certificados já emitidos + ligação das assinaturas
--
-- Os 60 certificados do ITC existiam só como chaves estrangeiras. Passam a ter
-- o instantâneo preenchido a partir das tabelas ligadas, que é o mais fiel que
-- se consegue hoje: para os antigos é uma reconstrução, para os novos passa a
-- ser gravado no momento da emissão.
--
-- Não sobrepõe nada: só escreve onde está vazio.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Assinaturas. Os cinco PNGs já estavam na aplicação mas nenhuma linha lhes
--    apontava, por isso os certificados saíam sem assinatura nenhuma.
--    Só ligamos os três em que a correspondência com o nome é inequívoca.
-- -----------------------------------------------------------------------------
update public.empresas
set assinatura_diretor_path = '/assets/certificado/itc/sig-renevaldo-cavalcante.png'
where id = 'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b'
  and assinatura_diretor_path is null;

update public.school_docentes d
set assinatura_path = v.caminho
from (values
  ('Eder Barbosa da Costa',        '/assets/certificado/itc/sig-eder-barbosa.png'),
  ('Marcos Ferreira da Silva',     '/assets/certificado/itc/sig-marcos-ferreira.png'),
  ('Renevaldo Machado Cavalcante', '/assets/certificado/itc/sig-renevaldo-cavalcante.png')
) as v(nome, caminho)
where d.empresa_id = 'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b'
  and d.nome = v.nome
  and d.assinatura_path is null;

-- -----------------------------------------------------------------------------
-- 2) Instantâneo dos certificados já emitidos
-- -----------------------------------------------------------------------------
update public.school_certificados c set
  aluno_nome       = coalesce(c.aluno_nome,       s.aluno_nome),
  aluno_cpf        = coalesce(c.aluno_cpf,        s.aluno_cpf),
  curso_id         = coalesce(c.curso_id,         s.curso_id),
  curso_nome       = coalesce(c.curso_nome,       s.curso_nome),
  curso_categoria  = coalesce(c.curso_categoria,  s.curso_categoria),
  carga_horaria    = coalesce(c.carga_horaria,    s.carga_horaria),
  horas_teoricas   = coalesce(c.horas_teoricas,   s.horas_teoricas),
  horas_praticas   = coalesce(c.horas_praticas,   s.horas_praticas),
  modulos_json     = coalesce(c.modulos_json,     s.conteudo_programatico),
  objetivo         = coalesce(c.objetivo,         s.objetivo),
  metodologia      = coalesce(c.metodologia,      s.metodologia),
  reconhecimento   = coalesce(c.reconhecimento,   s.reconhecimento),
  aprovacao_minima = coalesce(c.aprovacao_minima, s.aprovacao_minima),
  validade_meses   = coalesce(c.validade_meses,   s.validade_meses),
  docente_nome     = coalesce(c.docente_nome,     s.docente_nome),
  diretor_nome     = coalesce(c.diretor_nome,     s.nome_diretor),
  diretor_cargo    = coalesce(c.diretor_cargo,    s.cert_cargo_diretor),
  empresa_nome     = coalesce(c.empresa_nome,     s.empresa_nome),
  local_aplicacao  = coalesce(c.local_aplicacao,  s.empresa_aplicacao),
  data_inicio      = coalesce(c.data_inicio,      s.inicio),
  data_conclusao   = coalesce(c.data_conclusao,   s.fim),
  -- A validade dos 56 migrados nunca foi calculada. Conta-se a partir da
  -- conclusão da turma, que é a regra do curso, e não da data de emissão.
  validade_em      = coalesce(
                       c.validade_em,
                       c.validade,
                       (coalesce(s.fim, c.emitido_em::date) + (s.validade_meses || ' months')::interval)::date
                     )
from (
  select
    c2.id,
    al.nome  as aluno_nome,
    al.cpf   as aluno_cpf,
    t.curso_id,
    t.inicio, t.fim, t.empresa_aplicacao,
    cu.nome  as curso_nome,
    cu.categoria as curso_categoria,
    cu.carga_horaria, cu.horas_teoricas, cu.horas_praticas,
    cu.conteudo_programatico, cu.objetivo, cu.metodologia, cu.reconhecimento,
    cu.aprovacao_minima, cu.validade_meses,
    d.nome   as docente_nome,
    e.nome   as empresa_nome,
    e.nome_diretor, e.cert_cargo_diretor
  from public.school_certificados c2
  left join public.school_alunos   al on al.id = c2.aluno_id
  left join public.school_turmas   t  on t.id  = c2.turma_id
  left join public.school_cursos   cu on cu.id = t.curso_id
  left join public.school_docentes d  on d.id  = coalesce(c2.docente_id, t.docente_id)
  left join public.empresas        e  on e.id  = c2.empresa_id
) s
where s.id = c.id;

-- -----------------------------------------------------------------------------
-- 3) Sequencial: o contador começa acima do que já foi emitido este ano, para
--    a numeração interna não recomeçar do um.
-- -----------------------------------------------------------------------------
insert into public.school_certificados_seq (empresa_id, ano, ultimo_seq)
select c.empresa_id, extract(year from c.emitido_em)::int, count(*)
from public.school_certificados c
group by c.empresa_id, extract(year from c.emitido_em)::int
on conflict (empresa_id, ano) do update
  set ultimo_seq = greatest(public.school_certificados_seq.ultimo_seq, excluded.ultimo_seq);
