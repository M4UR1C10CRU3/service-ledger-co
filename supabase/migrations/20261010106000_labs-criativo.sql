-- ============================================================================
-- CLARIZA LABS · Estúdio Criativo — agenda de gravações e reservas
-- ----------------------------------------------------------------------------
-- O estúdio (a zona de gravação em Mirandela, também a do podcast «Zeros e
-- Uns») e o equipamento (câmaras, microfones, luzes, drone…) são poucos e
-- disputados. Uma reserva diz QUEM usa O QUÊ, QUANDO e PARA QUE trabalho.
--
--   lb_recursos  — o estúdio e cada peça de equipamento
--   lb_reservas  — uma reserva de um recurso, com início e fim, ligada (se
--                  houver) ao projeto/job que a justifica
--
-- Duas reservas do mesmo recurso não se podem sobrepor: um trigger recusa a
-- segunda. (Não se usa uma restrição EXCLUDE para não ter de instalar a
-- extensão btree_gist na base de dados de produção.)
--
-- Regras do Agency mantidas: empresa_id NOT NULL, RLS com USING e WITH CHECK,
-- FKs compostas, empresa_id imutável.
-- NÃO-DESTRUTIVO: só cria. Nenhum DROP, DELETE, TRUNCATE nem UPDATE.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lb_recursos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL CHECK (tipo IN ('estudio','camara','objetiva','audio','luz','drone','computador','outro')),
  nome        TEXT NOT NULL,              -- ex.: «Estúdio Mirandela», «Sony FX3», «Rode PodMic ×4»
  descricao   TEXT,
  ativo       BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, empresa_id)
);

CREATE TABLE IF NOT EXISTS public.lb_reservas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id        UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  recurso_id        UUID NOT NULL,
  inicio            TIMESTAMPTZ NOT NULL,
  fim               TIMESTAMPTZ NOT NULL,
  titulo            TEXT NOT NULL,         -- ex.: «Gravação EP.02 · Prof. Renne»
  projeto_id        UUID,
  job_id            UUID,
  cliente_nome      TEXT,
  responsavel_nome  TEXT,
  notas             TEXT,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (fim > inicio),
  FOREIGN KEY (recurso_id, empresa_id) REFERENCES public.lb_recursos (id, empresa_id),
  FOREIGN KEY (projeto_id, empresa_id) REFERENCES public.ag_projetos (id, empresa_id),
  FOREIGN KEY (job_id, empresa_id)     REFERENCES public.ag_jobs (id, empresa_id)
);

CREATE INDEX IF NOT EXISTS lb_reservas_agenda_idx ON public.lb_reservas (empresa_id, inicio);
CREATE INDEX IF NOT EXISTS lb_reservas_recurso_idx ON public.lb_reservas (recurso_id, inicio, fim);

-- Recusa reservas sobrepostas do mesmo recurso.
CREATE OR REPLACE FUNCTION public.lb_reserva_sem_sobreposicao()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  outra TEXT;
BEGIN
  SELECT r.titulo INTO outra FROM public.lb_reservas r
  WHERE r.recurso_id = NEW.recurso_id AND r.id <> NEW.id
    AND r.inicio < NEW.fim AND NEW.inicio < r.fim
  LIMIT 1;
  IF outra IS NOT NULL THEN
    RAISE EXCEPTION 'Este recurso já está reservado nesse horário (%).', outra;
  END IF;
  RETURN NEW;
END $$;

ALTER TABLE public.lb_recursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lb_reservas ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['lb_recursos','lb_reservas'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname = t || '_empresa') THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL
           USING ((SELECT user_has_empresa_access(empresa_id)))
           WITH CHECK ((SELECT user_has_empresa_access(empresa_id)))', t || '_empresa', t);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = t || '_tranca_empresa') THEN
      EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.ag_tranca_empresa_id()',
                     t || '_tranca_empresa', t);
    END IF;
  END LOOP;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'lb_reservas_sem_sobreposicao') THEN
    CREATE TRIGGER lb_reservas_sem_sobreposicao BEFORE INSERT OR UPDATE ON public.lb_reservas
      FOR EACH ROW EXECUTE FUNCTION public.lb_reserva_sem_sobreposicao();
  END IF;
END $$;

-- O estúdio da Webtech Labs, para a agenda nascer com o principal recurso.
INSERT INTO public.lb_recursos (empresa_id, tipo, nome, descricao)
SELECT e.id, 'estudio', 'Estúdio Mirandela', 'Zona de gravação da Webtech Labs, também a do podcast «Zeros e Uns».'
FROM public.empresas e
WHERE e.slug = 'webtech-labs'
  AND NOT EXISTS (SELECT 1 FROM public.lb_recursos r WHERE r.empresa_id = e.id AND r.tipo = 'estudio');

COMMENT ON TABLE public.lb_recursos IS 'Clariza Labs · Estúdio Criativo: estúdio e equipamento reserváveis.';
COMMENT ON TABLE public.lb_reservas IS 'Clariza Labs · Estúdio Criativo: reservas de recursos (sem sobreposição por recurso).';

-- Verificação
SELECT tipo, nome FROM public.lb_recursos
WHERE empresa_id = (SELECT id FROM public.empresas WHERE slug = 'webtech-labs');
