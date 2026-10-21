-- ═══════════════════════════════════════════════════════════════════════════
-- André Tiago aparece como «Cristiana Batista» — 21/10/2026
-- Correr no Supabase › SQL Editor, UM BLOCO DE CADA VEZ (selecionar e Run).
--
-- Causa: a conta comercial4@lojatudocasa.com foi da Cristiana Batista (até 26/08,
-- quando ela passou para administrativo@). Mudar o nome na página Utilizadores
-- só altera a FICHA (liberty_utilizadores); o PERFIL (profiles.nome) e os
-- metadados da conta (auth.users) ficam com o nome de quem a criou, e era daí
-- que o topo da aplicação e a saudação tiravam o nome.
-- ═══════════════════════════════════════════════════════════════════════════


-- ── BLOCO 1 — DIAGNÓSTICO (só leitura) ───────────────────────────────────────
-- Onde está o André, e com que conta. Se «nome_perfil» ou «nome_conta» disser
-- «Cristiana Batista», é este o problema. Se «ultimo_acesso» estiver vazio, o
-- André nunca entrou com a conta dele: estava na sessão da Cristiana, que ficou
-- aberta nesse computador (ver a nota no fim).
select lu.nome                              as nome_ficha,
       p.nome                               as nome_perfil,
       au.raw_user_meta_data->>'nome'       as nome_conta,
       au.email,
       au.created_at                        as conta_criada,
       au.last_sign_in_at                   as ultimo_acesso,
       lu.ativo,
       lu.auth_user_id
from public.liberty_utilizadores lu
join auth.users au      on au.id = lu.auth_user_id
left join public.profiles p on p.id = lu.auth_user_id
where lu.nome ilike '%andr%tiago%'
   or lu.nome ilike '%cristiana%'
   or au.email ilike 'comercial4@%'
order by au.created_at;


-- ── BLOCO 2B — CORREÇÃO PELA CONTA (usar ESTE; 21/10) ─────────────────────────
-- O bloco 2 falhou («encontrei 0»): o nome na ficha não é igual carácter a
-- carácter a 'André Tiago' (espaço invisível ou «é» decomposto). Este identifica
-- pela conta comercial4@ e copia para o perfil e para a conta o nome DA FICHA,
-- limpo (sem espaços nas pontas e com os acentos normalizados). Limpa também a
-- própria ficha, para comparações futuras darem certo.
do $$
declare
  v_auth uuid;
  v_nome text;
  v_n    int;
begin
  select count(*) into v_n
  from public.liberty_utilizadores lu
  join auth.users au on au.id = lu.auth_user_id
  where lower(au.email) = 'comercial4@lojatudocasa.com'
    and coalesce(lu.eliminado, false) = false;
  if v_n <> 1 then
    raise exception 'Esperava 1 ficha na conta comercial4@, encontrei %. Nada foi alterado.', v_n;
  end if;

  select lu.auth_user_id, btrim(normalize(lu.nome, NFC), E' \t\r\n ')
    into v_auth, v_nome
  from public.liberty_utilizadores lu
  join auth.users au on au.id = lu.auth_user_id
  where lower(au.email) = 'comercial4@lojatudocasa.com'
    and coalesce(lu.eliminado, false) = false;

  update public.liberty_utilizadores set nome = v_nome where auth_user_id = v_auth;
  update public.profiles             set nome = v_nome where id = v_auth;
  update auth.users
     set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
                              || jsonb_build_object('nome', v_nome)
   where id = v_auth;

  raise notice 'Conta % passou a «%»', v_auth, v_nome;
end $$;

-- Confirmação (só leitura): as três colunas de nome devem dizer o mesmo.
select lu.nome as nome_ficha, p.nome as nome_perfil, au.raw_user_meta_data->>'nome' as nome_conta, au.email
from public.liberty_utilizadores lu
join auth.users au on au.id = lu.auth_user_id
left join public.profiles p on p.id = lu.auth_user_id
where lower(au.email) = 'comercial4@lojatudocasa.com';


-- ── BLOCO 2 — CORREÇÃO do André POR NOME (falhou a 21/10 — usar o 2B) ─────────
-- Põe o nome da ficha «André Tiago» no perfil e nos metadados da conta dele.
-- Para se houver mais de uma ficha com esse nome (não mexe em nada).
do $$
declare
  v_auth uuid;
  v_n    int;
begin
  select count(*) into v_n
  from public.liberty_utilizadores
  where nome = 'André Tiago' and coalesce(eliminado, false) = false;
  if v_n <> 1 then
    raise exception 'Esperava 1 ficha «André Tiago», encontrei %. Nada foi alterado.', v_n;
  end if;

  select auth_user_id into v_auth
  from public.liberty_utilizadores
  where nome = 'André Tiago' and coalesce(eliminado, false) = false;

  update public.profiles
     set nome = 'André Tiago'
   where id = v_auth;

  update auth.users
     set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
                              || jsonb_build_object('nome', 'André Tiago')
   where id = v_auth;

  raise notice 'Atualizado: conta %', v_auth;
end $$;


-- ── BLOCO 3 — OUTRAS CONTAS COM O MESMO PROBLEMA (só leitura) ─────────────────
-- Todas as contas ativas cujo perfil ou metadados não batem com a ficha.
-- Mostra-me o resultado antes de corrigir alguma delas.
select lu.nome                              as nome_ficha,
       p.nome                               as nome_perfil,
       au.raw_user_meta_data->>'nome'       as nome_conta,
       au.email,
       au.last_sign_in_at                   as ultimo_acesso
from public.liberty_utilizadores lu
join auth.users au      on au.id = lu.auth_user_id
left join public.profiles p on p.id = lu.auth_user_id
where coalesce(lu.eliminado, false) = false
  and (p.nome is distinct from lu.nome
       or (au.raw_user_meta_data->>'nome') is distinct from lu.nome)
order by au.last_sign_in_at desc nulls last;


-- NOTA — computadores partilhados na loja:
-- Ao abrir o Clariza com uma sessão já aberta, a aplicação entra direto na conta
-- de quem a deixou aberta. Quem muda de pessoa no mesmo computador deve carregar
-- sempre em «Terminar sessão» antes de entregar o posto.
