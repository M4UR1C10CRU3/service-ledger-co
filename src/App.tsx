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
import { EmpresaProvider } from "./contexts/EmpresaContext";
import { PermissionsProvider } from "./contexts/PermissionsContext";
import { AppLayout } from "./components/AppLayout";

// Lazy-loaded pages for code splitting
const DashboardGeral = lazy(() => import("./pages/DashboardGeral"));
const Index = lazy(() => import("./pages/Index"));
const Clientes = lazy(() => import("./pages/Clientes"));
const Fornecedores = lazy(() => import("./pages/Fornecedores"));
const Despesas = lazy(() => import("./pages/Despesas"));
const Compras = lazy(() => import("./pages/Compras"));
const Debitos = lazy(() => import("./pages/Debitos"));
const HistoricoCobrancas = lazy(() => import("./pages/HistoricoCobrancas"));
const FluxoCaixa = lazy(() => import("./pages/FluxoCaixa"));
const Receitas = lazy(() => import("./pages/Receitas"));
const Colaboradores = lazy(() => import("./pages/Colaboradores"));
const ControlePonto = lazy(() => import("./pages/ControlePonto"));
const PlaceholderPage = lazy(() => import("./pages/PlaceholderPage"));
const Propostas = lazy(() => import("./pages/Propostas"));
const Produtos = lazy(() => import("./pages/Produtos"));
const GestaoStocks = lazy(() => import("./pages/GestaoStocks"));
const FollowUp = lazy(() => import("./pages/FollowUp"));
const Recrutamento = lazy(() => import("./pages/Recrutamento"));
const Avaliacoes = lazy(() => import("./pages/Avaliacoes"));
const Auditoria = lazy(() => import("./pages/Auditoria"));
const Utilizadores = lazy(() => import("./pages/Utilizadores"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const Marketing = lazy(() => import("./pages/Marketing"));

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
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </AppLayout>
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
              <Route path="/empresa" element={<SelectEmpresa />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Protected routes with sidebar layout */}
              <Route path="/dashboard" element={<ProtectedWithLayout><DashboardGeral /></ProtectedWithLayout>} />
              <Route path="/vendas" element={<ProtectedWithLayout><Index /></ProtectedWithLayout>} />
              <Route path="/clientes" element={<ProtectedWithLayout><Clientes /></ProtectedWithLayout>} />
              <Route path="/fornecedores" element={<ProtectedWithLayout><Fornecedores /></ProtectedWithLayout>} />
              <Route path="/despesas" element={<ProtectedWithLayout><Despesas /></ProtectedWithLayout>} />
              <Route path="/compras" element={<ProtectedWithLayout><Compras /></ProtectedWithLayout>} />
              <Route path="/contas-pagar" element={<ProtectedWithLayout><Despesas /></ProtectedWithLayout>} />
              <Route path="/contas-pagar/dashboard" element={<ProtectedWithLayout><Despesas /></ProtectedWithLayout>} />

              {/* Placeholder routes for future pages */}
              <Route path="/propostas" element={<ProtectedWithLayout><Propostas /></ProtectedWithLayout>} />
              <Route path="/follow-up" element={<ProtectedWithLayout><FollowUp /></ProtectedWithLayout>} />
              <Route path="/stocks" element={<ProtectedWithLayout><GestaoStocks /></ProtectedWithLayout>} />
              <Route path="/produtos" element={<ProtectedWithLayout><Produtos /></ProtectedWithLayout>} />
              <Route path="/ordens-servico" element={<ProtectedWithLayout><PlaceholderPage title="Ordens de Serviço" /></ProtectedWithLayout>} />
              <Route path="/receitas" element={<ProtectedWithLayout><Receitas /></ProtectedWithLayout>} />
              <Route path="/debitos" element={<ProtectedWithLayout><Debitos /></ProtectedWithLayout>} />
              <Route path="/historico-cobrancas" element={<ProtectedWithLayout><HistoricoCobrancas /></ProtectedWithLayout>} />
              <Route path="/fluxo-caixa" element={<ProtectedWithLayout><FluxoCaixa /></ProtectedWithLayout>} />
              <Route path="/colaboradores" element={<ProtectedWithLayout><Colaboradores /></ProtectedWithLayout>} />
              <Route path="/controle-ponto" element={<ProtectedWithLayout><ControlePonto /></ProtectedWithLayout>} />
              <Route path="/subempreiteiros" element={<ProtectedWithLayout><PlaceholderPage title="Subempreiteiros" /></ProtectedWithLayout>} />
              <Route path="/recursos-humanos/recrutamento" element={<ProtectedWithLayout><Recrutamento /></ProtectedWithLayout>} />
              <Route path="/recursos-humanos/avaliacoes" element={<ProtectedWithLayout><Avaliacoes /></ProtectedWithLayout>} />
              <Route path="/marketing" element={<ProtectedWithLayout><Marketing /></ProtectedWithLayout>} />
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
              <Route path="/" element={<Navigate to="/empresa" replace />} />
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
