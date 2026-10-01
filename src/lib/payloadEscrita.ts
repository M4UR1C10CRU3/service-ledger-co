/**
 * Limpa o que não é coluna editável antes de gravar.
 *
 * As fichas carregam a linha inteira (`select('*')`) para o formulário com um
 * `{ ...registo }` e devolvem-na toda no update. O TypeScript não apanha isto
 * — um spread não é verificado contra o tipo de destino — e o resultado é um
 * pedido com `id`, `created_at` e campos calculados de junções, que a base
 * recusa.
 *
 * Foi o que impediu de gravar a ficha de um instrutor sem dar erro visível:
 * a recusa chegava como sucesso com zero linhas. Ver `useSchoolDocentes`.
 */

/** Nunca se escrevem: são geridas pela base ou identificam a linha. */
const NUNCA = ['id', 'empresa_id', 'created_at', 'updated_at'] as const;

/**
 * @param input   o que a ficha enviou
 * @param calculados nomes que vêm de junções ou contagens e não existem como
 *                   coluna — `curso_nome`, `total_matriculas` e afins
 */
export function soColunasEditaveis<T extends Record<string, unknown>>(
  input: T,
  calculados: readonly string[] = [],
): Record<string, unknown> {
  const fora = new Set<string>([...NUNCA, ...calculados]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (!fora.has(k) && v !== undefined) out[k] = v;
  }
  return out;
}
