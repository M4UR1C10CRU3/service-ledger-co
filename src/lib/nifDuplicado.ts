import { supabase } from '@/integrations/supabase/client';

/**
 * Procura de cadastros que já usem o mesmo NIF/NIPC.
 *
 * Existe para evitar o cliente ou o fornecedor entrar duas vezes na base. Já
 * aconteceu: havia uma "Maria de Lurdes" duplicada e quatro fornecedores
 * repetidos, um deles com dois nomes diferentes para o mesmo número.
 *
 * A comparação ignora pontuação, espaços e o prefixo do país, mas RESPEITA
 * as letras — ver `normalizarNif`.
 *
 * O âmbito acompanha o de cada tabela: clientes e fornecedores são ambos
 * partilhados pelo GRUPO. Procurar só na empresa ativa deixava passar um
 * cadastro que o utilizador vê na lista à sua frente.
 */

/** Prefixos de IVA da UE, para os separar do número quando vêm colados. */
const PREFIXOS_UE = [
  'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'EL', 'ES', 'FI', 'FR',
  'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO',
  'SE', 'SI', 'SK', 'XI',
];

/**
 * O número de contribuinte reduzido à sua forma comparável.
 *
 * Mantém LETRAS e dígitos, não só dígitos. Os NIF espanhóis começam por uma
 * letra que identifica o tipo de entidade — `B12345678` é uma sociedade
 * limitada e `A12345678` uma anónima. Deitar as letras fora fazia com que
 * duas empresas diferentes fossem acusadas como a mesma.
 *
 * Tira pontuação, espaços e o prefixo do país quando ele vem colado, para que
 * "PT 123 456 789", "PT123456789" e "123456789" sejam reconhecidos como o
 * mesmo contribuinte — que é como eles entram na base escritos de maneiras
 * diferentes.
 */
export function normalizarNif(v?: string | null): string {
  const limpo = (v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (limpo.length < 3) return limpo;

  // "ES B12345678" -> "B12345678". Só se remove o prefixo quando o que sobra
  // ainda começa por letra ou tem comprimento de número de contribuinte;
  // caso contrário estaríamos a comer o início de um número espanhol.
  const possivelPrefixo = limpo.slice(0, 2);
  if (PREFIXOS_UE.includes(possivelPrefixo) && limpo.length > 8) {
    return limpo.slice(2);
  }
  return limpo;
}

/** @deprecated usar normalizarNif — mantido para não partir chamadas antigas. */
export const soDigitos = normalizarNif;

export interface CadastroExistente {
  id: string;
  nome: string;
}

/**
 * Devolve o cadastro que já usa este NIF, ou null.
 *
 * `ignorarId` serve para a edição: ao guardar um cadastro existente, ele não
 * se pode acusar a si próprio.
 */
export async function clienteComMesmoNif(
  nif: string | null | undefined,
  grupoId: string | null | undefined,
  ignorarId?: string,
): Promise<CadastroExistente | null> {
  const digitos = normalizarNif(nif);
  if (!digitos || !grupoId) return null;

  const { data, error } = await (supabase.from('clientes') as any)
    .select('id, nome, nif')
    .eq('grupo_id', grupoId);
  if (error || !data) return null;

  const achado = data.find(
    (c: any) => normalizarNif(c.nif) === digitos && c.id !== ignorarId,
  );
  return achado ? { id: achado.id, nome: achado.nome } : null;
}

/**
 * `empresaIds` — todas as empresas do grupo, não só a ativa.
 *
 * A lista de fornecedores é lida por GRUPO: as empresas irmãs trabalham com a
 * mesma base de propósito. Procurar duplicados só na empresa ativa deixava
 * passar um fornecedor que o utilizador VÊ na lista à sua frente — o pior tipo
 * de validação, a que diz que está tudo bem quando não está.
 */
export async function fornecedorComMesmoNif(
  nif: string | null | undefined,
  empresaIds: string | string[] | null | undefined,
  ignorarId?: string,
): Promise<CadastroExistente | null> {
  const digitos = normalizarNif(nif);
  const ids = (Array.isArray(empresaIds) ? empresaIds : [empresaIds]).filter(Boolean) as string[];
  if (!digitos || ids.length === 0) return null;

  const { data, error } = await (supabase.from('suppliers') as any)
    .select('id, razao_social, nome_fantasia, cnpj_cpf, deleted_at')
    .in('empresa_id', ids)
    .is('deleted_at', null);
  if (error || !data) return null;

  const achado = data.find(
    (s: any) => normalizarNif(s.cnpj_cpf) === digitos && s.id !== ignorarId,
  );
  return achado
    ? { id: achado.id, nome: achado.razao_social || achado.nome_fantasia || '(sem nome)' }
    : null;
}
