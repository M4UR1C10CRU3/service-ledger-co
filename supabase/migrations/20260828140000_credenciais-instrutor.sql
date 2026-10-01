-- =============================================================================
-- CREDENCIAIS DO INSTRUTOR — o documento colado a cada credencial
--
-- Ate agora os documentos do instrutor eram um monte so: curriculo, diplomas e
-- certificados na mesma lista, sem se saber a que credencial pertencia cada
-- um. Passam a organizar-se em tres:
--
--   registos profissionais  — conselho, numero E a carteira digitalizada
--   formacao academica      — a formacao E o diploma
--   formacoes complementares— os cursos, so as miniaturas
--
-- A diferenca entre as duas primeiras e de FACETA, nao de dados: "Tecnico em
-- Enfermagem" e a formacao academica; "COREN-AP 12345" e o registo dela. Sao a
-- mesma linha vista de dois angulos — por isso nao se duplica a tabela, ligam-
-- se dois documentos a` mesma entrada.
--
-- Migracao ADITIVA.
-- =============================================================================

alter table public.school_docentes_documentos
  add column if not exists docente_formacao_id uuid
    references public.school_docente_formacoes(id) on delete set null,
  add column if not exists papel text;

comment on column public.school_docentes_documentos.docente_formacao_id is
  'Formacao a que este documento pertence. NULL = documento solto (curriculo, formacao complementar).';
comment on column public.school_docentes_documentos.papel is
  'diploma | carteira | complementar | cv. Decide em que seccao da ficha aparece e o que se espera dele.';

create index if not exists school_docs_formacao_idx
  on public.school_docentes_documentos(docente_formacao_id)
  where docente_formacao_id is not null;

create index if not exists school_docs_papel_idx
  on public.school_docentes_documentos(docente_id, papel);

-- -----------------------------------------------------------------------------
-- Papel dos documentos que ja existem
--
--    Deriva-se do tipo que ja tinham. Ficam todos SOLTOS (sem formacao
--    associada) de proposito: adivinhar a que formacao pertence um diploma
--    seria inventar. Quem souber liga-os na ficha, um clique cada.
-- -----------------------------------------------------------------------------
update public.school_docentes_documentos
   set papel = case tipo_documento
         when 'diploma'       then 'diploma'
         when 'pos_graduacao' then 'diploma'
         when 'certificado'   then 'complementar'
         when 'cv'            then 'cv'
         else 'complementar'
       end
 where papel is null;
