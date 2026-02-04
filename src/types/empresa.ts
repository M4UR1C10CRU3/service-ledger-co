export interface Empresa {
  id: string;
  slug: string;
  nome: string;
  nomeLegal?: string;
  logoPath?: string;
  corPrimaria: string;
  corSecundaria?: string;
  corAccent?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmpresaConfig {
  empresa: Empresa | null;
  isLoading: boolean;
  setEmpresa: (empresa: Empresa | null) => void;
}
