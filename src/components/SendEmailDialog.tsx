import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Loader2 } from 'lucide-react';
import { sendEmail } from '@/lib/sendEmail';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Título da modal, ex: "Enviar confirmação ao cliente" */
  title: string;
  /** Descrição opcional abaixo do título */
  description?: string;
  /** Email pré-preenchido (pode ficar vazio para o utilizador preencher) */
  defaultTo?: string;
  /** Remetente — formato "Nome <email@dominio.com>" */
  from?: string;
  /** Assunto do email */
  subject: string;
  /** Corpo HTML do email */
  html: string;
  /** Callback chamado após envio bem-sucedido */
  onSent?: () => void;
}

export function SendEmailDialog({
  open, onOpenChange, title, description, defaultTo = '', from, subject, html, onSent,
}: Props) {
  const [to, setTo] = useState(defaultTo);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  // Sync when defaultTo changes (e.g. dialog re-opens with different data)
  useEffect(() => { setTo(defaultTo); }, [defaultTo]);

  const handleSend = async () => {
    const email = to.trim();
    if (!email) return;
    setSending(true);
    const result = await sendEmail(email, subject, html, from);
    setSending(false);

    if (result.ok) {
      toast({
        title: '✅ Email enviado',
        description: `Para: ${email}`,
        duration: 5000,
      });
      onOpenChange(false);
      onSent?.();
    } else {
      toast({
        title: '❌ Erro ao enviar email',
        description: result.error ?? 'Erro desconhecido',
        variant: 'destructive',
        duration: 8000,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}

          {from && (
            <div className="rounded-md border bg-muted/20 px-3 py-2">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">De:</span>{' '}
                <span className="font-mono">{from}</span>
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="send-email-to">Para (email)</Label>
            <Input
              id="send-email-to"
              type="email"
              placeholder="email@exemplo.com"
              value={to}
              onChange={e => setTo(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !sending) handleSend(); }}
              autoFocus
            />
          </div>

          <div className="rounded-md border bg-muted/30 px-3 py-2.5">
            <p className="text-xs text-muted-foreground leading-5">
              <span className="font-medium text-foreground">Assunto:</span> {subject}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSend} disabled={sending || !to.trim()}>
            {sending
              ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> A enviar...</>
              : <><Mail className="h-4 w-4 mr-1.5" /> Enviar</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
