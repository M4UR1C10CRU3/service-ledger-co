import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Briefcase, Users, FileText, Target, Clock,
  ShoppingCart, Truck, Package, BoxSelect,
  Factory, Receipt, ClipboardList,
  Wallet, TrendingUp, CreditCard, AlertTriangle, BarChart3, PieChart,
  UsersRound, HardHat, Handshake, UserSearch, ClipboardCheck,
  Settings, LogOut, Building2, ChevronDown, History, ScrollText,
  UserCog, Megaphone, Trello, KeyRound, Building, Lightbulb, ShoppingBag,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  permModulo?: string; // permission module key for visibility
}

interface NavSection {
  label: string;
  icon: React.ElementType;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    label: 'Comercial',
    icon: Briefcase,
    items: [
      { title: 'Clientes', url: '/clientes', icon: Users, permModulo: 'clientes' },
      { title: 'Pedidos de Orçamento', url: '/pedidos-orcamento', icon: ClipboardList, permModulo: 'pedidos_orcamento' },
      { title: 'Propostas', url: '/propostas', icon: FileText, permModulo: 'propostas' },
      { title: 'Workflow Comercial', url: '/workflow-comercial', icon: Target, permModulo: 'followup' },
    ],
  },
  {
    label: 'Compras',
    icon: ShoppingCart,
    items: [
      { title: 'Notas de Encomenda', url: '/notas-encomenda', icon: ClipboardList, permModulo: 'compras' },
      { title: 'Compras', url: '/compras', icon: ShoppingCart, permModulo: 'compras' },
      { title: 'Fornecedores', url: '/fornecedores', icon: Truck, permModulo: 'fornecedores' },
      { title: 'Gestão de Stocks', url: '/stocks', icon: Package, permModulo: 'stocks' },
      { title: 'Produtos', url: '/produtos', icon: BoxSelect, permModulo: 'produtos' },
    ],
  },
  {
    label: 'Produção',
    icon: Factory,
    items: [
      { title: 'Vendas / Serviços', url: '/vendas', icon: Receipt, permModulo: 'vendas' },
      { title: 'Ordens de Serviço', url: '/ordens-servico', icon: ClipboardList, permModulo: 'ordens_servico' },
    ],
  },
  {
    label: 'Financeiro',
    icon: Wallet,
    items: [
      { title: 'Receitas', url: '/receitas', icon: TrendingUp, permModulo: 'financeiro_receitas' },
      { title: 'Despesas', url: '/despesas', icon: CreditCard, permModulo: 'financeiro_despesas' },
      { title: 'Contas a Pagar', url: '/contas-pagar', icon: Receipt, permModulo: 'financeiro_despesas' },
      { title: 'Dashboard Financeiro', url: '/contas-pagar/dashboard', icon: PieChart, permModulo: 'financeiro_despesas' },
      { title: 'Relatório Gerencial', url: '/relatorio-gerencial', icon: BarChart3, permModulo: 'financeiro_receitas' },
      { title: 'Débitos', url: '/debitos', icon: AlertTriangle, permModulo: 'financeiro_debitos' },
      { title: 'Histórico Cobranças', url: '/historico-cobrancas', icon: History, permModulo: 'financeiro_debitos' },
      { title: 'Fluxo de Caixa', url: '/fluxo-caixa', icon: Wallet, permModulo: 'financeiro_fluxo' },
    ],
  },
  {
    label: 'Recursos Humanos',
    icon: UsersRound,
    items: [
      { title: 'Colaboradores', url: '/colaboradores', icon: HardHat, permModulo: 'rh_colaboradores' },
      { title: 'Controlo de Ponto', url: '/controle-ponto', icon: Clock, permModulo: 'rh_ponto' },
      { title: 'Recrutamento', url: '/recursos-humanos/recrutamento', icon: UserSearch, permModulo: 'rh_recrutamento' },
      { title: 'Avaliações', url: '/recursos-humanos/avaliacoes', icon: ClipboardCheck, permModulo: 'rh_avaliacoes' },
      { title: 'Subempreiteiros', url: '/subempreiteiros', icon: Handshake, permModulo: 'rh_subempreiteiros' },
    ],
  },
  {
    label: 'Marketing',
    icon: Megaphone,
    items: [
      { title: 'Kanban', url: '/marketing', icon: Trello },
      { title: 'Calendário Editorial', url: '/marketing/calendario', icon: Clock },
    ],
  },
  {
    label: 'E-commerce',
    icon: ShoppingBag,
    items: [
      { title: 'Inteligência Competitiva', url: '/ecommerce/inteligencia', icon: ShoppingBag },
    ],
  },
  {
    label: 'Administrativo',
    icon: Building,
    items: [
      { title: 'Planeamento Estratégico', url: '/administrativo/planeamento', icon: Lightbulb },
    ],
  },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { empresa, getLogo, setEmpresa } = useEmpresa();
  const { can, isAdmin } = usePermissions();

  const logo = getLogo();
  const empresaNome = empresa?.nome || 'Obrajusta';

  const isActive = (url: string) => location.pathname === url;

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      toast({ title: 'Logout realizado', description: 'Até logo!' });
      navigate('/auth');
    }
  };

  const handleChangeEmpresa = () => {
    setEmpresa(null);
    navigate('/empresa');
  };

  // Filter items by permission
  const visibleSections = sections.map(section => ({
    ...section,
    items: section.items.filter(item => !item.permModulo || can(item.permModulo, 'ver')),
  })).filter(section => section.items.length > 0);

  const sectionHasActive = (items: NavItem[]) => items.some(i => isActive(i.url));

  return (
    <Sidebar className="border-r border-sidebar-border">
      {/* Company Header */}
      <SidebarHeader className="p-4 pb-3">
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => navigate('/dashboard')}
        >
          <div className="shrink-0 h-11 w-11 rounded-xl overflow-hidden border border-sidebar-border/60 bg-sidebar-accent/40 flex items-center justify-center">
            <img src={logo} alt={empresaNome} className="w-full h-full object-contain p-0.5" />
          </div>
          <div className="overflow-hidden flex-1 min-w-0">
            <p className="text-sm font-bold text-sidebar-foreground/90 truncate leading-tight group-hover:text-white transition-colors">
              {empresaNome}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
              </span>
              <p className="text-[10px] font-medium uppercase tracking-widest text-sidebar-foreground/35 truncate">
                Em linha
              </p>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator className="opacity-20" />

      <SidebarContent className="px-2 pt-2">
        {/* Dashboard */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => navigate('/dashboard')}
              className={cn(
                'w-full justify-start gap-3 px-3 py-2.5 rounded-xl text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200',
                isActive('/dashboard') && 'bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-md shadow-sidebar-primary/20'
              )}
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              <span>Dashboard</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => navigate('/dashboard-executivo')}
              className={cn(
                'w-full justify-start gap-3 px-3 py-2.5 rounded-xl text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200',
                isActive('/dashboard-executivo') && 'bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-md shadow-sidebar-primary/20'
              )}
            >
              <BarChart3 className="h-4 w-4 shrink-0" />
              <span>Dashboard Executivo</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarSeparator className="my-2 opacity-10" />

        {/* Sections */}
        {visibleSections.map((section) => (
          <Collapsible key={section.label} defaultOpen={sectionHasActive(section.items)}>
            <SidebarGroup className="py-0.5">
              <CollapsibleTrigger className="w-full">
                <SidebarGroupLabel className="flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 hover:text-sidebar-foreground/70 cursor-pointer transition-colors">
                  <span className="flex items-center gap-2">
                    <section.icon className="h-3.5 w-3.5" />
                    {section.label}
                  </span>
                  <ChevronDown className="h-3 w-3 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {section.items.map((item) => (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton
                          onClick={() => navigate(item.url)}
                          className={cn(
                            'w-full justify-start gap-3 px-3 py-2 rounded-xl text-[13px] text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200',
                            isActive(item.url) && 'bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-md shadow-sidebar-primary/20'
                          )}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        ))}
      </SidebarContent>

      <SidebarSeparator className="opacity-20" />

      {/* Footer */}
      <SidebarFooter className="p-3 space-y-0.5">
        <SidebarMenuButton
          onClick={handleChangeEmpresa}
          className="w-full justify-start gap-3 px-3 py-2 rounded-xl text-[13px] text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all"
        >
          <Building2 className="h-4 w-4 shrink-0" />
          <span>Trocar Empresa</span>
        </SidebarMenuButton>
        {can('auditoria', 'ver') && (
          <SidebarMenuButton
            onClick={() => navigate('/auditoria')}
            className={cn(
              'w-full justify-start gap-3 px-3 py-2 rounded-xl text-[13px] text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all',
              isActive('/auditoria') && 'bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-md shadow-sidebar-primary/20'
            )}
          >
            <ScrollText className="h-4 w-4 shrink-0" />
            <span>Auditoria</span>
          </SidebarMenuButton>
        )}
        <SidebarMenuButton
          onClick={() => navigate('/alterar-senha')}
          className={cn(
            'w-full justify-start gap-3 px-3 py-2 rounded-xl text-[13px] text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all',
            isActive('/alterar-senha') && 'bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-md shadow-sidebar-primary/20'
          )}
        >
          <KeyRound className="h-4 w-4 shrink-0" />
          <span>Alterar Senha</span>
        </SidebarMenuButton>
        <SidebarMenuButton
          onClick={() => navigate('/configuracoes')}
          className={cn(
            'w-full justify-start gap-3 px-3 py-2 rounded-xl text-[13px] text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all',
            location.pathname.startsWith('/configuracoes') && 'bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-md shadow-sidebar-primary/20'
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          <span>Configurações</span>
        </SidebarMenuButton>
        <SidebarMenuButton
          onClick={handleLogout}
          className="w-full justify-start gap-3 px-3 py-2 rounded-xl text-[13px] text-danger-light/80 hover:bg-danger/10 hover:text-danger-light transition-all"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sair</span>
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}
