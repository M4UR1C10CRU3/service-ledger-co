-- Reforço de segurança (RLS) — 19/10/2026
-- Só mexe em regras de acesso. Nenhum dado é alterado ou apagado.
-- Reverter: 2026-10-19-reforco-seguranca-REVERTER.sql
BEGIN;

-- 1) Regras de «inserir» que só pediam sessão iniciada.
--    Cada tabela já tem a regra «_acesso» por empresa (ou por grupo),
--    que passa a valer também para inserir.
DROP POLICY IF EXISTS "Authenticated users can insert account_payments" ON public.account_payments;
DROP POLICY IF EXISTS "Authenticated users can insert accounts_payable" ON public.accounts_payable;
DROP POLICY IF EXISTS "Authenticated users can insert alert_logs" ON public.alert_logs;
DROP POLICY IF EXISTS "Authenticated users can insert alert_settings" ON public.alert_settings;
DROP POLICY IF EXISTS "Authenticated users can insert articles" ON public.articles;
DROP POLICY IF EXISTS "Authenticated users can insert cash_flows" ON public.cash_flows;
DROP POLICY IF EXISTS "Authenticated users can insert clientes" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can insert cost_centers" ON public.cost_centers;
DROP POLICY IF EXISTS "Authenticated users can insert email_history" ON public.email_history;
DROP POLICY IF EXISTS "Authenticated users can insert employees" ON public.employees;
DROP POLICY IF EXISTS "Authenticated users can insert feriados" ON public.feriados;
DROP POLICY IF EXISTS "Authenticated users can insert followup_contactos" ON public.followup_contactos;
DROP POLICY IF EXISTS "Authenticated users can insert followup_historico_fases" ON public.followup_historico_fases;
DROP POLICY IF EXISTS "Authenticated users can insert followup_oportunidades" ON public.followup_oportunidades;
DROP POLICY IF EXISTS "Authenticated users can insert job_positions" ON public.job_positions;
DROP POLICY IF EXISTS "Authenticated users can insert liberty_atividades" ON public.liberty_atividades;
DROP POLICY IF EXISTS "Authenticated users can insert liberty_empresas_config" ON public.liberty_empresas_config;
DROP POLICY IF EXISTS "Authenticated users can insert liberty_utilizador_permissoes" ON public.liberty_utilizador_permissoes;
DROP POLICY IF EXISTS "Authenticated users can insert liberty_webhooks" ON public.liberty_webhooks;
DROP POLICY IF EXISTS "auth insert pedidos_orcamento" ON public.pedidos_orcamento;
DROP POLICY IF EXISTS "auth insert po_linhas" ON public.po_linhas;
DROP POLICY IF EXISTS "Authenticated users can insert produtos" ON public.produtos;
DROP POLICY IF EXISTS "Authenticated users can insert propostas" ON public.propostas;
DROP POLICY IF EXISTS "Authenticated users can insert propostas_linhas" ON public.propostas_linhas;
DROP POLICY IF EXISTS "Authenticated users can insert rh_avaliacoes" ON public.rh_avaliacoes;
DROP POLICY IF EXISTS "Authenticated users can insert rh_candidatos" ON public.rh_candidatos;
DROP POLICY IF EXISTS "Authenticated users can insert rh_entrevistas" ON public.rh_entrevistas;
DROP POLICY IF EXISTS "Authenticated users can insert rh_vagas" ON public.rh_vagas;
DROP POLICY IF EXISTS "Authenticated users can insert services" ON public.services;
DROP POLICY IF EXISTS "Authenticated users can insert stock_atual" ON public.stock_atual;
DROP POLICY IF EXISTS "Authenticated users can insert stock_movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Authenticated users can insert stock_movimentos" ON public.stock_movimentos;
DROP POLICY IF EXISTS "Authenticated users can insert subempreiteiros" ON public.subempreiteiros;
DROP POLICY IF EXISTS "Authenticated users can insert sub docs" ON public.subempreiteiros_documentos;
DROP POLICY IF EXISTS "Authenticated users can insert suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can insert time_records" ON public.time_records;
DROP POLICY IF EXISTS "Auth insert ecommerce_relatorios" ON public.ecommerce_relatorios;

-- 2) Ordens de serviço: tirar a regra «aberta a todos»; fica a regra por empresa.
DROP POLICY IF EXISTS os_authenticated ON public.ordens_servico;
DROP POLICY IF EXISTS os_checklist_authenticated ON public.ordens_servico_checklist;

-- 3) Liquidações: passam a seguir a empresa da receita (services.service_id).
DROP POLICY IF EXISTS "Authenticated users can delete liquidacoes" ON public.liquidacoes;
DROP POLICY IF EXISTS "Authenticated users can insert liquidacoes" ON public.liquidacoes;
DROP POLICY IF EXISTS "Authenticated users can update liquidacoes" ON public.liquidacoes;
DROP POLICY IF EXISTS "Authenticated users can view liquidacoes" ON public.liquidacoes;
CREATE POLICY liquidacoes_acesso ON public.liquidacoes TO authenticated
  USING (EXISTS (SELECT 1 FROM public.services s WHERE s.service_id = liquidacoes.service_id AND public.user_has_empresa_access(s.empresa_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.services s WHERE s.service_id = liquidacoes.service_id AND public.user_has_empresa_access(s.empresa_id)));

-- 4) Planeamento: de «aberto a todos» para «só a própria empresa».
DROP POLICY IF EXISTS "auth all planeamento_cards" ON public.planeamento_cards;
DROP POLICY IF EXISTS "auth all planeamento_anexos" ON public.planeamento_anexos;
DROP POLICY IF EXISTS "auth all planeamento_checklist" ON public.planeamento_checklist;
DROP POLICY IF EXISTS "auth all planeamento_consultas" ON public.planeamento_consultas;
DROP POLICY IF EXISTS "auth all planeamento_historico" ON public.planeamento_historico;
CREATE POLICY planeamento_cards_acesso ON public.planeamento_cards TO authenticated USING (public.user_has_empresa_access(empresa_id)) WITH CHECK (public.user_has_empresa_access(empresa_id));
CREATE POLICY planeamento_anexos_acesso ON public.planeamento_anexos TO authenticated USING (public.user_has_empresa_access(empresa_id)) WITH CHECK (public.user_has_empresa_access(empresa_id));
CREATE POLICY planeamento_checklist_acesso ON public.planeamento_checklist TO authenticated USING (public.user_has_empresa_access(empresa_id)) WITH CHECK (public.user_has_empresa_access(empresa_id));
CREATE POLICY planeamento_consultas_acesso ON public.planeamento_consultas TO authenticated USING (public.user_has_empresa_access(empresa_id)) WITH CHECK (public.user_has_empresa_access(empresa_id));
CREATE POLICY planeamento_historico_acesso ON public.planeamento_historico TO authenticated USING (public.user_has_empresa_access(empresa_id)) WITH CHECK (public.user_has_empresa_access(empresa_id));

-- 5) E-commerce (Warm): ligar a proteção que estava desligada (alerta CRITICAL).
--    As regras «_acesso» por empresa já existem. O agente externo continua a
--    poder registar ajustes de preço, mas só na Warm (como nos relatórios).
DROP POLICY IF EXISTS "Auth insert ecommerce_ajustes_preco" ON public.ecommerce_ajustes_preco;
DROP POLICY IF EXISTS "Auth insert ecommerce_produtos_monitorizados" ON public.ecommerce_produtos_monitorizados;
CREATE POLICY ecommerce_ajustes_preco_sistema_insert ON public.ecommerce_ajustes_preco FOR INSERT TO anon
  WITH CHECK (empresa_id = '71bf4313-33ef-4cf0-991c-022cdde3f88a'::uuid);
ALTER TABLE public.ecommerce_ajustes_preco ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecommerce_produtos_monitorizados ENABLE ROW LEVEL SECURITY;

-- 6) Cópias antigas com nomes de pessoas: fechar o acesso pela app (os dados ficam).
ALTER TABLE public.cartao_comentarios_nomes_bak_20260813 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comentarios_nomes_bak_20260818 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas_nomes_bak_20260813 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas_vertical_bak_20260812 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lue_bak_ricardo_20260818 ENABLE ROW LEVEL SECURITY;

COMMIT;
