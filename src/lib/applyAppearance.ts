// Centraliza a aplicação das preferências de aparência (tema, densidade, fonte)

export type Tema = 'claro' | 'escuro' | 'sistema';
export type Densidade = 'compacto' | 'normal' | 'espaçoso';

export interface AppearancePrefs {
  tema?: Tema | string;
  densidade?: Densidade | string;
  tamanhoFonte?: number;
  sidebarExpandida?: boolean;
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

  // Reagir a mudanças do tema do sistema
  if (prefs.tema === 'sistema') {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener?.('change', () => applyTema('sistema'));
  }
}
