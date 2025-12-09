export interface Cliente {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  nif?: string; // Número de Contribuinte
  moradaRua?: string;
  moradaNumero?: string;
  moradaComplemento?: string;
  moradaConcelho?: string;
  moradaCodigoPostal?: string;
  moradaDistrito?: string;
  moradaPais?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClienteFormData {
  nome: string;
  telefone?: string;
  email?: string;
  nif?: string;
  moradaRua?: string;
  moradaNumero?: string;
  moradaComplemento?: string;
  moradaConcelho?: string;
  moradaCodigoPostal?: string;
  moradaDistrito?: string;
  moradaPais?: string;
}
