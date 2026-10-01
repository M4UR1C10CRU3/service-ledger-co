-- O título do responsável técnico no certificado passa a variar com o curso:
-- a modalidade registada no conselho que credencia a norma (NR-10 → Eletrotécnica),
-- ou o título genérico (cert_rt_titulo, p.ex. «Técnico Industrial») quando nenhuma se aplica.
-- Para isso a empresa aponta para a ficha de instrutor do responsável técnico.
alter table public.empresas
  add column if not exists cert_rt_docente_id uuid references public.school_docentes(id) on delete set null;
comment on column public.empresas.cert_rt_docente_id is 'Ficha de instrutor do responsável técnico; as formações registadas no conselho dão o título por curso.';
