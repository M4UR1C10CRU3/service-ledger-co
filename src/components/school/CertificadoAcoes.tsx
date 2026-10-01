import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { urlAssinadaPDF, urlVerificacao } from '@/lib/certificadoEmissao';
import { ShieldCheck, FileDown, Loader2, Copy, Check } from 'lucide-react';

/**
 * O que se pode fazer com um certificado, em qualquer portal.
 *
 * Duas coisas, e as duas importam a quem está do outro lado:
 *
 *  · VERIFICAR — abre a página pública de autenticidade. É o que uma empresa
 *    contratante, um auditor ou um fiscal pede: prova de que o documento saiu
 *    mesmo da escola. Sem este link, o certificado manda verificar num sítio
 *    que ninguém sabe qual é.
 *
 *  · PDF — o bucket é privado, por isso o ficheiro não tem endereço fixo. A
 *    ligação é assinada no momento e expira. Guardar uma URL pública era o que
 *    devolvia 403.
 */
export function CertificadoAcoes({
  codigo,
  caminhoPdf,
  compacto,
}: {
  codigo: string;
  caminhoPdf?: string | null;
  compacto?: boolean;
}) {
  const { toast } = useToast();
  const { empresa } = useEmpresa();
  const [aAbrir, setAAbrir] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const abrirPDF = async () => {
    if (!caminhoPdf) return;
    setAAbrir(true);
    try {
      const url = await urlAssinadaPDF(caminhoPdf);
      if (url) window.open(url, '_blank', 'noopener');
      else toast({ title: 'PDF indisponível', description: 'O ficheiro não foi encontrado no arquivo.', variant: 'destructive' });
    } catch (e: any) {
      toast({ title: 'Erro ao abrir o PDF', description: e.message, variant: 'destructive' });
    } finally {
      setAAbrir(false);
    }
  };

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(urlVerificacao(codigo, (empresa as any)?.cert_url_verificacao));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
      toast({ title: 'Link copiado', description: 'Envie-o a quem precise de confirmar o certificado.' });
    } catch {
      toast({ title: 'Não foi possível copiar', variant: 'destructive' });
    }
  };

  const tamanho = compacto ? 'sm' : 'default';

  return (
    <div className="flex items-center gap-1.5">
      <Button size={tamanho} variant="outline" asChild title="Confirmar autenticidade online">
        <a href={`/certificado/${encodeURIComponent(codigo)}`} target="_blank" rel="noreferrer">
          <ShieldCheck className="h-4 w-4 mr-1.5" />Verificar
        </a>
      </Button>

      <Button size={tamanho} variant="ghost" onClick={copiarLink} title="Copiar o link de verificação">
        {copiado ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
      </Button>

      {caminhoPdf && (
        <Button size={tamanho} variant="ghost" onClick={abrirPDF} disabled={aAbrir} title="Abrir o PDF">
          {aAbrir ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
        </Button>
      )}
    </div>
  );
}
