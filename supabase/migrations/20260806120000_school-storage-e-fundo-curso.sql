-- =============================================================================
-- Storage do Clariza School + fotografia de fundo por curso
--
-- Achado ao ligar as assinaturas: os buckets school-documentos e school-files
-- NAO tinham nenhuma politica. Com RLS ligada e sem politica, o Storage nega
-- tudo — por isso nenhum docente tinha assinatura carregada e nenhum material
-- foi alguma vez guardado. Ninguem deu por isso porque o codigo tratava o erro
-- de upload como um caso silencioso.
--
-- Aditiva: cria politicas onde nao havia nenhuma.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) school-documentos (privado) — assinaturas, diplomas e CV dos docentes.
--    Primeiro segmento do caminho = empresa_id.
-- -----------------------------------------------------------------------------
do $$
declare
  b text;
  op record;
begin
  foreach b in array array['school-documentos', 'school-files'] loop
    for op in
      select * from (values
        ('select', 'r'), ('insert', 'a'), ('update', 'w'), ('delete', 'd')
      ) as t(nome, cmd)
    loop
      if not exists (
        select 1 from pg_policy
        where polrelid = 'storage.objects'::regclass
          and polname  = format('%s_%s', replace(b, '-', '_'), op.nome)
      ) then
        execute format($f$
          create policy %I on storage.objects for %s to authenticated
          %s (
            bucket_id = %L
            and public.user_has_empresa_access(((storage.foldername(name))[1])::uuid)
          )
        $f$,
          format('%s_%s', replace(b, '-', '_'), op.nome),
          op.nome,
          case when op.nome = 'insert' then 'with check' else 'using' end,
          b
        );
      end if;
    end loop;
  end loop;
end $$;

-- school-files e publico: a leitura anonima e precisa para as imagens
-- aparecerem no certificado sem sessao iniciada.
do $$
begin
  if not exists (
    select 1 from pg_policy
    where polrelid = 'storage.objects'::regclass
      and polname  = 'school_files_publico'
  ) then
    create policy school_files_publico on storage.objects for select to anon
      using (bucket_id = 'school-files');
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 2) Fotografia de fundo do curso
--    Reutiliza school_cursos.template_cert_path, que ja existia sem uso.
--    Aceita um caminho do Storage (carregado pelo utilizador) ou um caminho
--    servido pela aplicacao — a mesma regra das assinaturas.
-- -----------------------------------------------------------------------------
comment on column public.school_cursos.template_cert_path is
  'Fotografia de fundo impressa como marca de agua no certificado deste curso. Caminho no bucket school-files, ou caminho absoluto servido pela app.';

update public.school_cursos
set template_cert_path = '/assets/certificado/itc/bg-altura.png'
where empresa_id = 'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b'
  and template_cert_path is null
  and nome ilike '%altura%';
