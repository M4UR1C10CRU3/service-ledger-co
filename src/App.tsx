import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import SelectEmpresa from "./pages/SelectEmpresa";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { EmpresaProvider } from "./contexts/EmpresaContext";
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

const queryClient = new QueryClient();

const ProtectedWithLayout = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <AppLayout>{children}</AppLayout>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <EmpresaProvider>
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/empresa" element={<SelectEmpresa />} />
              <Route path="/auth" element={<Auth />} />

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
              <Route path="/propostas" element={<ProtectedWithLayout><PlaceholderPage title="Propostas" /></ProtectedWithLayout>} />
              <Route path="/follow-up" element={<ProtectedWithLayout><PlaceholderPage title="Follow-up" /></ProtectedWithLayout>} />
              <Route path="/stocks" element={<ProtectedWithLayout><PlaceholderPage title="Gestão de Stocks" /></ProtectedWithLayout>} />
              <Route path="/produtos" element={<ProtectedWithLayout><PlaceholderPage title="Cadastro de Produtos" /></ProtectedWithLayout>} />
              <Route path="/ordens-servico" element={<ProtectedWithLayout><PlaceholderPage title="Ordens de Serviço" /></ProtectedWithLayout>} />
              <Route path="/receitas" element={<ProtectedWithLayout><Receitas /></ProtectedWithLayout>} />
              <Route path="/debitos" element={<ProtectedWithLayout><Debitos /></ProtectedWithLayout>} />
              <Route path="/historico-cobrancas" element={<ProtectedWithLayout><HistoricoCobrancas /></ProtectedWithLayout>} />
              <Route path="/fluxo-caixa" element={<ProtectedWithLayout><FluxoCaixa /></ProtectedWithLayout>} />
              <Route path="/colaboradores" element={<ProtectedWithLayout><Colaboradores /></ProtectedWithLayout>} />
              <Route path="/controle-ponto" element={<ProtectedWithLayout><ControlePonto /></ProtectedWithLayout>} />
              <Route path="/subempreiteiros" element={<ProtectedWithLayout><PlaceholderPage title="Subempreiteiros" /></ProtectedWithLayout>} />
              <Route path="/configuracoes" element={<ProtectedWithLayout><PlaceholderPage title="Configurações" /></ProtectedWithLayout>} />

              {/* Redirects */}
              <Route path="/" element={<Navigate to="/empresa" replace />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </div>
      </TooltipProvider>
    </EmpresaProvider>
  </QueryClientProvider>
);

export default App;
