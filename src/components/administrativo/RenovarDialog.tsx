import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { somarPeriodo, descreverPeriodo, type DocumentoLegal } from '@/types/administrativo';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  documento: DocumentoLegal | null;
  onRenovar: (
    doc: DocumentoLegal,
    nova: { numero: string | null; data_emissao: string | null; data_validade: string | null; notas: string | null },
    ficheiro?: File | null,
  ) => Promise<boolean>;
}

/**
 * Renovar não é editar o documento antigo. Cria uma versão nova e arquiva a
 * anterior com o ficheiro dela — é a versão antiga que prova que a empresa
 * esteve regular naquele período.
 */
export function RenovarDialog({ open, onOpenChange, documento, onRenovar }: Props) {
  const hoje = new Date().toISOString().slice(0, 10);
  const [numero, setNumero] = useState('');
  const [emissao, setEmissao] = useState(hoje);
  const [validade, setValidade] = useState('');
  const [notas, setNotas] = useState('');
  const [ficheiro, setFicheiro] = useState<File | null>(null);
  const [aGravar, setAGravar] = useState(false);

  useEffect(() => {
    if (!open || !documento) return;
    setNumero(documento.numero ?? '');
    setEmissao(hoje);
    setValidade(somarPeriodo(hoje, documento.validade_valor, documento.validade_unidade) ?? '');
    setNotas('');
    setFicheiro(null);
  }, [open, documento, hoje]);

  if (!documento) return null;

  const propostaAtual = somarPeriodo(emissao, documento.validade_valor, documento.validade_unidade);

  const confirmar = async () => {
    setAGravar(true);
    const ok = await onRenovar(
      documento,
      {
        numero: numero.trim() || null,
        data_emissao: emissao || null,
        data_validade: validade || null,
        notas: notas.trim() || null,
      },
      ficheiro,
    );
    setAGravar(false);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Renovar — {documento.titulo}</DialogTitle>
          <DialogDescription>
            A versão atual passa para o histórico com o ficheiro dela. Período deste documento:{' '}
            {descreverPeriodo(documento.validade_valor, documento.validade_unidade)}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Número da nova emissão</Label>
            <Input value={numero} onChange={e => setNumero(e.target.value)} />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Data de emissão</Label>
              <Input type="date" value={emissao} onChange={e => setEmissao(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Nova validade</Label>
              <Input type="date" value={validade} onChange={e => setValidade(e.target.value)} />
              {propostaAtual && propostaAtual !== validade && (
                <button type="button"
                        className="text-xs text-left text-primary underline underline-offset-2"
                        onClick={() => setValidade(propostaAtual)}>
                  Usar {new Date(propostaAtual + 'T00:00:00').toLocaleDateString('pt-PT')}
                </button>
              )}
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Ficheiro da nova versão</Label>
            <Input type="file" onChange={e => setFicheiro(e.target.files?.[0] ?? null)} />
          </div>
          <div className="grid gap-2">
            <Label>Notas</Label>
            <Textarea rows={2} value={notas} onChange={e => setNotas(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={confirmar} disabled={aGravar}>
            {aGravar ? 'A renovar…' : 'Renovar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
