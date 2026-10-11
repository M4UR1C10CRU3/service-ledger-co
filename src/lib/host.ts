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
  'teste4.webtechinformatica.com': { vertical: 'agency', entrada: '/agency', empresa: 'elo-giro' },
  'teste5.webtechinformatica.com': { vertical: 'agency', entrada: '/agency', empresa: 'demo-agencia' },
  'labs.webtechinformatica.com':   { vertical: 'labs',   entrada: '/labs',   empresa: 'webtech-labs' },
};

const atual = (): DominioDedicado | null =>
  DOMINIOS[window.location.hostname] ?? null;

/** Empresa fixada pelo domínio, ou null quando o endereço não é dedicado. */
export const empresaDoDominio = (): string | null => atual()?.empresa ?? null;

/**
 * Ecrã de entrada deste domínio, ou null quando é um endereço geral.
 *
 * Devolver não-null quer dizer "aqui não se abre o Workspace do grupo".
 */
export const entradaDoDominio = (): string | null => atual()?.entrada ?? null;
