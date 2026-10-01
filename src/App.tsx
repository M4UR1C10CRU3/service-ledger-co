import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import SelectEmpresa from "./pages/SelectEmpresa";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { VerticalRoute } from "./components/VerticalRoute";
import { PermissaoRoute } from "./components/PermissaoRoute";
import { entradaDoDominio } from "./lib/host";
import { EmpresaProvider } from "./contexts/EmpresaContext";
import { PermissionsProvider } from "./contexts/PermissionsContext";
import { AppLayout } from "./components/AppLayout";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Lazy-loaded pages for code splitting
const DashboardGeral = lazy(() => import("./pages/DashboardGeral"));
const Index = lazy(() => import("./pages/Index"));
const Clientes = lazy(() => import("./pages/Clientes"));
const Fornecedores = lazy(() => import("./pages/Fornecedores"));
const Despesas = lazy(() => import("./pages/Despesas"));
const ContasPagar = lazy(() => import("./pages/ContasPagar"));
const ContasPagarDashboard = lazy(() => import("./pages/ContasPagarDashboard"));
const Compras = lazy(() => import("./pages/Compras"));
const Debitos = lazy(() => import("./pages/Debitos"));
const HistoricoCobrancas = lazy(() => import("./pages/HistoricoCobrancas"));
const FluxoCaixa = lazy(() => import("./pages/FluxoCaixa"));
const Receitas = lazy(() => import("./pages/Receitas"));
const Colaboradores = lazy(() => import("./pages/Colaboradores"));
const RhFuncoes = lazy(() => import("./pages/rh/Funcoes"));
const ControlePonto = lazy(() => import("./pages/ControlePonto"));
const PlaceholderPage = lazy(() => import("./pages/PlaceholderPage"));
const Propostas = lazy(() => import("./pages/Propostas"));
const Produtos = lazy(() => import("./pages/Produtos"));
const GestaoStocks = lazy(() => import("./pages/GestaoStocks"));
const FollowUp = lazy(() => import("./pages/FollowUp"));
const Recrutamento = lazy(() => import("./pages/Recrutamento"));
const Avaliacoes = lazy(() => import("./pages/Avaliacoes"));
const Acolhimento = lazy(() => import("./pages/rh/Acolhimento"));
const Auditoria = lazy(() => import("./pages/Auditoria"));
const Utilizadores = lazy(() => import("./pages/Utilizadores"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const Marketing = lazy(() => import("./pages/Marketing"));
const PlaneamentoEstrategico = lazy(() => import("./pages/PlaneamentoEstrategico"));
const Licenciamentos = lazy(() => import("./pages/Licenciamentos"));
const AlterarSenha = lazy(() => import("./pages/AlterarSenha"));
const OrdensServico = lazy(() => import("./pages/OrdensServico"));
const NotasEncomenda = lazy(() => import("./pages/NotasEncomenda"));
const DashboardExecutivo = lazy(() => import("./pages/DashboardExecutivo"));
const Subempreiteiros = lazy(() => import("./pages/Subempreiteiros"));
const Concursos = lazy(() => import("./pages/Concursos"));
const ConcursoDetail = lazy(() => import("./pages/ConcursoDetail"));
const RelatorioGerencial = lazy(() => import("./pages/RelatorioGerencial"));
const EcommerceInteligencia = lazy(() => import("./pages/EcommerceInteligencia"));
const PesquisaSatisfacao = lazy(() => import("./pages/PesquisaSatisfacao"));
const PedidosOrcamento = lazy(() => import("./pages/PedidosOrcamento"));

// Clariza Agency — vertical de Agência de Marketing
const AgencyLogin = lazy(() => import("./pages/agency/AgencyLogin"));
const AgencyProjetos = lazy(() => import("./pages/agency/Projetos"));
const AgencyProjetoDetail = lazy(() => import("./pages/agency/ProjetoDetail"));
const AgencyMeusTrabalhos = lazy(() => import("./pages/agency/MeusTrabalhos"));
const AgencyRentabilidade = lazy(() => import("./pages/agency/RentabilidadeClientes"));
const AgencyPropostas = lazy(() => import("./pages/agency/PropostasAgencia"));
const AgencyAvencas = lazy(() => import("./pages/agency/Avencas"));
const AgencyCatalogo = lazy(() => import("./pages/agency/Catalogo"));
const AgencyEquipa = lazy(() => import("./pages/agency/Equipa"));
const AgencyAutomacoes = lazy(() => import("./pages/agency/AutomacoesAgency"));
const FinanceiroKanbanPage = lazy(() => import("./pages/FinanceiroKanbanPage"));
const WorkflowComprasPage = lazy(() => import("./pages/WorkflowComprasPage"));
const WorkflowProducao = lazy(() => import("./pages/WorkflowProducao"));
const Quadros = lazy(() => import("./pages/Quadros"));
const QuadroDetail = lazy(() => import("./pages/QuadroDetail"));
const QuadroAutomacoes = lazy(() => import("./pages/QuadroAutomacoes"));

// Clariza School — ITC
const SchoolLogin = lazy(() => import("./pages/school/SchoolLogin"));
const SchoolCalendario = lazy(() => import("./pages/school/SchoolCalendario"));
const SchoolCursos = lazy(() => import("./pages/school/SchoolCursos"));
const SchoolAlunos = lazy(() => import("./pages/school/SchoolAlunos"));
const SchoolDocentes = lazy(() => import("./pages/school/SchoolDocentes"));
const SchoolTurmas = lazy(() => import("./pages/school/SchoolTurmas"));
const SchoolMatriculas = lazy(() => import("./pages/school/SchoolMatriculas"));
const SchoolCertificados = lazy(() => import("./pages/school/SchoolCertificados"));
const SchoolClientesCorp = lazy(() => import("./pages/school/SchoolClientesCorp"));
const SchoolPedidos = lazy(() => import("./pages/school/SchoolPedidos"));
const PortalAluno = lazy(() => import("./pages/school/PortalAluno"));
const PortalInstrutor = lazy(() => import("./pages/school/PortalInstrutor"));
const PortalCorporativo = lazy(() => import("./pages/school/PortalCorporativo"));
const PortalLogin = lazy(() => import("./pages/portal/PortalLogin"));
const PortalEntrada = lazy(() => import("./pages/portal/PortalEntrada"));
const PortalShell = lazy(() => import("./components/portal/PortalShell").then(m => ({ default: m.PortalShell })));
const CertificadoPublico = lazy(() => import("./pages/CertificadoPublico"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (previously cacheTime)
      refetchOnWindowFocus: false,
    },
  },
});

const PageLoader = () => (
  <div className="flex items-center justify-center py-20">
    <div className="text-center space-y-3">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
      <p className="text-sm text-muted-foreground">A carregar...</p>
    </div>
  </div>
);

const ProtectedWithLayout = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <AppLayout>
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          {children}
        </Suspense>
      </ErrorBoundary>
    </AppLayout>
  </ProtectedRoute>
);

/**
 * Entradas do GRUPO — o Workspace e o início de sessão do ERP.
 *
 * Nos domínios dedicados a um cliente não existem: quem lá chegar por
 * navegação interna é mandado para a entrada desse domínio. Quem tentar pelo
 * endereço nem sequer recebe a página, porque o nginx trava antes. São dois
 * trincos para a mesma porta, de propósito: o do servidor não vê a navegação
 * de dentro da aplicação, e o da aplicação não protege quem escreve o endereço
 * à mão com a página já carregada noutro separador.
 */
const SoNoGrupo = ({ children }: { children: React.ReactNode }) => {
  const entrada = entradaDoDominio();
  return entrada ? <Navigate to={entrada} replace /> : <>{children}</>;
};

/**
 * Igual ao `ProtectedWithLayout`, mais uma porta: só entra quem tiver o ITC
 * (ou outra escola) atribuído. Ter conta no Clariza não chega — o vertical é
 * de um cliente. Ver `VerticalRoute`.
 */
const SchoolProtectedWithLayout = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <VerticalRoute vertical="school" entrada="/school">
      <AppLayout>
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            {children}
          </Suspense>
        </ErrorBoundary>
      </AppLayout>
    </VerticalRoute>
  </ProtectedRoute>
);

/** O mesmo para o Agency: só entra quem tiver uma agência atribuída. */
const AgencyProtectedWithLayout = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <VerticalRoute vertical="agency" entrada="/agency">
      <AppLayout>
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            {children}
          </Suspense>
        </ErrorBoundary>
      </AppLayout>
    </VerticalRoute>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <EmpresaProvider>
      <PermissionsProvider>
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/empresa" element={<SoNoGrupo><SelectEmpresa /></SoNoGrupo>} />
              <Route path="/auth" element={<SoNoGrupo><Auth /></SoNoGrupo>} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Protected routes with sidebar layout */}
              <Route path="/dashboard" element={<ProtectedWithLayout><DashboardGeral /></ProtectedWithLayout>} />
              <Route path="/dashboard-executivo" element={<ProtectedWithLayout><DashboardExecutivo /></ProtectedWithLayout>} />
              <Route path="/vendas" element={<ProtectedWithLayout><Index /></ProtectedWithLayout>} />
              <Route path="/clientes" element={<ProtectedWithLayout><Clientes /></ProtectedWithLayout>} />
              <Route path="/fornecedores" element={<ProtectedWithLayout><Fornecedores /></ProtectedWithLayout>} />
              <Route path="/despesas" element={<ProtectedWithLayout><Despesas /></ProtectedWithLayout>} />
              <Route path="/compras" element={<ProtectedWithLayout><Compras /></ProtectedWithLayout>} />
              <Route path="/notas-encomenda" element={<ProtectedWithLayout><NotasEncomenda /></ProtectedWithLayout>} />
              <Route path="/contas-pagar" element={<ProtectedWithLayout><ContasPagar /></ProtectedWithLayout>} />
              <Route path="/contas-pagar/dashboard" element={<ProtectedWithLayout><ContasPagarDashboard /></ProtectedWithLayout>} />

              {/* Placeholder routes for future pages */}
              <Route path="/propostas" element={<ProtectedWithLayout><Propostas /></ProtectedWithLayout>} />
              <Route path="/follow-up" element={<Navigate to="/workflow-comercial" replace />} />
              <Route path="/workflow-comercial" element={<ProtectedWithLayout><FollowUp /></ProtectedWithLayout>} />
              <Route path="/stocks" element={<ProtectedWithLayout><GestaoStocks /></ProtectedWithLayout>} />
              <Route path="/produtos" element={<ProtectedWithLayout><Produtos /></ProtectedWithLayout>} />
              <Route path="/ordens-servico" element={<ProtectedWithLayout><OrdensServico /></ProtectedWithLayout>} />
              <Route path="/receitas" element={<ProtectedWithLayout><Receitas /></ProtectedWithLayout>} />
              <Route path="/debitos" element={<ProtectedWithLayout><Debitos /></ProtectedWithLayout>} />
              <Route path="/historico-cobrancas" element={<ProtectedWithLayout><HistoricoCobrancas /></ProtectedWithLayout>} />
              <Route path="/financeiro/kanban" element={<ProtectedWithLayout><FinanceiroKanbanPage /></ProtectedWithLayout>} />
              <Route path="/workflow-compras" element={<ProtectedWithLayout><WorkflowComprasPage /></ProtectedWithLayout>} />
              <Route path="/workflow-producao" element={<ProtectedWithLayout><WorkflowProducao /></ProtectedWithLayout>} />
              <Route path="/fluxo-caixa" element={<ProtectedWithLayout><FluxoCaixa /></ProtectedWithLayout>} />
              <Route path="/colaboradores" element={<ProtectedWithLayout><Colaboradores /></ProtectedWithLayout>} />
              <Route path="/recursos-humanos/funcoes" element={<ProtectedWithLayout><RhFuncoes /></ProtectedWithLayout>} />
              <Route path="/controle-ponto" element={<ProtectedWithLayout><ControlePonto /></ProtectedWithLayout>} />
              <Route path="/subempreiteiros" element={<ProtectedWithLayout><Subempreiteiros /></ProtectedWithLayout>} />
              <Route path="/concursos" element={<ProtectedWithLayout><PermissaoRoute modulo="concursos"><Concursos /></PermissaoRoute></ProtectedWithLayout>} />
              <Route path="/concursos/:id" element={<ProtectedWithLayout><PermissaoRoute modulo="concursos"><ConcursoDetail /></PermissaoRoute></ProtectedWithLayout>} />
              <Route path="/recursos-humanos/recrutamento" element={<ProtectedWithLayout><Recrutamento /></ProtectedWithLayout>} />
              <Route path="/recursos-humanos/avaliacoes" element={<ProtectedWithLayout><Avaliacoes /></ProtectedWithLayout>} />
              <Route path="/recursos-humanos/acolhimento" element={<ProtectedWithLayout><PermissaoRoute modulo="rh_acolhimento"><Acolhimento /></PermissaoRoute></ProtectedWithLayout>} />
              <Route path="/recursos-humanos/acolhimento/:id" element={<ProtectedWithLayout><PermissaoRoute modulo="rh_acolhimento"><Acolhimento /></PermissaoRoute></ProtectedWithLayout>} />
              <Route path="/marketing" element={<ProtectedWithLayout><Marketing /></ProtectedWithLayout>} />
              <Route path="/marketing/calendario" element={<ProtectedWithLayout><Marketing /></ProtectedWithLayout>} />
              <Route path="/administrativo/licenciamentos" element={<ProtectedWithLayout><PermissaoRoute modulo="administrativo"><Licenciamentos /></PermissaoRoute></ProtectedWithLayout>} />
              <Route path="/administrativo/planeamento" element={<ProtectedWithLayout><PermissaoRoute modulo="administrativo"><PlaneamentoEstrategico /></PermissaoRoute></ProtectedWithLayout>} />
              <Route path="/alterar-senha" element={<ProtectedWithLayout><AlterarSenha /></ProtectedWithLayout>} />
              <Route path="/configuracoes" element={<ProtectedWithLayout><Configuracoes /></ProtectedWithLayout>} />
              <Route path="/configuracoes/utilizadores" element={<ProtectedWithLayout><Configuracoes /></ProtectedWithLayout>} />
              <Route path="/configuracoes/empresa" element={<ProtectedWithLayout><Configuracoes /></ProtectedWithLayout>} />
              <Route path="/configuracoes/empresas" element={<ProtectedWithLayout><Configuracoes /></ProtectedWithLayout>} />
              <Route path="/configuracoes/aparencia" element={<ProtectedWithLayout><Configuracoes /></ProtectedWithLayout>} />
              <Route path="/configuracoes/notificacoes" element={<ProtectedWithLayout><Configuracoes /></ProtectedWithLayout>} />
              <Route path="/configuracoes/integracoes" element={<ProtectedWithLayout><Configuracoes /></ProtectedWithLayout>} />
              <Route path="/configuracoes/dados" element={<ProtectedWithLayout><Configuracoes /></ProtectedWithLayout>} />
              <Route path="/configuracoes/sobre" element={<ProtectedWithLayout><Configuracoes /></ProtectedWithLayout>} />
              <Route path="/utilizadores" element={<Navigate to="/configuracoes/utilizadores" replace />} />
              <Route path="/auditoria" element={<ProtectedWithLayout><Auditoria /></ProtectedWithLayout>} />

              {/* Redirects */}
              {/* A query string tem de sobreviver ao salto: sem isto,
                  clariza.exemplo/?empresa=demo-agencia perdia o parâmetro
                  antes de chegar ao seletor, e o link de demonstração
                  mostrava a lista de empresas toda. */}
              <Route path="/" element={
                <Navigate to={{ pathname: '/empresa', search: window.location.search }} replace />
              } />
              <Route path="/relatorio-gerencial" element={<ProtectedWithLayout><RelatorioGerencial /></ProtectedWithLayout>} />
              <Route path="/ecommerce/inteligencia" element={<ProtectedWithLayout><EcommerceInteligencia /></ProtectedWithLayout>} />
              <Route path="/ecommerce/satisfacao" element={<ProtectedWithLayout><PesquisaSatisfacao /></ProtectedWithLayout>} />

              <Route path="/pedidos-orcamento" element={<ProtectedWithLayout><PedidosOrcamento /></ProtectedWithLayout>} />

              {/* Quadros — gestão de tarefas estilo Trello */}
              <Route path="/quadros" element={<ProtectedWithLayout><Quadros /></ProtectedWithLayout>} />
              <Route path="/quadros/:id" element={<ProtectedWithLayout><QuadroDetail /></ProtectedWithLayout>} />
              <Route path="/quadros/:id/automacoes" element={<ProtectedWithLayout><QuadroAutomacoes /></ProtectedWithLayout>} />

              {/* Verificação pública de certificado — sem autenticação.
                  /verificar é o endereço impresso no certificado e lido pelo QR;
                  /certificado mantém-se porque já foi distribuído. */}
              <Route path="/certificado/:codigo" element={<Suspense fallback={<PageLoader />}><CertificadoPublico /></Suspense>} />
              <Route path="/verificar" element={<Suspense fallback={<PageLoader />}><CertificadoPublico /></Suspense>} />
              <Route path="/verificar/:codigo" element={<Suspense fallback={<PageLoader />}><CertificadoPublico /></Suspense>} />

              {/* Clariza School — Admin */}
              {/* Entrada propria do Clariza School — nao passa pelo seletor de empresas */}
              <Route path="/school" element={<Suspense fallback={<PageLoader />}><SchoolLogin /></Suspense>} />
              <Route path="/school/calendario" element={<SchoolProtectedWithLayout><SchoolCalendario /></SchoolProtectedWithLayout>} />
              <Route path="/school/cursos" element={<SchoolProtectedWithLayout><SchoolCursos /></SchoolProtectedWithLayout>} />
              <Route path="/school/alunos" element={<SchoolProtectedWithLayout><SchoolAlunos /></SchoolProtectedWithLayout>} />
              <Route path="/school/instrutores" element={<SchoolProtectedWithLayout><SchoolDocentes /></SchoolProtectedWithLayout>} />
              <Route path="/school/turmas" element={<SchoolProtectedWithLayout><SchoolTurmas /></SchoolProtectedWithLayout>} />
              <Route path="/school/matriculas" element={<SchoolProtectedWithLayout><SchoolMatriculas /></SchoolProtectedWithLayout>} />
              <Route path="/school/certificados" element={<SchoolProtectedWithLayout><SchoolCertificados /></SchoolProtectedWithLayout>} />
              <Route path="/school/clientes-corp" element={<SchoolProtectedWithLayout><SchoolClientesCorp /></SchoolProtectedWithLayout>} />
              <Route path="/school/pedidos" element={<SchoolProtectedWithLayout><SchoolPedidos /></SchoolProtectedWithLayout>} />

              {/* Clariza School — Portais */}
              {/* Portais — caminho próprio. Não passam pelo guarda do ERP, que
                  exige linha em liberty_utilizadores e terminaria a sessão de um
                  aluno, nem pelo layout do ERP, que lhe mostraria o menu todo. */}
              <Route path="/portal/entrar" element={<Suspense fallback={<PageLoader />}><PortalLogin /></Suspense>} />
              {/* Uma pagina de acesso por perfil: /portal/entrar/aluno, .../instrutor, .../corporativo */}
              <Route path="/portal/entrar/:perfil" element={<Suspense fallback={<PageLoader />}><PortalLogin /></Suspense>} />
              <Route path="/portal" element={<Suspense fallback={<PageLoader />}><PortalEntrada /></Suspense>} />
              <Route path="/portal/aluno" element={
                <Suspense fallback={<PageLoader />}><PortalShell exige="aluno"><PortalAluno /></PortalShell></Suspense>} />
              <Route path="/portal/instrutor" element={
                <Suspense fallback={<PageLoader />}><PortalShell exige="docente"><PortalInstrutor /></PortalShell></Suspense>} />

              <Route path="/portal/corporativo" element={
                <Suspense fallback={<PageLoader />}><PortalShell exige="corporativo"><PortalCorporativo /></PortalShell></Suspense>} />

              {/* Clariza Agency — vertical de Agência de Marketing */}
              {/* Entrada própria — não passa pelo seletor de empresas.
                  Link individual de cada agência: /agency?empresa=<slug> */}
              <Route path="/agency" element={<Suspense fallback={<PageLoader />}><AgencyLogin /></Suspense>} />
              <Route path="/agency/projetos" element={<AgencyProtectedWithLayout><AgencyProjetos /></AgencyProtectedWithLayout>} />
              <Route path="/agency/projetos/:id" element={<AgencyProtectedWithLayout><AgencyProjetoDetail /></AgencyProtectedWithLayout>} />
              <Route path="/agency/meus-trabalhos" element={<AgencyProtectedWithLayout><AgencyMeusTrabalhos /></AgencyProtectedWithLayout>} />
              <Route path="/agency/rentabilidade" element={<AgencyProtectedWithLayout><AgencyRentabilidade /></AgencyProtectedWithLayout>} />
              <Route path="/agency/propostas" element={<AgencyProtectedWithLayout><AgencyPropostas /></AgencyProtectedWithLayout>} />
              <Route path="/agency/avencas" element={<AgencyProtectedWithLayout><AgencyAvencas /></AgencyProtectedWithLayout>} />
              <Route path="/agency/catalogo" element={<AgencyProtectedWithLayout><AgencyCatalogo /></AgencyProtectedWithLayout>} />
              <Route path="/agency/equipa" element={<AgencyProtectedWithLayout><AgencyEquipa /></AgencyProtectedWithLayout>} />
              <Route path="/agency/automacoes" element={<AgencyProtectedWithLayout><AgencyAutomacoes /></AgencyProtectedWithLayout>} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </div>
      </TooltipProvider>
      </PermissionsProvider>
    </EmpresaProvider>
  </QueryClientProvider>
);

export default App;
