import { z } from 'zod';

// Auth validation schemas
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: "Email é obrigatório" })
    .email({ message: "Email inválido" })
    .max(255, { message: "Email deve ter no máximo 255 caracteres" }),
  password: z
    .string()
    .min(6, { message: "Senha deve ter no mínimo 6 caracteres" })
    .max(100, { message: "Senha deve ter no máximo 100 caracteres" }),
});

export const signupSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(1, { message: "Nome é obrigatório" })
    .max(100, { message: "Nome deve ter no máximo 100 caracteres" }),
  email: z
    .string()
    .trim()
    .min(1, { message: "Email é obrigatório" })
    .email({ message: "Email inválido" })
    .max(255, { message: "Email deve ter no máximo 255 caracteres" }),
  password: z
    .string()
    .min(8, { message: "Senha deve ter no mínimo 8 caracteres" })
    .max(100, { message: "Senha deve ter no máximo 100 caracteres" })
    .regex(/[A-Z]/, { message: "Senha deve conter pelo menos uma letra maiúscula" })
    .regex(/[a-z]/, { message: "Senha deve conter pelo menos uma letra minúscula" })
    .regex(/[0-9]/, { message: "Senha deve conter pelo menos um número" }),
});

// Service form validation schemas
export const dateSchema = z
  .string()
  .regex(/^\d{2}\/\d{2}\/\d{4}$/, { message: "Data deve estar no formato DD/MM/AAAA" })
  .refine((date) => {
    const [day, month, year] = date.split('/').map(Number);
    const dateObj = new Date(year, month - 1, day);
    return (
      dateObj.getDate() === day &&
      dateObj.getMonth() === month - 1 &&
      dateObj.getFullYear() === year
    );
  }, { message: "Data inválida" });

export const serviceFormSchema = z.object({
  data: dateSchema,
  servico: z
    .string()
    .trim()
    .min(1, { message: "Serviço é obrigatório" })
    .max(200, { message: "Serviço deve ter no máximo 200 caracteres" }),
  cliente: z
    .string()
    .trim()
    .min(1, { message: "Cliente é obrigatório" })
    .max(100, { message: "Cliente deve ter no máximo 100 caracteres" }),
  resumo: z
    .string()
    .trim()
    .min(1, { message: "Resumo é obrigatório" })
    .max(40, { message: "Resumo deve ter no máximo 40 caracteres" }),
  proposta: z
    .string()
    .max(100, { message: "Proposta deve ter no máximo 100 caracteres" })
    .optional(),
  fatura: z
    .string()
    .max(100, { message: "Fatura deve ter no máximo 100 caracteres" }),
  valorComIVA: z
    .number()
    .min(0, { message: "Valor deve ser positivo" })
    .max(999999999, { message: "Valor muito alto" }),
  valorSemIVA: z
    .number()
    .min(0, { message: "Valor deve ser positivo" })
    .max(999999999, { message: "Valor muito alto" }),
  aRealizar: z.boolean(),
  tipoServico: z.enum(['contrato', 'fatura']),
  contratoId: z.string().optional(),
  valorFaturado: z.number().min(0).optional(),
  numeroFatura: z.string().max(100).optional(),
  telefone: z
    .string()
    .max(20, { message: "Telefone deve ter no máximo 20 caracteres" })
    .optional(),
  email: z
    .string()
    .email({ message: "Email inválido" })
    .max(255, { message: "Email deve ter no máximo 255 caracteres" })
    .optional()
    .or(z.literal('')),
});

export const liquidacaoSchema = z.object({
  valor: z
    .number()
    .min(0.01, { message: "Valor deve ser maior que zero" })
    .max(999999999, { message: "Valor muito alto" }),
  dataPagamento: dateSchema,
  observacoes: z
    .string()
    .trim()
    .max(500, { message: "Observações devem ter no máximo 500 caracteres" })
    .optional(),
});

// Invoice creation validation schema
export const invoiceFormSchema = z.object({
  numeroFatura: z
    .string()
    .trim()
    .min(1, { message: "Número da fatura é obrigatório" })
    .max(100, { message: "Número da fatura deve ter no máximo 100 caracteres" }),
  valorComIVA: z
    .number()
    .min(0.01, { message: "Valor deve ser maior que zero" })
    .max(999999999, { message: "Valor muito alto" }),
  valorSemIVA: z
    .number()
    .min(0.01, { message: "Valor deve ser maior que zero" })
    .max(999999999, { message: "Valor muito alto" }),
  resumo: z
    .string()
    .trim()
    .max(40, { message: "Resumo deve ter no máximo 40 caracteres" })
    .optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
export type ServiceFormData = z.infer<typeof serviceFormSchema>;
export type LiquidacaoFormData = z.infer<typeof liquidacaoSchema>;
export type InvoiceFormData = z.infer<typeof invoiceFormSchema>;
