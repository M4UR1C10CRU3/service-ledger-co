-- =============================================================================
-- Fechar a escalada de privilegios antes de existirem contas externas
--
-- Estado encontrado:
--   liberty_utilizador_empresas  INSERT  -> qualquer autenticado
--   liberty_utilizadores         INSERT  -> qualquer autenticado
--   liberty_utilizadores         UPDATE  -> qualquer autenticado
--   liberty_utilizadores         DELETE  -> qualquer autenticado
--
-- Enquanto so existiram contas de pessoal interno isto foi um risco latente.
-- A partir do momento em que um formando tem conta, e um caminho de duas
-- linhas de SQL entre o Portal do Aluno e o acesso total: inserir-se a si
-- proprio em liberty_utilizador_empresas dá-lhe as 104 tabelas da empresa;
-- mudar o proprio perfil em liberty_utilizadores dá-lhe administrador.
--
-- A regra nova exige ser utilizador interno — ter ja pelo menos uma empresa
-- atribuida. Quem e interno mantem exactamente o que podia fazer; quem vem do
-- portal deixa de poder escrever nestas tabelas. Nenhuma regressao.
--
-- Apertar mais (so administradores) e possivel e recomendavel, mas mudaria o
-- que os perfis gestor/operacional podem fazer hoje, por isso fica em aberto.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- liberty_utilizador_empresas — a ligacao que concede acesso a uma empresa.
-- E esta a linha que vale tudo: quem a consegue escrever, concede-se acesso.
-- -----------------------------------------------------------------------------
drop policy if exists "Authenticated users can insert liberty_utilizador_empresas"
  on public.liberty_utilizador_empresas;

do $$
begin
  if not exists (
    select 1 from pg_policy
    where polrelid = 'public.liberty_utilizador_empresas'::regclass
      and polname  = 'lue_escrita_interna'
  ) then
    create policy lue_escrita_interna on public.liberty_utilizador_empresas
      for insert to authenticated
      with check (public.e_utilizador_interno());
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- liberty_utilizadores — o perfil que define o que cada um pode fazer.
-- -----------------------------------------------------------------------------
drop policy if exists "Authenticated users can insert liberty_utilizadores" on public.liberty_utilizadores;
drop policy if exists "Authenticated users can update liberty_utilizadores" on public.liberty_utilizadores;
drop policy if exists "Authenticated users can delete liberty_utilizadores" on public.liberty_utilizadores;

do $$
begin
  if not exists (select 1 from pg_policy where polrelid='public.liberty_utilizadores'::regclass and polname='lu_insert_interno') then
    create policy lu_insert_interno on public.liberty_utilizadores
      for insert to authenticated with check (public.e_utilizador_interno());
  end if;

  if not exists (select 1 from pg_policy where polrelid='public.liberty_utilizadores'::regclass and polname='lu_update_interno') then
    create policy lu_update_interno on public.liberty_utilizadores
      for update to authenticated
      using (public.e_utilizador_interno())
      with check (public.e_utilizador_interno());
  end if;

  if not exists (select 1 from pg_policy where polrelid='public.liberty_utilizadores'::regclass and polname='lu_delete_interno') then
    create policy lu_delete_interno on public.liberty_utilizadores
      for delete to authenticated using (public.e_utilizador_interno());
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- O registo de acesso continua a ter de funcionar.
--
-- O PermissionsContext carimba ultimo_acesso na propria linha ao entrar. Com a
-- regra acima isso mantem-se para o pessoal interno; para o utilizador de
-- portal, que nao tem linha nenhuma em liberty_utilizadores, nao se aplica.
-- Fica aqui dito para ninguem estranhar a ausencia.
-- -----------------------------------------------------------------------------
