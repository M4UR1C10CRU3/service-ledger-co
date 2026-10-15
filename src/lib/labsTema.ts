/**
 * Identidade do Clariza Labs: as fontes da Webtech Labs e o tema escuro.
 *
 * As fontes (Cabinet Grotesk, Inter e JetBrains Mono, os mesmos ficheiros do
 * site webtechinformatica.com) só se descarregam quando uma empresa Labs está
 * ativa — as outras empresas não pagam o peso de fontes que não usam.
 * O resto do tema é CSS puro, em src/styles/labs.css, acionado pelo atributo
 * data-vertical="labs" que o EmpresaContext escreve.
 */
const FONTES = [
  'https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@500,700,800,900&display=swap',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap',
];

export function carregarFontesLabs() {
  for (const href of FONTES) {
    if (document.querySelector(`link[data-labs-fonte="${href}"]`)) continue;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.labsFonte = href;
    document.head.appendChild(link);
  }
}

/** Liga a identidade Labs já, sem esperar que a empresa seja escolhida. */
export function ativarTemaLabs() {
  const root = document.documentElement;
  root.setAttribute('data-vertical', 'labs');
  // O Labs é só escuro, como o site. Os componentes com variantes `dark:`
  // precisam da classe para escolher as cores certas.
  root.classList.add('dark');
  root.classList.remove('light');
  root.style.colorScheme = 'dark';
  carregarFontesLabs();
}
