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
}

export interface QuadroLista {
  id: string;
  quadro_id: string;
  nome: string;
  posicao: number;
  arquivado: boolean;
  criado_em: string;
  cartoes: QuadroCartao[];
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
  empresa_id: string;
  nome: string;
  url: string;
  tipo: string | null;
  adicionado_por_id: string | null;
  adicionado_por_nome: string | null;
  criado_em: string;
}

export interface ChecklistModeloItem {
  id: string;
  modelo_id: string;
  texto: string;
  posicao: number;
}

export interface ChecklistModelo {
  id: string;
  empresa_id: string;
  nome: string;
  criado_em: string;
  cartao_checklist_modelo_itens: ChecklistModeloItem[];
}
