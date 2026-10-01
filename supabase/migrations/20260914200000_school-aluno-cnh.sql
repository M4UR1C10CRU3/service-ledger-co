-- Direção Defensiva: o certificado tem de trazer o RENACH e a categoria da CNH do aluno.
-- Ficam na ficha do aluno; só se imprimem quando o curso é esse.
alter table public.school_alunos
  add column if not exists cnh_renach    text,
  add column if not exists cnh_categoria text;
comment on column public.school_alunos.cnh_renach    is 'N.º RENACH (Registro Nacional de Carteira de Habilitação). Obrigatório no certificado de Direção Defensiva.';
comment on column public.school_alunos.cnh_categoria is 'Categoria da CNH (A, B, AB, C, D, E, ACC…). Obrigatória no certificado de Direção Defensiva.';
