-- =============================================================================
-- CERTIFICADO — responsabilidade tecnica no rosto
--
-- O TRT (Termo de Responsabilidade Tecnica, Lei 13.639/2018) e o que faz do
-- ITC uma escola com responsavel tecnico registado, e nao apenas alguem que da
-- formacao. E a primeira coisa que o SESMT de um cliente procura quando recebe
-- o certificado de um colaborador.
--
-- Fica em colunas da EMPRESA, nao escrito no codigo: cada escola tem o seu
-- responsavel, o seu conselho e o seu TRT, e o do ITC caduca a 24/12/2026.
--
-- Migracao ADITIVA: so acrescenta colunas e preenche as do ITC.
-- =============================================================================

alter table public.empresas
  add column if not exists cert_rt_nome      text,
  add column if not exists cert_rt_titulo    text,
  add column if not exists cert_rt_conselho  text,
  add column if not exists cert_rt_registo   text,
  add column if not exists cert_trt_numero   text,
  add column if not exists cert_trt_validade date,
  add column if not exists cert_trt_nrs      text[];

comment on column public.empresas.cert_rt_nome is
  'Responsavel tecnico da escola. Aparece no rosto do certificado.';
comment on column public.empresas.cert_rt_conselho is
  'Conselho e regiao onde esta registado. Ex.: CRT-02.';
comment on column public.empresas.cert_trt_validade is
  'Fim da vigencia do TRT. Depois desta data o numero do TRT DEIXA de ser impresso — um certificado nao pode invocar um termo caducado.';
comment on column public.empresas.cert_trt_nrs is
  'NR cobertas pelo TRT, em codigo canonico (NR-01, NR-10-SEP, ...). Um curso cuja NR nao esteja aqui imprime o responsavel tecnico mas NAO o numero do TRT.';

-- -----------------------------------------------------------------------------
-- ITC — dados do TRT n.o CFT2605411510, registado a 23/01/2026
--
-- As 18 NR do campo "Observacoes" do termo, mais as duas formacoes que nao sao
-- NR. No documento a lista vem fora de ordem numerica (a NR-22 aparece depois
-- da NR-30); aqui fica normalizada, para poder ser comparada.
-- -----------------------------------------------------------------------------
update public.empresas set
  cert_rt_nome      = coalesce(cert_rt_nome, 'Renevaldo Machado Cavalcante'),
  cert_rt_titulo    = coalesce(cert_rt_titulo, 'Técnico em Eletrotécnica'),
  cert_rt_conselho  = coalesce(cert_rt_conselho, 'CRT-02'),
  cert_rt_registo   = coalesce(cert_rt_registo, '51061562204'),
  cert_trt_numero   = coalesce(cert_trt_numero, 'CFT2605411510'),
  cert_trt_validade = coalesce(cert_trt_validade, date '2026-12-24'),
  cert_trt_nrs      = coalesce(cert_trt_nrs, array[
    'NR-01','NR-05','NR-06','NR-10','NR-10-SEP','NR-11','NR-12','NR-13',
    'NR-20','NR-22','NR-23','NR-29','NR-30','NR-33','NR-34','NR-35',
    'NR-37','NR-38','DIRECAO-DEFENSIVA','PRIMEIROS-SOCORROS'
  ])
where slug in ('itc', 'itc-educa-pro');
