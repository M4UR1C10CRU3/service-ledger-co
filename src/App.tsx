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

// Pages
import DashboardGeral from "./pages/DashboardGeral";
import Index from "./pages/Index";
import Clientes from "./pages/Clientes";
import Fornecedores from "./pages/Fornecedores";
import Despesas from "./pages/Despesas";
import Compras from "./pages/Compras";
import Debitos from "./pages/Debitos";
import HistoricoCobrancas from "./pages/HistoricoCobrancas";
import FluxoCaixa from "./pages/FluxoCaixa";
import Receitas from "./pages/Receitas";
import Colaboradores from "./pages/Colaboradores";
import ControlePonto from "./pages/ControlePonto";
import PlaceholderPage from "./pages/PlaceholderPage";
import Propostas from "./pages/Propostas";
import Produtos from "./pages/Produtos";
import GestaoStocks from "./pages/GestaoStocks";
import FollowUp from "./pages/FollowUp";
import Recrutamento from "./pages/Recrutamento";
import Avaliacoes from "./pages/Avaliacoes";
import Auditoria from "./pages/Auditoria";
import Utilizadores from "./pages/Utilizadores";
import Configuracoes from "./pages/Configuracoes";

const queryClient = new QueryClient();

const ProtectedWithLayout = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <AppLayout>{children}</AppLayout>
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
