import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Building2, Users, Palette, Bell, Link2, Database, Info,
  ChevronRight,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

// Subsections
import ConfigEmpresa from '@/components/configuracoes/ConfigEmpresa';
import ConfigEmpresas from '@/components/configuracoes/ConfigEmpresas';
import ConfigAparencia from '@/components/configuracoes/ConfigAparencia';
import ConfigNotificacoes from '@/components/configuracoes/ConfigNotificacoes';
import ConfigIntegracoes from '@/components/configuracoes/ConfigIntegracoes';
import ConfigDados from '@/components/configuracoes/ConfigDados';
import ConfigSobre from '@/components/configuracoes/ConfigSobre';
import Utilizadores from '@/pages/Utilizadores';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  children: { id: string; label: string }[];
}

const menuItems: MenuItem[] = [
  {
    id: 'empresa',
    label: 'Empresa',
    icon: Building2,
    children: [
      { id: 'dados-empresa', label: 'Dados da Empresa' },
      { id: 'gestao-empresas', label: 'Gestão de Empresas' },
    ],
  },
  {
    id: 'utilizadores',
    label: 'Utilizadores',
    icon: Users,
    children: [
      { id: 'gerir-utilizadores', label: 'Gerir Utilizadores' },
    ],
  },
  {
    id: 'aparencia',
    label: 'Aparência',
    icon: Palette,
    children: [
      { id: 'tema-cores', label: 'Tema e Cores' },
    ],
  },
  {
    id: 'notificacoes',
    label: 'Notificações',
    icon: Bell,
    children: [
      { id: 'alertas-sistema', label: 'Alertas do Sistema' },
      { id: 'preferencias-email', label: 'Preferências de Email' },
    ],
  },
  {
    id: 'integracoes',
    label: 'Integrações',
    icon: Link2,
    children: [
      { id: 'supabase', label: 'Supabase' },
      { id: 'api-webhooks', label: 'API e Webhooks' },
    ],
  },
  {
    id: 'dados',
    label: 'Dados',
    icon: Database,
    children: [
      { id: 'exportar', label: 'Exportar Dados' },
      { id: 'importar', label: 'Importar Dados' },
      { id: 'manutencao', label: 'Limpeza e Manutenção' },
    ],
  },
  {
    id: 'sobre',
    label: 'Sobre o Sistema',
    icon: Info,
    children: [],
  },
];

export default function Configuracoes() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, isLoading: permLoading } = usePermissions();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState('dados-empresa');
  const [expandedMenu, setExpandedMenu] = useState<string[]>(['empresa']);

  // Handle URL-based section selection
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/configuracoes/utilizadores')) {
      setActiveSection('gerir-utilizadores');
      setExpandedMenu(prev => prev.includes('utilizadores') ? prev : [...prev, 'utilizadores']);
    } else if (path.includes('/configuracoes/empresas')) {
      setActiveSection('gestao-empresas');
      setExpandedMenu(prev => prev.includes('empresa') ? prev : [...prev, 'empresa']);
    } else if (path.includes('/configuracoes/aparencia')) {
      setActiveSection('tema-cores');
      setExpandedMenu(prev => prev.includes('aparencia') ? prev : [...prev, 'aparencia']);
    } else if (path.includes('/configuracoes/notificacoes')) {
      setActiveSection('alertas-sistema');
      setExpandedMenu(prev => prev.includes('notificacoes') ? prev : [...prev, 'notificacoes']);
    } else if (path.includes('/configuracoes/integracoes')) {
      setActiveSection('supabase');
      setExpandedMenu(prev => prev.includes('integracoes') ? prev : [...prev, 'integracoes']);
    } else if (path.includes('/configuracoes/dados')) {
      setActiveSection('exportar');
      setExpandedMenu(prev => prev.includes('dados') ? prev : [...prev, 'dados']);
    } else if (path.includes('/configuracoes/sobre')) {
      setActiveSection('sobre');
    }
  }, [location.pathname]);

  // Redirect if not admin
  useEffect(() => {
    if (!permLoading && !isAdmin) {
      toast({ variant: 'destructive', title: 'Acesso negado', description: 'Não tem permissão para aceder a esta área.' });
      navigate('/dashboard');
    }
  }, [isAdmin, permLoading, navigate, toast]);

  if (!isAdmin) return null;

  const toggleMenu = (id: string) => {
    setExpandedMenu(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleSelectSection = (sectionId: string) => {
    setActiveSection(sectionId);
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'dados-empresa': return <ConfigEmpresa />;
      case 'gestao-empresas': return <ConfigEmpresas />;
      case 'gerir-utilizadores': return <Utilizadores />;
      case 'tema-cores': return <ConfigAparencia />;
      case 'alertas-sistema':
      case 'preferencias-email': return <ConfigNotificacoes activeTab={activeSection} />;
      case 'supabase':
      case 'api-webhooks': return <ConfigIntegracoes activeTab={activeSection} />;
      case 'exportar':
      case 'importar':
      case 'manutencao': return <ConfigDados activeTab={activeSection} />;
      case 'sobre': return <ConfigSobre />;
      default: return <ConfigEmpresa />;
    }
  };

  return (
    <div className="flex h-[calc(100vh-80px)]">
      {/* Left sidebar navigation */}
      <div className="w-[260px] shrink-0 border-r border-border bg-muted/30">
        <div className="p-4 pb-3">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            ⚙️ Configurações
          </h2>
        </div>
        <ScrollArea className="h-[calc(100%-52px)]">
          <nav className="px-2 pb-4 space-y-0.5">
            {menuItems.map(item => {
              const isExpanded = expandedMenu.includes(item.id);
              const hasChildren = item.children.length > 0;
              const isChildActive = item.children.some(c => c.id === activeSection);
              const isSobreActive = item.id === 'sobre' && activeSection === 'sobre';

              return (
                <div key={item.id}>
                  <button
                    onClick={() => {
                      if (hasChildren) {
                        toggleMenu(item.id);
                      } else {
                        handleSelectSection(item.id);
                      }
                    }}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      (isChildActive || isSobreActive)
                        ? 'text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {hasChildren && (
                      <ChevronRight className={cn(
                        'h-3.5 w-3.5 transition-transform duration-200',
                        isExpanded && 'rotate-90'
                      )} />
                    )}
                  </button>
                  {hasChildren && isExpanded && (
                    <div className="ml-6 mt-0.5 space-y-0.5 border-l border-border pl-3">
                      {item.children.map(child => (
                        <button
                          key={child.id}
                          onClick={() => handleSelectSection(child.id)}
                          className={cn(
                            'w-full text-left px-2.5 py-1.5 rounded-md text-[13px] transition-colors',
                            activeSection === child.id
                              ? 'bg-primary text-primary-foreground font-medium'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                          )}
                        >
                          {child.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </ScrollArea>
      </div>

      {/* Right content area */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
