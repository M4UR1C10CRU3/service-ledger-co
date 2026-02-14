import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Briefcase, Users, FileText, Target,
  ShoppingCart, Truck, Package, BoxSelect,
  Factory, Receipt, ClipboardList,
  Wallet, TrendingUp, CreditCard, AlertTriangle, BarChart3,
  UsersRound, HardHat, Handshake,
  Settings, LogOut, Building2, ChevronDown,
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
      { title: 'Contas a Pagar', url: '/contas-pagar', icon: CreditCard },
      { title: 'Dashboard CP', url: '/contas-pagar/dashboard', icon: BarChart3 },
      { title: 'Débitos', url: '/debitos', icon: AlertTriangle },
    ],
  },
  {
    label: 'Recursos Humanos',
    icon: UsersRound,
    items: [
      { title: 'Colaboradores', url: '/colaboradores', icon: HardHat },
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
      <SidebarHeader className="p-4">
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate('/dashboard')}
        >
          <img src={logo} alt={empresaNome} className="w-10 h-10 object-contain rounded-lg bg-white p-1" />
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-sidebar-foreground truncate">{empresaNome}</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">{empresa?.nomeLegal}</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent className="px-2">
        {/* Dashboard Geral */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => navigate('/dashboard')}
              className={cn(
                'w-full justify-start gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors',
                isActive('/dashboard') && 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
              )}
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              <span>Dashboard Geral</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarSeparator className="my-2" />

        {/* Sections */}
        {sections.map((section) => (
          <Collapsible key={section.label} defaultOpen={sectionHasActive(section.items)}>
            <SidebarGroup>
              <CollapsibleTrigger className="w-full">
                <SidebarGroupLabel className="flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50 hover:text-sidebar-foreground/80 cursor-pointer">
                  <span className="flex items-center gap-2">
                    <section.icon className="h-4 w-4" />
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
                            'w-full justify-start gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors',
                            isActive(item.url) && 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
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

      <SidebarSeparator />

      <SidebarFooter className="p-3 space-y-1">
        <SidebarMenuButton
          onClick={handleChangeEmpresa}
          className="w-full justify-start gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <Building2 className="h-4 w-4 shrink-0" />
          <span>Trocar Empresa</span>
        </SidebarMenuButton>
        <SidebarMenuButton
          onClick={() => navigate('/configuracoes')}
          className="w-full justify-start gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <Settings className="h-4 w-4 shrink-0" />
          <span>Configurações</span>
        </SidebarMenuButton>
        <SidebarMenuButton
          onClick={handleLogout}
          className="w-full justify-start gap-3 px-3 py-2 rounded-lg text-sm text-danger/80 hover:bg-danger/10 hover:text-danger"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sair</span>
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}
