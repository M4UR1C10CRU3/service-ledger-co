export interface Etiqueta {
  id: string;
  quadro_id: string;
  nome: string;
  cor: string;
}

export interface ChecklistItem {
  id: string;
  checklist_id: string;
  texto: string;
  concluido: boolean;
  posicao: number;
  criado_em: string;
  responsavel_id?: string | null;
  responsavel_nome?: string | null;
  hora?: string | null;        // "HH:MM"
  data_limite?: string | null; // "YYYY-MM-DD"
}

export interface Checklist {
  id: string;
  cartao_id: string;
  titulo: string;
  posicao: number;
  criado_em: string;
  items: ChecklistItem[];
}

export type FeedTipo = 'comentario' | 'atividade';

export interface Comentario {
  id: string;
  cartao_id: string;
  autor_id: string | null;
  autor_nome: string | null;
  texto: string;
  tipo: FeedTipo;
  criado_em: string;
  atualizado_em: string;
  reply_to_id?: string | null;
  reply_to_autor_nome?: string | null;
  reply_to_texto?: string | null;
}

export interface CartaoMembro {
  cartao_id: string;
  utilizador_id: string;
  nome: string | null;
}

export interface Utilizador {
  id: string;
  nome: string;
  email: string;
  cargo: string | null;
}

export interface QuadroCartao {
  id: string;
  lista_id: string;
  empresa_id: string;
  titulo: string;
  descricao: string | null;
  cor: string | null;
  data_limite: string | null;
  data_limite_concluida: boolean;
  posicao: number;
  arquivado: boolean;
  criado_por: string | null;
  criado_em: string;
  atualizado_em: string;
  etiquetas: Etiqueta[];
  checklists: Checklist[];
  membros: CartaoMembro[];
  // ── Processo (num quadro livre ficam sempre vazios) ──────────────────────
  /** Cliente a que o cartão diz respeito. */
  cliente_id?: string | null;
  /** Fornecedor a que o cartão diz respeito. */
  supplier_id?: string | null;
  responsavel_id?: string | null;
  responsavel_nome?: string | null;
  /** Para onde a automação envia o email. */
  contacto_email?: string | null;
  valor?: number | null;
  /** Documento gerado a partir deste cartão. */
  doc_tipo?: string | null;
  doc_id?: string | null;
  /** Última vez que mudou de coluna — base dos gatilhos temporais. */
  movido_em?: string | null;
}

export interface QuadroLista {
  id: string;
  quadro_id: string;
  nome: string;
  posicao: number;
  arquivado: boolean;
  criado_em: string;
  cartoes: QuadroCartao[];
  // ── Processo (só em quadros tipados; num quadro livre vêm sempre vazios) ──
  /** Estado de negócio que esta coluna representa (ex.: 'cotacao_recebida'). */
  estado_codigo?: string | null;
  /** Campos que o cartão tem de ter preenchidos para poder ENTRAR aqui. */
  campos_obrigatorios?: string[];
  /** Coluna terminal do processo. */
  final?: boolean;
  /** Não aceita cartões arrastados (ex.: "Cancelada", "Liquidado"). */
  bloqueada?: boolean;
  /** Só em colunas finais: se o processo acabou bem ou mal. Base da taxa de conversão. */
  resultado?: 'ganho' | 'perdido' | null;
  cor?: string | null;
}

export interface Quadro {
  id: string;
  empresa_id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  arquivado: boolean;
  criado_por: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface CartaoAnexo {
  id: string;
  cartao_id: string;
  empresa_id?: string;
  nome: string;
  url: string;          // derivado de `path` na leitura (a coluna real chama-se path)
  path?: string | null; // caminho/URL guardado na BD
  tipo: string | null;
  adicionado_por_id?: string | null;
  adicionado_por_nome?: string | null;
  criado_em: string;
}

export interface ChecklistModeloItem {
  id: string;
  template_id: string;
  texto: string;
  posicao: number;
}

export interface ChecklistModelo {
  id: string;
  empresa_id: string;
  nome: string;
  categoria: string | null;
  criado_em: string;
  checklist_template_items: ChecklistModeloItem[];
}
