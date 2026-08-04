import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Empresa } from '@/types/empresa';
import { supabase } from '@/integrations/supabase/client';
import { resolveEmpresaDocConfig, type EmpresaDocConfig, type LibertyEmpresaConfigRow } from '@/lib/empresaConfig';

// Logos importados
import logoObrajusta from '@/assets/logo-obrajusta.png';
import logoTudocasa from '@/assets/logo-tudocasa.png';
import logoResiserv from '@/assets/logo-resiserv.jpg';
interface EmpresaContextType {
  empresa: Empresa | null;
  empresas: Empresa[];
  isLoading: boolean;
  setEmpresa: (empresa: Empresa | null) => void;
  setEmpresaBySlug: (slug: string) => void;
  getLogo: () => string;
  getColors: () => { primary: string; secondary: string; accent: string };
  getDocConfig: () => EmpresaDocConfig;
  /** Relê as empresas da BD — usar após gravar logótipo ou cor. */
  recarregarEmpresas: () => Promise<void>;
}

/**
 * Marca de água neutra para empresas sem logótipo: iniciais sobre a cor da
 * própria empresa. Substitui o antigo recurso final, que devolvia o logótipo
 * da Obrajusta — ou seja, emprestava a marca de uma empresa concreta a todas
 * as outras que ainda não tivessem a sua.
 */
export function logoPlaceholder(nome: string, cor: string): string {
  const iniciais = (nome || '?')
    .trim().split(/\s+/).slice(0, 2)
    .map(p => p[0]?.toUpperCase() ?? '').join('');
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    `<rect width="100" height="100" rx="18" fill="${cor || '#64748b'}"/>` +
    `<text x="50" y="50" font-family="system-ui,-apple-system,sans-serif" font-size="40"` +
    ` font-weight="700" fill="#ffffff" text-anchor="middle" dominant-baseline="central">${iniciais}</text>` +
    `</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

const EmpresaContext = createContext<EmpresaContextType | undefined>(undefined);

// Mapeamento de logos por slug
const logoMap: Record<string, string> = {
  obrajusta: logoObrajusta,
  'obrajusta-gestao': logoObrajusta,
  tudocasa: logoTudocasa,
  'tudocasa-matrizcharme': logoTudocasa,
  resiserv: logoResiserv,
  itc: '/logo-itc.png',
  'itc-educa-pro': '/logo-itc.png',
};

/**
 * Logótipo de UMA empresa qualquer — não necessariamente a selecionada.
 * Fonte única: o ecrã de escolha de empresa tinha a sua própria cópia desta
 * lógica (e do mapa de logótipos), o que fez com que a correção do recurso
 * final só apanhasse metade da aplicação. Agora só existe aqui.
 */
export function resolveLogoEmpresa(empresa: Empresa | null): string {
  if (!empresa) return logoPlaceholder('Clariza', '#64748b');
  const path = empresa.logoPath?.trim();
  // URL completa (Supabase Storage ou externa)
  if (path && path.startsWith('http')) return path;
  // Caminhos locais legados tipo "/assets/..." → usar bundle local
  if (path && path.startsWith('/assets/')) {
    return logoMap[empresa.slug] || logoPlaceholder(empresa.nome, empresa.corPrimaria);
  }
  // Caminho relativo no Supabase Storage
  if (path && path !== '') {
    const SUPABASE_URL = 'https://qeskzaodgfveidyeghbm.supabase.co';
    return `${SUPABASE_URL}/storage/v1/object/public/logos/${path}`;
  }
  // Sem logótipo: logótipos locais das empresas antigas, senão as iniciais
  // da própria empresa. NUNCA o logótipo de outra empresa.
  return logoMap[empresa.slug] || logoPlaceholder(empresa.nome, empresa.corPrimaria);
}

export const EmpresaProvider = ({ children }: { children: ReactNode }) => {
  const [empresa, setEmpresaState] = useState<Empresa | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [docConfigRow, setDocConfigRow] = useState<LibertyEmpresaConfigRow | null>(null);

  // Cadastro real da empresa (Configurações → Dados da Empresa) — fonte de
  // verdade para os dados que aparecem nos documentos emitidos (Proposta,
  // Pedido de Orçamento, Nota de Encomenda), não o mapa fixo em código.
  useEffect(() => {
    if (!empresa) { setDocConfigRow(null); return; }
    let cancelled = false;
    (supabase.from('liberty_empresas_config') as any)
      .select('*')
      .eq('empresa_id', empresa.id)
      .maybeSingle()
      .then(({ data }: any) => { if (!cancelled) setDocConfigRow(data || null); });
    return () => { cancelled = true; };
  }, [empresa?.id]);

  // Carregar empresas do Supabase
  const loadEmpresasFromDb = async () => {
    try {
      // Com sessão iniciada, a lista passa a ser SÓ das empresas do utilizador.
      // Antes disso não há identidade nenhuma, por isso o seletor inicial
      // mostra todas — para saltar esse ecrã existe ?empresa=<slug>, que é como
      // o link de demonstração leva o visitante direto ao sítio certo sem lhe
      // mostrar a lista de empresas de outra gente.
      const { data: { user } } = await supabase.auth.getUser();
      let permitidas: string[] = [];
      if (user) {
        const { data: liga } = await (supabase.from('liberty_utilizador_empresas') as any)
          .select('empresa_id, liberty_utilizadores!inner(auth_user_id)')
          .eq('liberty_utilizadores.auth_user_id', user.id);
        permitidas = (liga || []).map((l: any) => l.empresa_id);
      }

      const base = supabase.from('empresas').select('*').order('nome');
      const { data, error } = permitidas.length > 0
        ? await base.in('id', permitidas)
        : await base;

      if (!error && data && data.length > 0) {
        const empresasFormatted = data.map((e: any) => ({
          id: e.id,
          slug: e.slug,
          nome: e.nome,
          nomeLegal: e.nome_legal,
          logoPath: e.logo_path,
          corPrimaria: e.cor_primaria,
          corSecundaria: e.cor_secundaria,
          corAccent: e.cor_accent,
          createdAt: new Date(e.created_at),
          updatedAt: new Date(e.updated_at),
        }));
        setEmpresas(empresasFormatted);
        // A empresa selecionada é uma cópia à parte — sem isto, gravar o
        // logótipo ou a cor não se refletia no ecrã até trocar de empresa.
        setEmpresaState(atual => {
          if (!atual) return atual;
          const fresca = empresasFormatted.find(e => e.id === atual.id);
          if (fresca) applyTheme(fresca);
          return fresca ?? atual;
        });
      }
    } catch (error) {
      console.error('Error loading empresas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Carregar empresas e escutar mudanças de autenticação
  useEffect(() => {
    loadEmpresasFromDb();

    // Recarregar empresas quando o utilizador fizer login
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadEmpresasFromDb();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Quando empresas carregarem, restaurar seleção do localStorage
  useEffect(() => {
    if (empresas.length > 0) {
      const savedEmpresaSlug = localStorage.getItem('selectedEmpresa');
      if (savedEmpresaSlug) {
        const found = empresas.find(e => e.slug === savedEmpresaSlug);
        if (found) {
          setEmpresaState(found);
          applyTheme(found);
        }
      }
    }
  }, [empresas]);

  const applyTheme = (emp: Empresa | null) => {
    const root = document.documentElement;
    
    if (emp) {
      // Converter hex para HSL para usar nas variáveis CSS
      const primaryHsl = hexToHsl(emp.corPrimaria);
      const secondaryHsl = hexToHsl(emp.corSecundaria || '#1e40af');
      const accentHsl = hexToHsl(emp.corAccent || '#60a5fa');
      
      root.style.setProperty('--primary', primaryHsl);
      root.style.setProperty('--primary-foreground', '0 0% 100%');
      root.style.setProperty('--ring', primaryHsl);
      
      // Aplicar classe de tema específica
      root.setAttribute('data-empresa', emp.slug);
    } else {
      // Remover customizações
      root.style.removeProperty('--primary');
      root.style.removeProperty('--primary-foreground');
      root.style.removeProperty('--ring');
      root.removeAttribute('data-empresa');
    }
  };

  const setEmpresa = (emp: Empresa | null) => {
    setEmpresaState(emp);
    if (emp) {
      localStorage.setItem('selectedEmpresa', emp.slug);
      applyTheme(emp);
    } else {
      localStorage.removeItem('selectedEmpresa');
      applyTheme(null);
    }
  };

  const setEmpresaBySlug = (slug: string) => {
    const found = empresas.find(e => e.slug === slug);
    if (found) {
      setEmpresa(found);
    }
  };

  const getLogo = (): string => resolveLogoEmpresa(empresa);

  const getDocConfig = (): EmpresaDocConfig =>
    resolveEmpresaDocConfig(empresa?.slug, empresa?.nomeLegal || empresa?.nome, docConfigRow);

  const getColors = () => {
    if (!empresa) {
      return { primary: '#3b82f6', secondary: '#1e40af', accent: '#60a5fa' };
    }
    return {
      primary: empresa.corPrimaria,
      secondary: empresa.corSecundaria || '#000000',
      accent: empresa.corAccent || '#ffd700',
    };
  };

  return (
    <EmpresaContext.Provider
      value={{
        empresa,
        empresas,
        isLoading,
        setEmpresa,
        setEmpresaBySlug,
        getLogo,
        getColors,
        getDocConfig,
        recarregarEmpresas: loadEmpresasFromDb,
      }}
    >
      {children}
    </EmpresaContext.Provider>
  );
};

export const useEmpresa = (): EmpresaContextType => {
  const context = useContext(EmpresaContext);
  if (context === undefined) {
    throw new Error('useEmpresa must be used within an EmpresaProvider');
  }
  return context;
};

// Utility: Converter Hex para HSL string
function hexToHsl(hex: string): string {
  // Remove # se presente
  hex = hex.replace('#', '');
  
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
