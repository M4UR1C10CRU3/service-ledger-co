// Helper para enviar emails via Edge Function send-email → Resend

import { supabase } from '@/integrations/supabase/client';

export interface SendEmailResult {
  ok: boolean;
  error?: string;
}

/**
 * Envia um email via Edge Function send-email (que usa Resend).
 * @param to  Endereço(s) de destino
 * @param subject  Assunto
 * @param html  Corpo HTML
 * @param from  Remetente opcional (default: "Clariza Manager <onboarding@resend.dev>")
 */
export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string,
  from?: string,
): Promise<SendEmailResult> {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { to, subject, html, from },
    });
    if (error) return { ok: false, error: error.message };
    return (data as SendEmailResult) ?? { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Erro desconhecido ao enviar email' };
  }
}
