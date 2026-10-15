import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Briefcase, Users, FileText, Target, Clock,
  ShoppingCart, Truck, Package, BoxSelect,
  Factory, Receipt, ClipboardList,
  Wallet, TrendingUp, CreditCard, AlertTriangle, BarChart3, PieChart,
  UsersRound, HardHat, Handshake, UserSearch, ClipboardCheck,
  Settings, LogOut, Building2, ChevronDown, History, ScrollText,
  UserCog, Megaphone, Trello, KeyRound, Building, Lightbulb, ShoppingBag, Star,
  GraduationCap, BookOpen, CalendarDays, Award, UserRound, LayoutGrid, Activity,
  FolderKanban, ListTodo, Repeat, Zap, Inbox, ShieldCheck, Landmark, DoorOpen, Wrench, Code, Rocket, Camera, Server, Mic,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useAgencyPais } from '@/hooks/useAgencyPais';
import { useNucleos } from '@/hooks/useNucleos';
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
import { nomeProduto, segmentoVertical } from '@/lib/verticais';

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
  /** Se definido, a secção só aparece para estas empresas (por slug) */
  apenasEmpresas?: string[];
  /** Se definido, a secção só aparece para empresas destes verticais */
  apenasVerticais?: string[];
}

// ── Secções partilhadas ──────────────────────────────────────────────────────
//
// Comercial, Financeiro e Recursos Humanos estavam escritos à letra em cada um
// dos menus. Ficam aqui uma vez só, mas SÓ o que era mesmo igual: o Comercial
// da Agência é outro (Avenças, catálogo), o Financeiro dela é mais curto, e o
// RH do ITC não tem Subempreiteiros porque isso é da obra. Essas diferenças são
// deliberadas e continuam onde estavam.

const SECCAO_COMERCIAL: NavSection = {
  label: 'Comercial',
  icon: Briefcase,
  items: [
    { title: 'Clientes',             url: '/clientes',           icon: Users,         permModulo: 'clientes' },
    { title: 'Pedidos de Orçamento', url: '/pedidos-orcamento',  icon: ClipboardList, permModulo: 'pedidos_orcamento' },
    { title: 'Propostas',            url: '/propostas',          icon: FileText,      permModulo: 'propostas' },
    { title: 'Workflow Comercial',   url: '/workflow-comercial', icon: Target,        permModulo: 'followup' },
  ],
};

const SECCAO_FINANCEIRO: NavSection = {
  label: 'Financeiro',
  icon: Wallet,
  items: [
    { title: 'Receitas',             url: '/receitas',               icon: TrendingUp,   permModulo: 'financeiro_receitas' },
    { title: 'Despesas',             url: '/despesas',               icon: CreditCard,   permModulo: 'financeiro_despesas' },
    { title: 'Contas a Pagar',       url: '/contas-pagar',           icon: Receipt,      permModulo: 'financeiro_despesas' },
    { title: 'Dashboard Financeiro', url: '/contas-pagar/dashboard', icon: PieChart,     permModulo: 'financeiro_despesas' },
    { title: 'Relatório Gerencial',  url: '/relatorio-gerencial',    icon: BarChart3,    permModulo: 'financeiro_receitas' },
    { title: 'Débitos',              url: '/debitos',                icon: AlertTriangle,permModulo: 'financeiro_debitos' },
    { title: 'Workflow Financeiro',  url: '/financeiro/kanban',      icon: Trello,       permModulo: 'financeiro_debitos' },
    { title: 'Histórico Cobranças',  url: '/historico-cobrancas',    icon: History,      permModulo: 'financeiro_debitos' },
    { title: 'Fluxo de Caixa',       url: '/fluxo-caixa',            icon: Wallet,       permModulo: 'financeiro_fluxo' },
  ],
};

/**
 * O RH é comum a todos os verticais — a escola contrata, controla ponto e
 * avalia como qualquer outra empresa. Só "Subempreiteiros" é da obra: os
 * instrutores externos do ITC têm cadastro próprio em Pedagógico › Instrutores.
 */
const seccaoRH = (opts: { subempreiteiros: boolean }): NavSection => ({
  label: 'Recursos Humanos',
  icon: UsersRound,
  items: [
    { title: 'Colaboradores',     url: '/colaboradores',                  icon: HardHat,        permModulo: 'rh_colaboradores' },
    { title: 'Funções',           url: '/recursos-humanos/funcoes',       icon: ClipboardCheck, permModulo: 'rh_colaboradores' },
    { title: 'Controlo de Ponto', url: '/controle-ponto',                 icon: Clock,          permModulo: 'rh_ponto' },
    { title: 'Recrutamento',      url: '/recursos-humanos/recrutamento',  icon: UserSearch,     permModulo: 'rh_recrutamento' },
    { title: 'Avaliações',        url: '/recursos-humanos/avaliacoes',    icon: ClipboardCheck, permModulo: 'rh_avaliacoes' },
    { title: 'Acolhimento',       url: '/recursos-humanos/acolhimento',   icon: DoorOpen,       permModulo: 'rh_acolhimento' },
    ...(opts.subempreiteiros
      ? [{ title: 'Subempreiteiros', url: '/subempreiteiros', icon: Handshake, permModulo: 'rh_subempreiteiros' }]
      : []),
  ],
});

/**
 * Administrativo — comum a TODAS as empresas, em qualquer vertical e em
 * qualquer país. Alvarás e certidões não são coisa de escola nem de obra.
 */
/**
 * Produção de conteúdo. Nasceu para a Tudo Casa, mas o modelo sempre foi
 * multiempresa (empresa_id em todas as tabelas) — só nunca tinha sido aberto.
 * É o fluxo que uma agência precisa e que os Jobs não dão: kanban de estados,
 * checklist de revisão, aprovação, entregas e calendário editorial.
 *
 * A geração com IA continua a ser da Tudo Casa: é conteúdo de loja, não de
 * agência (o gate está dentro da própria página, em 'isTudoCasa').
 */
const ITENS_MARKETING: NavItem[] = [
  { title: 'Kanban',               url: '/marketing',            icon: Trello },
  { title: 'Calendário Editorial', url: '/marketing/calendario', icon: Clock  },
];

const SECCAO_ADMINISTRATIVO: NavSection = {
  label: 'Administrativo',
  icon: Building,
  items: [
    { title: 'Licenciamentos',          url: '/administrativo/licenciamentos', icon: ShieldCheck, permModulo: 'administrativo' },
    { title: 'Planeamento Estratégico', url: '/administrativo/planeamento',    icon: Lightbulb,   permModulo: 'administrativo' },
  ],
};

// ── Secções para empresas de negócio (Obrajusta, Tudo Casa, Resiserv…) ────────
// Fase 2 (01/10/2026): os quatro Workflows antigos saem do menu das empresas
// do grupo — a equipa trabalha nos Quadros (Workflow Comercial sem uso desde
// 19/06/2026; Compras, Produção e Financeiro com 1 registo cada). Os dados
// ficam intactos e as páginas continuam a abrir pelo endereço.
const WORKFLOWS_ANTIGOS = ["/workflow-comercial", "/workflow-compras", "/workflow-producao", "/financeiro/kanban"];
const semWorkflows = (s: NavSection): NavSection => ({ ...s, items: s.items.filter(i => !WORKFLOWS_ANTIGOS.includes(i.url)) });

const sectionsGeral: NavSection[] = [
  semWorkflows(SECCAO_COMERCIAL),
  {
    label: 'Compras',
    icon: ShoppingCart,
    items: [
      { title: 'Notas de Encomenda', url: '/notas-encomenda',   icon: ClipboardList, permModulo: 'compras' },
      { title: 'Compras',            url: '/compras',            icon: ShoppingCart,  permModulo: 'compras' },
      { title: 'Fornecedores',       url: '/fornecedores',       icon: Truck,         permModulo: 'fornecedores' },
      { title: 'Gestão de Stocks',   url: '/stocks',             icon: Package,       permModulo: 'stocks' },
      { title: 'Produtos',           url: '/produtos',           icon: BoxSelect,     permModulo: 'produtos' },
    ],
  },
  {
    label: 'Produção',
    icon: Factory,
    items: [
      { title: 'Vendas / Serviços',  url: '/vendas',              icon: Receipt,       permModulo: 'vendas' },
      { title: 'Ordens de Serviço',  url: '/ordens-servico',      icon: ClipboardList, permModulo: 'ordens_servico' },
    ],
  },
  semWorkflows(SECCAO_FINANCEIRO),
  seccaoRH({ subempreiteiros: true }),
  {
    label: 'Marketing',
    icon: Megaphone,
    apenasEmpresas: ['tudocasa', 'obrajusta'], // Tudo Casa Warm + Obrajusta II
    items: ITENS_MARKETING,
  },
  {
    label: 'E-commerce',
    icon: ShoppingBag,
    apenasEmpresas: ['tudocasa'], // exclusivo Tudo Casa Warm
    items: [
      { title: 'Inteligência Competitiva', url: '/ecommerce/inteligencia', icon: ShoppingBag },
      { title: 'Pesquisa de Satisfação',   url: '/ecommerce/satisfacao',   icon: Star        },
    ],
  },
  {
    // Só o Build concorre a obras públicas. Condicionado pelo vertical, não
    // pelo slug — cobre a Obrajusta II e a Obrajusta Gestão sem lista à mão.
    label: 'Concursos Públicos',
    icon: Landmark,
    apenasVerticais: ['build'],
    items: [
      { title: 'Concursos', url: '/concursos', icon: Landmark, permModulo: 'concursos' },
    ],
  },
  SECCAO_ADMINISTRATIVO,
];

// ── Secções para ITC Educa Pro (Clariza School) ───────────────────────────────
//
// O que é da escola é próprio (Pedagógico, Portais); o resto é o Clariza de
// sempre. Financeiro, Comercial e Recursos Humanos são iguais em todos os
// verticais — uma escola fatura, cobra, contrata e avalia como qualquer outra
// empresa. Cada uma destas páginas filtra por empresa ou por grupo, e o ITC é
// um grupo só dele: não vê nem é visto pelas empresas do grupo Obrajusta.
const sectionsITC: NavSection[] = [
  {
    label: 'Pedagógico',
    icon: GraduationCap,
    items: [
      { title: 'Cursos',            url: '/school/cursos',       icon: BookOpen     },
      { title: 'Instrutores',         url: '/school/instrutores',    icon: UserRound    },
      { title: 'Gestão de Alunos',   url: '/school/alunos',         icon: Users        },
      { title: 'Turmas',             url: '/school/turmas',         icon: ClipboardList},
      { title: 'Calendarização',     url: '/school/calendario',     icon: CalendarDays },
      { title: 'Matrículas',         url: '/school/matriculas',     icon: ClipboardList},
      { title: 'Certificados',       url: '/school/certificados',   icon: Award        },
      { title: 'Clientes Corporat.', url: '/school/clientes-corp',  icon: Building2    },
      { title: 'Pedidos de Formação', url: '/school/pedidos',       icon: Inbox        },
    ],
  },
  SECCAO_COMERCIAL,
  SECCAO_FINANCEIRO,
  seccaoRH({ subempreiteiros: false }),
  {
    label: 'Portais',
    icon: LayoutGrid,
    items: [
      { title: 'Portal do Aluno',       url: '/portal/aluno',        icon: UserRound   },
      { title: 'Portal do Instrutor',   url: '/portal/instrutor',    icon: GraduationCap },
      { title: 'Portal Corporativo',    url: '/portal/corporativo',  icon: Building2   },
    ],
  },
  {
    label: 'Relatórios',
    icon: BarChart3,
    items: [
      { title: 'Relatórios Pedagógicos', url: '/dashboard-executivo',   icon: GraduationCap },
      { title: 'Relatórios Financeiros', url: '/relatorio-gerencial',   icon: PieChart,     permModulo: 'financeiro_receitas' },
      { title: 'Relatórios de RH',       url: '/colaboradores',         icon: UsersRound,   permModulo: 'rh_colaboradores'    },
    ],
  },
  SECCAO_ADMINISTRATIVO,
];

// ── Menu do Clariza Agency (vertical de Agência de Marketing) ────────────────
// SUBSTITUI o menu genérico — não o complementa. Uma agência não tem stocks,
// nem ordens de serviço de obra, nem subempreiteiros; ter esses módulos no menu
// faria o vertical parecer uma cópia do Clariza de construção com uma secção
// colada por cima. Aqui só entra o que serve o negócio de uma agência.
//
// Deliberadamente FORA: Compras/Workflow Compras/Stocks/Produtos (uma agência
// não gere armazém), Produção/Ordens de Serviço/Workflow Produção (obra),
// Subempreiteiros, E-commerce (é da Tudo Casa), e o módulo Marketing antigo —
// que está preso à Tudo Casa por slug e é superado pelos Jobs.
//
// Ligado por DADOS (ag_empresas_vertical), não por slug escrito no código como
// o School: ativar uma agência nova não exige recompilar a aplicação.
const sectionsAgency: NavSection[] = [
  {
    label: 'Agência',
    icon: FolderKanban,
    items: [
      { title: 'Projetos',          url: '/agency/projetos',       icon: FolderKanban },
      { title: 'Os meus trabalhos', url: '/agency/meus-trabalhos', icon: ListTodo     },
      { title: 'Rentabilidade',     url: '/agency/rentabilidade',  icon: TrendingUp   },
      { title: 'Automações',        url: '/agency/automacoes',     icon: Zap          },
    ],
  },
  {
    label: 'Produção de Conteúdo',
    icon: Megaphone,
    items: ITENS_MARKETING,
  },
  {
    label: 'Comercial',
    icon: Briefcase,
    items: [
      { title: 'Clientes',            url: '/clientes',            icon: Users,         permModulo: 'clientes' },
      { title: 'Pedidos de Orçamento',url: '/pedidos-orcamento',   icon: ClipboardList, permModulo: 'pedidos_orcamento' },
      { title: 'Propostas',           url: '/agency/propostas',    icon: FileText },
      { title: 'Avenças',             url: '/agency/avencas',      icon: Repeat },
      { title: 'Workflow Comercial',  url: '/workflow-comercial',  icon: Target,        permModulo: 'followup' },
      { title: 'Catálogo e textos',   url: '/agency/catalogo',     icon: BookOpen },
    ],
  },
  {
    label: 'Fornecedores',
    icon: Truck,
    items: [
      { title: 'Fornecedores',       url: '/fornecedores',    icon: Truck,         permModulo: 'fornecedores' },
      { title: 'Notas de Encomenda', url: '/notas-encomenda', icon: ClipboardList, permModulo: 'compras' },
    ],
  },
  {
    label: 'Financeiro',
    icon: Wallet,
    items: [
      { title: 'Receitas',            url: '/receitas',            icon: TrendingUp, permModulo: 'financeiro_receitas' },
      { title: 'Despesas',            url: '/despesas',            icon: CreditCard, permModulo: 'financeiro_despesas' },
      { title: 'Contas a Pagar',      url: '/contas-pagar',        icon: Receipt,    permModulo: 'financeiro_despesas' },
      { title: 'Fluxo de Caixa',      url: '/fluxo-caixa',         icon: Wallet,     permModulo: 'financeiro_fluxo' },
      { title: 'Relatório Gerencial', url: '/relatorio-gerencial', icon: BarChart3,  permModulo: 'financeiro_receitas' },
    ],
  },
  {
    label: 'Equipa',
    icon: UsersRound,
    items: [
      { title: 'Funções',           url: '/agency/equipa',                 icon: UsersRound },
      { title: 'Colaboradores',     url: '/colaboradores',                 icon: UserRound,     permModulo: 'rh_colaboradores' },
      { title: 'Controlo de Ponto', url: '/controle-ponto',                icon: Clock,         permModulo: 'rh_ponto' },
      { title: 'Recrutamento',      url: '/recursos-humanos/recrutamento', icon: UserSearch,    permModulo: 'rh_recrutamento' },
      { title: 'Avaliações',        url: '/recursos-humanos/avaliacoes',   icon: ClipboardCheck,permModulo: 'rh_avaliacoes' },
    ],
  },
  SECCAO_ADMINISTRATIVO,
];

// ── Menu do Clariza Labs (estúdio de tecnologia: Webtech Labs) ───────────────
// O motor é o do Agency (Projetos, Jobs, Propostas, Avenças) e entra por
// /labs/*. A diferença está no que um estúdio de tecnologia vende além do
// trabalho criativo: assistência e venda de hardware (Tech Care), material e
// instalações (Infra), por isso Produtos e Stocks voltam ao menu — que o
// Agency deixou de fora de propósito — e cada núcleo tem a sua página com os
// atalhos do seu dia a dia (ver NucleoPainel).
// Os módulos novos (ativos dos clientes, SLA, renovações, podcast, painel por
// núcleo) entram aqui à medida que as fases forem feitas.
const sectionsLabs: NavSection[] = [
  {
    label: 'Labs',
    icon: FolderKanban,
    items: [
      { title: 'Painel',            url: '/labs/painel',         icon: LayoutGrid   },
      { title: 'Workflow de Produção', url: '/labs/producao',    icon: Trello       },
      { title: 'Projetos',          url: '/labs/projetos',       icon: FolderKanban },
      { title: 'Os meus trabalhos', url: '/labs/meus-trabalhos', icon: ListTodo     },
      { title: 'Rentabilidade',     url: '/labs/rentabilidade',  icon: TrendingUp   },
      { title: 'Automações',        url: '/labs/automacoes',     icon: Zap          },
    ],
  },
  {
    label: 'Comercial',
    icon: Briefcase,
    items: [
      { title: 'Clientes',             url: '/clientes',           icon: Users,         permModulo: 'clientes' },
      { title: 'Pedidos de Orçamento', url: '/pedidos-orcamento',  icon: ClipboardList, permModulo: 'pedidos_orcamento' },
      { title: 'Propostas',            url: '/labs/propostas',     icon: FileText },
      { title: 'Avenças',              url: '/labs/avencas',       icon: Repeat },
      { title: 'Workflow Comercial',   url: '/workflow-comercial', icon: Target,        permModulo: 'followup' },
      // Ao lado do comercial de propósito: o que é adjudicado continua aqui (15/10/2026).
      { title: 'Workflow de Produção', url: '/labs/producao',      icon: Trello },
      { title: 'Área de cliente',      url: '/labs/area-cliente',  icon: KeyRound },
      { title: 'Catálogo e textos',    url: '/labs/catalogo',      icon: BookOpen },
    ],
  },
  // Sem secção «Tech Care» aqui: o Tech Care é um NÚCLEO e tem a sua entrada
  // na secção Núcleos (montada no componente). As Assistências e as Vendas
  // abrem-se a partir da página desse núcleo, para não haver duas portas para
  // o mesmo negócio. Produtos e Stocks servem também a Infra, por isso ficam
  // aqui, junto das compras.
  {
    label: 'Compras e stock',
    icon: Truck,
    items: [
      { title: 'Fornecedores',       url: '/fornecedores',    icon: Truck,         permModulo: 'fornecedores' },
      { title: 'Notas de Encomenda', url: '/notas-encomenda', icon: ClipboardList, permModulo: 'compras' },
      { title: 'Produtos',           url: '/produtos',        icon: BoxSelect,     permModulo: 'produtos' },
      { title: 'Gestão de Stocks',   url: '/stocks',          icon: Package,       permModulo: 'stocks' },
    ],
  },
  {
    label: 'Financeiro',
    icon: Wallet,
    items: [
      { title: 'Receitas',            url: '/receitas',            icon: TrendingUp, permModulo: 'financeiro_receitas' },
      { title: 'Despesas',            url: '/despesas',            icon: CreditCard, permModulo: 'financeiro_despesas' },
      { title: 'Contas a Pagar',      url: '/contas-pagar',        icon: Receipt,    permModulo: 'financeiro_despesas' },
      { title: 'Fluxo de Caixa',      url: '/fluxo-caixa',         icon: Wallet,     permModulo: 'financeiro_fluxo' },
      { title: 'Relatório Gerencial', url: '/relatorio-gerencial', icon: BarChart3,  permModulo: 'financeiro_receitas' },
    ],
  },
  {
    label: 'Equipa',
    icon: UsersRound,
    items: [
      { title: 'Funções',           url: '/labs/equipa',                   icon: UsersRound },
      { title: 'Colaboradores',     url: '/colaboradores',                 icon: UserRound,     permModulo: 'rh_colaboradores' },
      { title: 'Controlo de Ponto', url: '/controle-ponto',                icon: Clock,         permModulo: 'rh_ponto' },
      { title: 'Recrutamento',      url: '/recursos-humanos/recrutamento', icon: UserSearch,    permModulo: 'rh_recrutamento' },
      { title: 'Avaliações',        url: '/recursos-humanos/avaliacoes',   icon: ClipboardCheck,permModulo: 'rh_avaliacoes' },
    ],
  },
];

// Ícone de cada núcleo do Labs, pelo código (lb_nucleos.codigo). Um núcleo
// novo sem ícone aqui aparece com o ícone genérico.
const ICONE_NUCLEO: Record<string, React.ElementType> = {
  estrategia: Lightbulb, produto: Code, growth: Rocket,
  criativo: Camera, infra: Server, techcare: Wrench,
};

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { empresa, empresas, getLogo, setEmpresa } = useEmpresa();
  const { can, isAdmin } = usePermissions();
  const { verticalAtivo: agencyAtivo } = useAgencyPais();
  const { nucleos } = useNucleos();

  const logo = getLogo();
  const empresaNome = empresa?.nome || 'Obrajusta';

  // Nome do produto e segmento da empresa ativa. Só texto: nada aqui decide
  // que menu se mostra nem que permissões existem.
  const segmento = {
    produto: nomeProduto(empresa?.vertical),
    segmento: segmentoVertical(empresa?.vertical),
  };

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

  // Cada vertical tem o SEU menu — não o menu genérico com uma secção colada
  // por cima. Uma agência não gere stocks nem obras; uma escola não gere
  // produção. Ordem: Labs → Agency (por dados) → School (por slug, legado) →
  // genérico. O Labs vem primeiro porque também tem o Agency ativo (é o mesmo
  // motor) e, sem isto, apanhava o menu da agência.
  const isITC = empresa?.slug === 'itc' || empresa?.slug === 'itc-educa-pro';
  // No Labs, a segunda secção é feita dos núcleos da empresa (vêm da base de
  // dados), mais o podcast — cada negócio com a sua entrada no menu.
  const seccaoNucleos: NavSection = {
    label: 'Núcleos',
    icon: LayoutGrid,
    items: [
      ...nucleos.map(n => ({ title: n.nome, url: `/labs/nucleos/${n.codigo}`, icon: ICONE_NUCLEO[n.codigo] ?? LayoutGrid })),
      { title: 'Podcast Zeros e Uns', url: '/labs/podcast', icon: Mic },
    ],
  };
  const activeSections = empresa?.vertical === 'labs'
    ? [sectionsLabs[0], seccaoNucleos, ...sectionsLabs.slice(1)]
    : agencyAtivo
      ? sectionsAgency
      : isITC ? sectionsITC : sectionsGeral;

  // Filter sections by empresa slug (apenasEmpresas) + filter items by permission
  const visibleSections = activeSections
    .filter(section =>
      !section.apenasEmpresas ||
      (empresa?.slug != null && section.apenasEmpresas.includes(empresa.slug))
    )
    .filter(section =>
      !section.apenasVerticais ||
      (empresa?.vertical != null && section.apenasVerticais.includes(empresa.vertical))
    )
    .map(section => ({
      ...section,
      items: section.items.filter(item => !item.permModulo || can(item.permModulo, 'ver')),
    }))
    .filter(section => section.items.length > 0);

  const sectionHasActive = (items: NavItem[]) => items.some(i => isActive(i.url));

  return (
    <Sidebar className="border-r border-sidebar-border">
      {/* Cabeçalho — três informações, por esta ordem:
          1. em que PRODUTO se está (Clariza + vertical)
          2. em que EMPRESA se está trabalhar
          3. de que SEGMENTO é essa empresa

          O logótipo do cliente é o que já existia e vem da mesma função de
          sempre; só mudou o contentor à volta. */}
      <SidebarHeader className="p-3.5 pb-3">
        {/* Marca do produto */}
        <div
          className="flex items-baseline gap-1.5 px-1 pb-3 cursor-pointer"
          onClick={() => navigate('/dashboard')}
        >
          {empresa?.vertical === 'labs' ? (
            // Clariza Labs veste a marca do estúdio (15/10/2026): logótipo da Webtech Labs.
            <span className="flex items-center gap-2 min-w-0">
              <img src="/assets/labs/logo-webtech-labs.png" alt="Webtech Labs" className="h-7 w-auto max-w-[150px] object-contain" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Clariza</span>
            </span>
          ) : (
            <span className="text-[15px] font-bold tracking-tight text-white">Clariza</span>
          )}
          {segmento.produto && empresa?.vertical !== 'labs' && (
            <span className="text-[13px] font-semibold text-vertical truncate">
              {segmento.produto.replace(/^Clariza\s*/, '')}
            </span>
          )}
        </div>

        {/* Empresa ativa */}
        <div
          className="flex items-center gap-2.5 rounded-[12px] border border-sidebar-border bg-popover p-2.5 cursor-pointer group"
          onClick={() => navigate('/dashboard')}
        >
          <div className="shrink-0 h-9 w-9 rounded-lg overflow-hidden border border-sidebar-border/60 bg-sidebar-accent/40 flex items-center justify-center">
            <img src={logo} alt={empresaNome} className="w-full h-full object-contain p-0.5" />
          </div>
          <div className="overflow-hidden flex-1 min-w-0">
            <p className="text-[13px] font-bold text-white truncate leading-tight">
              {empresaNome}
            </p>
            <p className="text-[10.5px] text-sidebar-foreground/55 truncate leading-tight mt-0.5">
              {segmento.segmento || 'Em linha'}
            </p>
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
                isActive('/dashboard') && 'bg-vertical-soft text-white font-semibold ring-1 ring-inset ring-vertical-border'
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
                isActive('/dashboard-executivo') && 'bg-vertical-soft text-white font-semibold ring-1 ring-inset ring-vertical-border'
              )}
            >
              <BarChart3 className="h-4 w-4 shrink-0" />
              <span>Dashboard Executivo</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => navigate('/quadros')}
              className={cn(
                'w-full justify-start gap-3 px-3 py-2.5 rounded-xl text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200',
                location.pathname.startsWith('/quadros') && 'bg-vertical-soft text-white font-semibold ring-1 ring-inset ring-vertical-border'
              )}
            >
              <Trello className="h-4 w-4 shrink-0" />
              <span>Quadros</span>
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
                            isActive(item.url) && 'bg-vertical-soft text-white font-semibold ring-1 ring-inset ring-vertical-border'
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
        {/* Só faz sentido com mais do que uma empresa. Quem tem uma só — a
            conta de apresentação do ITC, por exemplo — era levado a um seletor
            sem nada para selecionar. */}
        {empresas.length > 1 && (
          <SidebarMenuButton
            onClick={handleChangeEmpresa}
            className="w-full justify-start gap-3 px-3 py-2 rounded-xl text-[13px] text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all"
          >
            <Building2 className="h-4 w-4 shrink-0" />
            <span>Trocar Empresa</span>
          </SidebarMenuButton>
        )}
        {can('auditoria', 'ver') && (
          <SidebarMenuButton
            onClick={() => navigate('/auditoria')}
            className={cn(
              'w-full justify-start gap-3 px-3 py-2 rounded-xl text-[13px] text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all',
              isActive('/auditoria') && 'bg-vertical-soft text-white font-semibold ring-1 ring-inset ring-vertical-border'
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
            isActive('/alterar-senha') && 'bg-vertical-soft text-white font-semibold ring-1 ring-inset ring-vertical-border'
          )}
        >
          <KeyRound className="h-4 w-4 shrink-0" />
          <span>Alterar Senha</span>
        </SidebarMenuButton>
        <SidebarMenuButton
          onClick={() => navigate('/configuracoes')}
          className={cn(
            'w-full justify-start gap-3 px-3 py-2 rounded-xl text-[13px] text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all',
            location.pathname.startsWith('/configuracoes') && 'bg-vertical-soft text-white font-semibold ring-1 ring-inset ring-vertical-border'
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
