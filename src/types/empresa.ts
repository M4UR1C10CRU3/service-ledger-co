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
  createdAt: Date;
  updatedAt: Date;
}

export interface EmpresaConfig {
  empresa: Empresa | null;
  isLoading: boolean;
  setEmpresa: (empresa: Empresa | null) => void;
}
