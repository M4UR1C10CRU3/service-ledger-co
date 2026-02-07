export interface Supplier {
  id: string;
  empresaId: string;
  tipoPessoa: 'fisica' | 'juridica';
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpjCpf: string;
  categoria: 'materia_prima' | 'servicos' | 'utilidades' | 'arrendamentos' | 'outros';
  telefone: string | null;
  telefoneSecundario: string | null;
  email: string | null;
  contatoPrincipal: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  observacoes: string | null;
  status: 'ativo' | 'inativo';
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierFormData {
  tipoPessoa: 'fisica' | 'juridica';
  razaoSocial: string;
  nomeFantasia: string;
  cnpjCpf: string;
  categoria: 'materia_prima' | 'servicos' | 'utilidades' | 'arrendamentos' | 'outros';
  telefone: string;
  telefoneSecundario: string;
  email: string;
  contatoPrincipal: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  banco: string;
  agencia: string;
  conta: string;
  observacoes: string;
  status: 'ativo' | 'inativo';
}

export const CATEGORIA_LABELS: Record<string, string> = {
  materia_prima: 'Matéria-prima',
  servicos: 'Serviços',
  utilidades: 'Utilidades',
  arrendamentos: 'Arrendamentos',
  outros: 'Outros',
};

export const emptySupplierForm: SupplierFormData = {
  tipoPessoa: 'juridica',
  razaoSocial: '',
  nomeFantasia: '',
  cnpjCpf: '',
  categoria: 'outros',
  telefone: '',
  telefoneSecundario: '',
  email: '',
  contatoPrincipal: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  banco: '',
  agencia: '',
  conta: '',
  observacoes: '',
  status: 'ativo',
};
