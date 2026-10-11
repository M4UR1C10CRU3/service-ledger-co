-- ============================================================================
-- CLARIZA LABS · Podcast «Zeros e Uns» — episódios e triagem de convidados
-- ----------------------------------------------------------------------------
-- O podcast continua a viver no projeto «Podcast Zeros e Uns · Temporada 1»:
-- cada episódio é um job (EP.00…EP.12) e cada proposta de convidado que chega
-- pelo site é um job «Proposta · nome · tema», criado pelo n8n
-- (wtSitePodc00001). NADA disso muda — o fluxo do site continua igual.
--
-- Estas duas tabelas acrescentam, 1 para 1 com o job, o que o podcast precisa e
-- um job genérico não tem:
--
--   lb_episodios        — gravação, publicação, contraponto (o condutor é o
--                         responsável do job), convidado, selo PT⇄BR, estado
--                         editorial, termo de cessão de imagem e voz, e a
--                         oportunidade comercial do convidado (o podcast é um
--                         motor de leads).
--   lb_podcast_triagem  — a decisão sobre cada proposta (aceite / recusada) e,
--                         nas indicações, quando a pessoa indicada foi contactada
--                         e o que respondeu. É daqui que saem os prazos da
--                         política de privacidade (secção 10):
--                           · propostas guardadas 12 meses;
--                           · pessoa indicada: um só contacto; se recusar ou não
--                             responder em 30 dias, os dados apagam-se.
--                         O apagamento NUNCA é automático: o ecrã avisa e uma
--                         pessoa confirma.
--
-- Regras do Agency mantidas: empresa_id NOT NULL, RLS com USING e WITH CHECK,
-- FKs compostas, empresa_id imutável.
-- NÃO-DESTRUTIVO: só cria. Nenhum DROP, DELETE, TRUNCATE nem UPDATE.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lb_episodios (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id          UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  job_id              UUID NOT NULL UNIQUE,
  estado              TEXT NOT NULL DEFAULT 'planeado' CHECK (estado IN (
                        'planeado','convidado_confirmado','gravado','em_edicao','publicado')),
  gravacao_em         TIMESTAMPTZ,
  publicacao_em       DATE,
  contraponto         TEXT,                 -- o segundo apresentador
  convidado_nome      TEXT,
  convidado_contacto  TEXT,                 -- email ou telefone
  convidado_remoto    BOOLEAN NOT NULL DEFAULT FALSE,   -- grava à distância (ex.: Brasil)
  pt_br               BOOLEAN NOT NULL DEFAULT FALSE,   -- selo PT ⇄ BR
  oportunidade_id     UUID REFERENCES public.followup_oportunidades(id) ON DELETE SET NULL,
  termo_assinado      BOOLEAN NOT NULL DEFAULT FALSE,
  termo_assinado_em   DATE,
  termo_link          TEXT,                 -- onde está o termo assinado
  link_youtube        TEXT,
  link_spotify        TEXT,
  notas               TEXT,
  atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (job_id, empresa_id) REFERENCES public.ag_jobs (id, empresa_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.lb_podcast_triagem (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  job_id          UUID NOT NULL UNIQUE,
  decisao         TEXT NOT NULL DEFAULT 'pendente' CHECK (decisao IN ('pendente','aceite','recusada')),
  decidida_em     TIMESTAMPTZ,
  indicacao       BOOLEAN NOT NULL DEFAULT FALSE,     -- alguém indicou outra pessoa
  contactado_em   TIMESTAMPTZ,                        -- o único contacto à pessoa indicada
  resposta        TEXT CHECK (resposta IS NULL OR resposta IN ('aceitou','recusou','sem_resposta')),
  notas           TEXT,
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (job_id, empresa_id) REFERENCES public.ag_jobs (id, empresa_id) ON DELETE CASCADE
);

ALTER TABLE public.lb_episodios       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lb_podcast_triagem ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['lb_episodios','lb_podcast_triagem'] LOOP
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
END $$;

COMMENT ON TABLE public.lb_episodios       IS 'Clariza Labs · Podcast: dados editoriais de cada episódio (job do projeto do podcast).';
COMMENT ON TABLE public.lb_podcast_triagem IS 'Clariza Labs · Podcast: decisão sobre propostas de convidados e contacto às pessoas indicadas (prazos RGPD).';

-- Verificação
SELECT table_name, count(*) AS colunas FROM information_schema.columns
WHERE table_schema = 'public' AND table_name IN ('lb_episodios','lb_podcast_triagem')
GROUP BY table_name;
