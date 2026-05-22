// Centraliza a aplicação das preferências de aparência (tema, densidade, fonte)

export type Tema = 'claro' | 'escuro' | 'sistema';
export type Densidade = 'compacto' | 'normal' | 'espaçoso';

export interface AppearancePrefs {
  tema?: Tema | string;
  densidade?: Densidade | string;
  tamanhoFonte?: number;
  sidebarExpandida?: boolean;
  sidebarCor?: string; // preset id or custom hex
}

export interface SidebarPreset {
  id: string;
  label: string;
  description: string;
  bg: string; // HSL "H S% L%"
  fg: string;
  accent: string;
  accentFg: string;
  border: string;
}

export const SIDEBAR_PRESETS: SidebarPreset[] = [
  { id: 'padrao', label: 'Padrão (Escuro)', description: 'Tema original do Liberty', bg: '220 30% 12%', fg: '220 10% 85%', accent: '220 25% 18%', accentFg: '0 0% 100%', border: '220 25% 18%' },
  { id: 'preto-profundo', label: 'Preto Profundo', description: 'Máximo contraste para baixa luz', bg: '0 0% 6%', fg: '0 0% 92%', accent: '0 0% 14%', accentFg: '0 0% 100%', border: '0 0% 16%' },
  { id: 'azul-marinho', label: 'Azul Marinho', description: 'Tom corporativo suave', bg: '215 50% 14%', fg: '210 20% 90%', accent: '215 40% 22%', accentFg: '0 0% 100%', border: '215 40% 22%' },
  { id: 'cinza-suave', label: 'Cinza Suave', description: 'Neutro e descansado', bg: '220 8% 22%', fg: '220 8% 92%', accent: '220 8% 30%', accentFg: '0 0% 100%', border: '220 8% 30%' },
  { id: 'bege-claro', label: 'Bege Claro', description: 'Tom claro com pouco brilho', bg: '40 25% 92%', fg: '30 20% 18%', accent: '40 25% 84%', accentFg: '30 20% 12%', border: '40 20% 80%' },
  { id: 'branco-suave', label: 'Branco Suave', description: 'Tema claro elegante', bg: '0 0% 98%', fg: '220 15% 20%', accent: '220 15% 92%', accentFg: '220 15% 15%', border: '220 15% 88%' },
  { id: 'alto-contraste', label: 'Alto Contraste', description: 'Acessibilidade máxima (WCAG AAA)', bg: '0 0% 0%', fg: '60 100% 90%', accent: '0 0% 18%', accentFg: '60 100% 95%', border: '60 100% 50%' },
  { id: 'verde-escuro', label: 'Verde Escuro', description: 'Tom natural relaxante', bg: '155 35% 12%', fg: '150 15% 88%', accent: '155 30% 20%', accentFg: '0 0% 100%', border: '155 30% 20%' },
];

export function applySidebarCor(id?: string) {
  const root = document.documentElement;
  const preset = SIDEBAR_PRESETS.find(p => p.id === id) || SIDEBAR_PRESETS[0];
  root.style.setProperty('--sidebar-background', preset.bg);
  root.style.setProperty('--sidebar-foreground', preset.fg);
  root.style.setProperty('--sidebar-accent', preset.accent);
  root.style.setProperty('--sidebar-accent-foreground', preset.accentFg);
  root.style.setProperty('--sidebar-border', preset.border);
}

const STORAGE_KEY = 'liberty_appearance';

export function applyTema(tema: string) {
  const root = document.documentElement;
  let effective: 'dark' | 'light' = 'dark';

  if (tema === 'claro') effective = 'light';
  else if (tema === 'escuro') effective = 'dark';
  else if (tema === 'sistema') {
    effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  if (effective === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }
  root.style.colorScheme = effective;
}

export function applyDensidade(densidade: string) {
  const root = document.documentElement;
  root.dataset.densidade = densidade;
  // Pequenas variações de espaçamento via CSS var
  if (densidade === 'compacto') {
    root.style.setProperty('--app-density-scale', '0.92');
  } else if (densidade === 'espaçoso') {
    root.style.setProperty('--app-density-scale', '1.1');
  } else {
    root.style.setProperty('--app-density-scale', '1');
  }
}

export function applyFonte(tamanho: number) {
  document.documentElement.style.fontSize = `${tamanho}px`;
}

export function applyAppearance(prefs: AppearancePrefs) {
  if (prefs.tema) applyTema(prefs.tema);
  if (prefs.densidade) applyDensidade(prefs.densidade);
  if (typeof prefs.tamanhoFonte === 'number') applyFonte(prefs.tamanhoFonte);
  if (prefs.sidebarCor) applySidebarCor(prefs.sidebarCor);
  saveAppearance(prefs);
}

export function saveAppearance(prefs: AppearancePrefs) {
  try {
    const existing = loadAppearance();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...prefs }));
  } catch {}
}

export function loadAppearance(): AppearancePrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

// Aplica preferências guardadas no arranque (chamado no main.tsx)
export function bootstrapAppearance() {
  const prefs = loadAppearance();
  applyTema(prefs.tema || 'escuro');
  applyDensidade(prefs.densidade || 'normal');
  applyFonte(typeof prefs.tamanhoFonte === 'number' ? prefs.tamanhoFonte : 14);
  if (prefs.sidebarCor) applySidebarCor(prefs.sidebarCor);

  // Reagir a mudanças do tema do sistema
  if (prefs.tema === 'sistema') {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener?.('change', () => applyTema('sistema'));
  }
}
