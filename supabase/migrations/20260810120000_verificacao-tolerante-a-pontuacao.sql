-- ═══════════════════════════════════════════════════════════════════════════
-- Verificação de certificado: ignorar a pontuação do código
--
-- O código é lido de um papel e escrito à mão por alguém que não o conhece —
-- a empresa que contratou a formação, um auditor, um fiscal. Escrever
-- "ITC 2026 K7CTAC" com espaços em vez de travessões é o erro natural, e
-- devolvia "Certificado não encontrado" para um certificado que existe e é
-- válido. Numa página cuja única função é provar autenticidade, dizer que não
-- existe é o pior resultado possível.
--
-- A comparação passa a ignorar tudo o que não seja letra ou dígito, dos dois
-- lados. Confirmado antes de aplicar que nenhum par de certificados fica
-- ambíguo com esta regra (zero colisões em toda a tabela).
--
-- O resto da função fica igual — só muda a linha da correspondência.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.school_verificar_certificado(p_codigo text)
returns table(
  codigo text, valido boolean, vencido boolean, cancelado boolean,
  aluno_nome text, aluno_cpf text, curso_nome text, carga_horaria integer,
  reconhecimento text, docente_nome text, data_inicio date, data_conclusao date,
  emitido_em date, validade_em date, emissor_nome text, local_aplicacao text
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with alvo as (
    select c.*
    from public.school_certificados c
    where upper(regexp_replace(c.codigo, '[^a-zA-Z0-9]', '', 'g')) =
          upper(regexp_replace(coalesce(p_codigo, ''), '[^a-zA-Z0-9]', '', 'g'))
    limit 1
  )
  select
    a.codigo,
    a.status = 'emitido'
      and (a.validade_em is null or a.validade_em >= current_date)              as valido,
    a.validade_em is not null and a.validade_em < current_date                  as vencido,
    a.status = 'cancelado'                                                      as cancelado,
    coalesce(a.aluno_nome, al.nome)                                             as aluno_nome,
    -- CPF mascarado: chega para o titular se reconhecer, nao chega para copiar.
    case
      when length(regexp_replace(coalesce(a.aluno_cpf, al.cpf, ''), '\D', '', 'g')) = 11
      then substr(regexp_replace(coalesce(a.aluno_cpf, al.cpf), '\D', '', 'g'), 1, 3)
           || '.***.***-'
           || substr(regexp_replace(coalesce(a.aluno_cpf, al.cpf), '\D', '', 'g'), 10, 2)
      else null
    end                                                                         as aluno_cpf,
    coalesce(a.curso_nome, cu.nome)                                             as curso_nome,
    coalesce(a.carga_horaria, cu.carga_horaria)                                 as carga_horaria,
    coalesce(a.reconhecimento, cu.reconhecimento)                               as reconhecimento,
    coalesce(a.docente_nome, d.nome)                                            as docente_nome,
    coalesce(a.data_inicio, t.inicio)                                           as data_inicio,
    coalesce(a.data_conclusao, t.fim)                                           as data_conclusao,
    a.emitido_em::date                                                          as emitido_em,
    coalesce(a.validade_em, a.validade)                                         as validade_em,
    coalesce(a.empresa_nome, e.nome)                                            as emissor_nome,
    coalesce(a.local_aplicacao, t.empresa_aplicacao)                            as local_aplicacao
  from alvo a
  left join public.school_alunos   al on al.id = a.aluno_id
  left join public.school_turmas   t  on t.id  = a.turma_id
  left join public.school_cursos   cu on cu.id = coalesce(a.curso_id, t.curso_id)
  left join public.school_docentes d  on d.id  = coalesce(a.docente_id, t.docente_id)
  left join public.empresas        e  on e.id  = a.empresa_id
$function$;
