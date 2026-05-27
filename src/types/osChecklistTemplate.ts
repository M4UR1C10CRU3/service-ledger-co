export interface OsChecklistTemplate {
  id: string;
  empresaId: string | null;
  nome: string;
  descricao: string | null;
  ordem: number;
  ativo: boolean;
}

export interface OsChecklistTemplateItem {
  id: string;
  templateId: string;
  ordem: number;
  titulo: string;
  responsavelPadrao: string | null;
  diasOffset: number | null;
}
