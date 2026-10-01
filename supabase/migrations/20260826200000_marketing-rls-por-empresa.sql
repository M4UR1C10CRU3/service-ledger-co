-- =============================================================================
-- MARKETING — isolamento por empresa
--
-- As politicas destas 9 tabelas sao `USING (true)`: qualquer utilizador
-- autenticado le e escreve o conteudo de qualquer empresa. Ate hoje isso era
-- contido por duas coisas fracas — o codigo filtrar por empresa_id, e o modulo
-- so estar aberto a duas empresas do MESMO grupo.
--
-- Vai abrir-se o modulo ao vertical Agency (Elo Giro), que e uma empresa
-- ISOLADA. Sem esta correcao, o conteudo, os briefings e os anexos da Tudo Casa
-- ficavam ao alcance de quem chamasse a API com o seu proprio token.
--
-- Nao muda comportamento nenhum para quem ja usa: o codigo ja filtra por
-- empresa, portanto a aplicacao continua a mostrar exactamente o mesmo. O que
-- muda e que passa a ser a BASE a garanti-lo, e nao a boa vontade do codigo.
--
-- Migracao ADITIVA no sentido em que nao apaga dados: so troca politicas.
-- =============================================================================

-- As tabelas todas tem empresa_id NOT NULL — confirmado uma a uma.
do $$
declare
  t text;
  p record;
  tabelas text[] := array[
    'marketing_tarefas',
    'marketing_anexos',
    'marketing_comentarios',
    'marketing_tarefa_checklist',
    'marketing_tarefa_etapa_historico',
    'marketing_tarefa_notificacoes',
    'marketing_tarefa_responsaveis',
    'marketing_editorial_posts',
    'marketing_editorial_entregas'
  ];
begin
  foreach t in array tabelas loop
    -- Se a tabela nao existir neste ambiente, seguir em frente sem rebentar.
    if to_regclass('public.' || t) is null then
      raise notice 'ignorada (nao existe): %', t;
      continue;
    end if;

    execute format('alter table public.%I enable row level security', t);

    -- Apagar TODAS as politicas existentes da tabela. Deixar uma que fosse
    -- para tras chegava para manter o buraco aberto: as politicas somam-se,
    -- basta uma permissiva para dar acesso.
    for p in
      select policyname from pg_policies
       where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy if exists %I on public.%I', p.policyname, t);
    end loop;

    -- Uma politica so, com USING e WITH CHECK. O WITH CHECK e o que impede
    -- INSERIR na empresa de outrem — o School tinha so USING e ficou com essa
    -- porta aberta.
    execute format($f$
      create policy %I on public.%I
        for all
        using ((select public.user_has_empresa_access(empresa_id)))
        with check ((select public.user_has_empresa_access(empresa_id)))
    $f$, t || '_empresa', t);

    raise notice 'isolada por empresa: %', t;
  end loop;
end $$;
