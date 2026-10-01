export interface Empresa {
  id: string;
  slug: string;
  nome: string;
  nomeLegal?: string;
  logoPath?: string;
  corPrimaria: string;
  corSecundaria?: string;
  corAccent?: string;
  /**
   * Produto a que a empresa pertence quando não é uma empresa do grupo comum.
   * Ex.: 'school'. Estas não aparecem no seletor geral — têm entrada própria.
   */
  vertical?: string | null;
  /**
   * País da empresa (PT, BR). Decide o catálogo de documentos legais do módulo
   * Administrativo — os órgãos emissores e os âmbitos não são os mesmos nos
   * dois países.
   */
  pais?: string | null;
  /** Criada mas ainda não usada: os formatos de moeda estão fixos em EUR. */
  moeda?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmpresaConfig {
  empresa: Empresa | null;
  isLoading: boolean;
  setEmpresa: (empresa: Empresa | null) => void;
}
