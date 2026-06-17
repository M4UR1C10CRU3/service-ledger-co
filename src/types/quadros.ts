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
