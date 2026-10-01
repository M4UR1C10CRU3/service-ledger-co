import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, CheckCircle2, MailWarning } from 'lucide-react';

/**
 * Concede acesso ao portal a partir da ficha do aluno ou do instrutor.
 *
 * Não cria contas nem define palavras-passe: envia para o email da ficha uma
 * ligação de entrada. Quem abrir a ligação prova que é dono da caixa de
 * correio, e é nesse momento que a conta fica ligada à ficha.
 *
 * Consequência prática: a administração nunca vê nem guarda uma credencial de
 * ninguém, e não há nada para repor quando alguém se esquecer.
 */
export function AcessoPortalBotao({
  email,
  ligado,
  compacto,
}: {
  email: string | null | undefined;
  ligado: boolean;
  compacto?: boolean;
}) {
  const { toast } = useToast();
  const [aEnviar, setAEnviar] = useState(false);
  const [enviado, setEnviado] = useState(false);

  if (ligado) {
    return (
      <Badge variant="outline" className="border-green-500/40 text-green-600 bg-green-500/10 gap-1">
        <CheckCircle2 className="h-3 w-3" /> Acesso ativo
      </Badge>
    );
  }

  // Sem email não há por onde enviar — e é o caso da maioria dos alunos.
  if (!email?.trim()) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <MailWarning className="h-3.5 w-3.5" /> Sem email na ficha
      </span>
    );
  }

  const enviar = async () => {
    setAEnviar(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: `${window.location.origin}/portal` },
      });
      if (error) throw error;
      setEnviado(true);
      toast({
        title: 'Convite enviado',
        description: `Ligação de entrada enviada para ${email}. O acesso fica ativo quando a pessoa a abrir.`,
      });
    } catch (e: any) {
      toast({ title: 'Não foi possível enviar', description: e.message, variant: 'destructive' });
    } finally {
      setAEnviar(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size={compacto ? 'sm' : 'default'}
      onClick={enviar}
      disabled={aEnviar}
      title={`Enviar ligação de entrada para ${email}`}
    >
      {aEnviar
        ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> A enviar...</>
        : <><Send className="h-4 w-4 mr-2" /> {enviado ? 'Reenviar convite' : 'Dar acesso ao portal'}</>}
    </Button>
  );
}
