-- A ficha de matrícula envia nota_final desde sempre, mas a coluna nunca tinha sido aplicada na base
-- (estava no ficheiro de migração de junho, editado depois de correr). Sem ela a matrícula não gravava.
alter table public.school_matriculas add column if not exists nota_final numeric(5,2);
comment on column public.school_matriculas.nota_final is 'Nota final lançada na matrícula; o certificado usa-a quando não há avaliações em school_avaliacoes.';
