-- =============================================================================
-- Verticais com entrada propria
--
-- O Clariza School (ITC) nao e uma empresa do grupo como as outras: e um
-- produto a parte, com o seu proprio publico — secretaria, instrutores,
-- formandos e empresas clientes. Nao faz sentido aparecer numa lista ao lado
-- da Obrajusta, da Tudo Casa e da Resiserv, nem que quem procura a escola
-- tenha de passar por essa lista para lá chegar.
--
-- A coluna `vertical` marca essas empresas. Quem a tiver preenchida sai do
-- seletor geral e passa a ter ecra de entrada proprio, com a sua identidade.
--
-- Aditiva: nao altera nada para as empresas que ficam sem vertical.
-- =============================================================================

alter table public.empresas
  add column if not exists vertical text;

comment on column public.empresas.vertical is
  'Produto a que esta empresa pertence quando nao e uma empresa do grupo comum. Ex.: school. Empresas com vertical nao aparecem no seletor geral e entram pelo seu proprio ecra.';

update public.empresas set vertical = 'school'
where id = 'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b' and vertical is null;
