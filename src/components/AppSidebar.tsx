import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Briefcase, Users, FileText, Target, Clock,
  ShoppingCart, Truck, Package, BoxSelect,
  Factory, Receipt, ClipboardList,
  Wallet, TrendingUp, CreditCard, AlertTriangle, BarChart3,
  UsersRound, HardHat, Handshake,
  Settings, LogOut, Building2, ChevronDown, History,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
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
      { title: 'Clientes', url: '/clientes', icon: Users },
      { title: 'Propostas', url: '/propostas', icon: FileText },
      { title: 'Follow-up', url: '/follow-up', icon: Target },
    ],
  },
  {
    label: 'Compras',
    icon: ShoppingCart,
    items: [
      { title: 'Fornecedores', url: '/fornecedores', icon: Truck },
      { title: 'Gestão de Stocks', url: '/stocks', icon: Package },
      { title: 'Produtos', url: '/produtos', icon: BoxSelect },
    ],
  },
  {
    label: 'Produção',
    icon: Factory,
    items: [
      { title: 'Vendas / Serviços', url: '/vendas', icon: Receipt },
      { title: 'Ordens de Serviço', url: '/ordens-servico', icon: ClipboardList },
    ],
  },
  {
    label: 'Financeiro',
    icon: Wallet,
    items: [
      { title: 'Receitas', url: '/receitas', icon: TrendingUp },
      { title: 'Despesas', url: '/despesas', icon: CreditCard },
      { title: 'Débitos', url: '/debitos', icon: AlertTriangle },
      { title: 'Histórico Cobranças', url: '/historico-cobrancas', icon: History },
      { title: 'Fluxo de Caixa', url: '/fluxo-caixa', icon: Wallet },
    ],
  },
  {
    label: 'Recursos Humanos',
    icon: UsersRound,
    items: [
      { title: 'Colaboradores', url: '/colaboradores', icon: HardHat },
      { title: 'Controlo de Ponto', url: '/controle-ponto', icon: Clock },
      { title: 'Subempreiteiros', url: '/subempreiteiros', icon: Handshake },
    ],
  },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { empresa, getLogo, setEmpresa } = useEmpresa();

  const logo = getLogo();
  const empresaNome = empresa?.nome || 'Obrajusta';

  const isActive = (url: string) => location.pathname === url;
  const sectionHasActive = (items: NavItem[]) => items.some(i => isActive(i.url));

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

  return (
    <Sidebar className="border-r border-sidebar-border">
      {/* Company Header */}
      <SidebarHeader className="p-4 pb-3">
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => navigate('/dashboard')}
        >
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/10 p-1.5 flex items-center justify-center shrink-0 ring-1 ring-white/10">
            <img src={logo} alt={empresaNome} className="w-full h-full object-contain" />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-sidebar-foreground truncate group-hover:text-white transition-colors">{empresaNome}</p>
            <p className="text-[11px] text-sidebar-foreground/50 truncate">{empresa?.nomeLegal}</p>
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
        </SidebarMenu>

        <SidebarSeparator className="my-2 opacity-10" />

        {/* Sections */}
        {sections.map((section) => (
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
        <SidebarMenuButton
          onClick={() => navigate('/configuracoes')}
          className="w-full justify-start gap-3 px-3 py-2 rounded-xl text-[13px] text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all"
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
