/**
 * Os verticais do produto Clariza.
 *
 * Um vertical é o SEGMENTO da empresa — o que decide o nome do produto que se
 * mostra ("Clariza Store"), o vocabulário e a cor de acento. Toda a empresa
 * tem um; é identidade, não permissão.
 *
 * Não confundir com ter ENTRADA PRÓPRIA. O Clariza School é vendido como
 * produto separado e entra por /school, por isso o ITC não aparece no seletor
 * geral de empresas. Os outros verticais partilham a entrada normal.
 *
 * Esta distinção existe porque foram confundidos uma vez: o seletor escondia
 * "quem tem vertical", e no dia em que todas as empresas passaram a ter um,
 * o seletor teria ficado vazio e ninguém entrava. A condição certa é a
 * entrada própria, não o vertical.
 */

export type Vertical = 'store' | 'build' | 'flow' | 'agency' | 'school' | 'labs';

export interface DefinicaoVertical {
  /** Nome do produto, como aparece ao lado da marca. */
  produto: string;
  /** Segmento, para a linha de contexto por baixo do nome da empresa. */
  segmento: string;
}

export const VERTICAIS: Record<Vertical, DefinicaoVertical> = {
  store:  { produto: 'Clariza Store',     segmento: 'Retalho & E-commerce' },
  build:  { produto: 'Clariza Build',     segmento: 'Construção & Obras' },
  flow:   { produto: 'Clariza Flow',      segmento: 'Serviços & Operações' },
  agency: { produto: 'Clariza Agency',    segmento: 'Marketing & Comunicação' },
  school: { produto: 'Clariza Educa Pro', segmento: 'Cursos & E-learning' },
  // O Labs é o Agency alargado a um estúdio de tecnologia com vários núcleos
  // (consultoria, produto digital, growth, criativo, infra, loja e assistência)
  // e veste a identidade do próprio estúdio em vez da da Clariza.
  labs:   { produto: 'Clariza Labs',      segmento: 'Tecnologia & Serviços Digitais' },
};

/**
 * Verticais com ecrã de entrada próprio. Só estes saem do seletor geral.
 *
 * O School entra por /school e o Agency por /agency. Consequência a ter
 * presente: o ITC, o Elo Giro e a Agência Demo DEIXAM de aparecer no Workspace
 * do grupo — é o que faz deles ambientes separados, e não uma linha na lista
 * de empresas de outra gente.
 */
export const VERTICAIS_COM_ENTRADA_PROPRIA: Vertical[] = ['school', 'agency', 'labs'];

export const temEntradaPropria = (v?: string | null): boolean =>
  Boolean(v) && (VERTICAIS_COM_ENTRADA_PROPRIA as string[]).includes(v as string);

/** Nome do produto para um vertical; "Clariza" quando não há vertical. */
export const nomeProduto = (v?: string | null): string =>
  (v && VERTICAIS[v as Vertical]?.produto) || 'Clariza';

/** Segmento da empresa; vazio quando não há vertical definido. */
export const segmentoVertical = (v?: string | null): string =>
  (v && VERTICAIS[v as Vertical]?.segmento) || '';
