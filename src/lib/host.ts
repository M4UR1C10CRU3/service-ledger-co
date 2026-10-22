import type { Vertical } from '@/lib/verticais';

/**
 * Domínios dedicados — endereços que servem UM vertical, e por vezes UMA
 * empresa, em vez da aplicação toda.
 *
 * A mesma compilação corre em todos eles. O que muda é o que cada endereço
 * deixa ver: no domínio do Clariza School não se abre o Workspace do grupo, e
 * no do Elo Giro não se abre a Agência Demo. Cada cliente entra pela sua porta
 * e não fica a saber que as outras existem.
 *
 * Este mapa é o SEGUNDO trinco, não o principal. Quem escreve o endereço é
 * travado no nginx, que nem chega a servir a página. Aqui trata-se da
 * navegação DENTRO da aplicação, onde o nginx não é chamado — o "Trocar
 * Empresa" e o regresso depois de terminar sessão.
 *
 * Acrescentar um endereço novo é acrescentar uma linha aqui e o bloco
 * correspondente no nginx. Os dois têm de andar a par.
 */
interface DominioDedicado {
  /** Vertical que este endereço serve. */
  vertical: Vertical;
  /** Empresa fixa, pelo slug. Sem isto, o ecrã de entrada mostra a lista. */
  empresa?: string;
  /** Ecrã de entrada deste endereço. */
  entrada: string;
}

const DOMINIOS: Record<string, DominioDedicado> = {
  'teste.webtechinformatica.com':  { vertical: 'school', entrada: '/school' },
  'itc.clarizaplatform.com':       { vertical: 'school', entrada: '/school' }, // endereço oficial do ITC (02/10/2026)
  'teste4.webtechinformatica.com': { vertical: 'agency', entrada: '/agency', empresa: 'elo-giro' },
  'teste5.webtechinformatica.com': { vertical: 'agency', entrada: '/agency', empresa: 'demo-agencia' },
  'labs.webtechinformatica.com':   { vertical: 'labs',   entrada: '/labs',   empresa: 'webtech-labs' },
};

/**
 * Workspaces de grupo — endereços que abrem o Workspace, mas só com PARTE das
 * empresas do grupo. A Tudo Casa e a Obrajusta são o mesmo grupo (partilham
 * clientes e fornecedores), mas cada uma entra pelo seu endereço: as lojas da
 * Tudo Casa só aparecem em clariza.lojatudocasa.com, e deixam de aparecer no
 * Workspace geral (app.clarizaplatform.com), que fica com as restantes.
 *
 * Isto esconde; não protege. Quem pode abrir cada empresa continua a ser
 * decidido pelas ligações de cada utilizador às empresas, na base de dados.
 */
export interface WorkspaceDeGrupo {
  /** Marca do ecrã de entrada (ver TEMAS_WORKSPACE em SelectEmpresa). */
  marca: 'tudo-casa';
  /** Empresas que este endereço mostra, pelo slug. */
  empresas: string[];
}

const WORKSPACES: Record<string, WorkspaceDeGrupo> = {
  'clariza.lojatudocasa.com': { marca: 'tudo-casa', empresas: ['tudocasa', 'tudocasa-matrizcharme'] },
};

/** Em desenvolvimento, `clariza.lojatudocasa.com.localhost:8080` faz de
 *  `clariza.lojatudocasa.com` — o navegador manda *.localhost para o próprio PC. */
const hostname = (): string =>
  import.meta.env.DEV ? window.location.hostname.replace(/\.localhost$/, '') : window.location.hostname;

const atual = (): DominioDedicado | null =>
  DOMINIOS[hostname()] ?? null;

/** Workspace de grupo deste endereço, ou null no Workspace geral. */
export const workspaceDoDominio = (): WorkspaceDeGrupo | null => WORKSPACES[hostname()] ?? null;

/**
 * Esta empresa aparece neste endereço? Num workspace de grupo, só as dele; no
 * Workspace geral, todas MENOS as que já têm workspace próprio.
 */
export const empresaVisivelNoEndereco = (slug: string): boolean => {
  const ws = workspaceDoDominio();
  if (ws) return ws.empresas.includes(slug);
  return !Object.values(WORKSPACES).some(w => w.empresas.includes(slug));
};

/** Empresa fixada pelo domínio, ou null quando o endereço não é dedicado. */
export const empresaDoDominio = (): string | null => atual()?.empresa ?? null;

/**
 * Ecrã de entrada deste domínio, ou null quando é um endereço geral.
 *
 * Devolver não-null quer dizer "aqui não se abre o Workspace do grupo".
 */
export const entradaDoDominio = (): string | null => atual()?.entrada ?? null;

/**
 * Endereço a pôr nos links que saem da aplicação (e-mails de menções e de
 * tarefas): o do workspace onde se está, para quem recebe abrir o cartão no
 * sítio onde a empresa dele aparece. Fora de um workspace de grupo, o geral.
 */
export const enderecoDoWorkspace = (): string => {
  const h = hostname();
  return WORKSPACES[h] ? `https://${h}` : 'https://app.clarizaplatform.com';
};
