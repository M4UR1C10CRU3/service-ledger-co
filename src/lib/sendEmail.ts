import { supabase } from '@/integrations/supabase/client';

export interface SendEmailResult {
  ok: boolean;
  error?: string;
}

export type EmailTipo = 'comercial' | 'compras' | 'financeiro' | 'contabilidade';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  // SMTP nativo (preferencial): passa empresa_id + tipo → Edge Function lê credenciais da BD
  empresa_id?: string;
  tipo?: EmailTipo;
  // Legado: remetente directo para fallback Resend
  from?: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', { body: opts });
    if (error) return { ok: false, error: error.message };
    return (data as SendEmailResult) ?? { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erro desconhecido ao enviar email' };
  }
}
