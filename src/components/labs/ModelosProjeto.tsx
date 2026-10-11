import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useClientes } from '@/hooks/useClientes';
import { useToast } from '@/hooks/use-toast';
import type { Nucleo } from '@/hooks/useNucleos';
import { criarProjetoComFases, type FaseModelo } from '@/lib/labsProjetos';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Plus } from 'lucide-react';

/**
 * «Começar um projeto a partir de um modelo» — um cartão por modelo do núcleo.
 * Escolhe-se o cliente e o nome; o projeto nasce com as fases do modelo como
 * jobs, no núcleo certo, e abre-se logo.
 */
export function ModelosProjeto({ nucleo, modelos }: {
  nucleo: Nucleo;
  modelos: { codigo: string; nome: string; resumo: string; fases: FaseModelo[] }[];
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { empresa } = useEmpresa();
  const { clientes } = useClientes();
  const [modelo, setModelo] = useState<(typeof modelos)[number] | null>(null);
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [aCriar, setACriar] = useState(false);

  const abrir = (m: (typeof modelos)[number]) => { setModelo(m); setClienteId(null); setNome(''); };

  const criar = async () => {
    if (!empresa || !modelo) return;
    setACriar(true);
    try {
      const c = clientes.find(x => x.id === clienteId);
      const id = await criarProjetoComFases({
        empresaId: empresa.id, nucleoId: nucleo.id,
        nome: nome.trim() || `${modelo.nome} · ${c?.nome ?? 'Cliente'}`,
        clienteId, clienteNome: c?.nome ?? null,
        fases: modelo.fases,
      });
      qc.invalidateQueries({ queryKey: ['ag_projetos'] });
      qc.invalidateQueries({ queryKey: ['lb_nucleo_painel'] });
      toast({ title: 'Projeto criado', description: `${modelo.fases.length} fases prontas a trabalhar.` });
      setModelo(null);
      navigate(`/labs/projetos/${id}`);
    } catch (e: any) {
      toast({ title: 'Não foi possível criar o projeto', description: e.message, variant: 'destructive' });
    } finally {
      setACriar(false);
    }
  };

  return (
    <Card><CardContent className="p-5 space-y-3">
      <p className="ds-eyebrow">Começar a partir de um modelo</p>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {modelos.map(m => (
          <button key={m.codigo} type="button" onClick={() => abrir(m)}
                  className="text-left rounded-[14px] border border-border p-4 transition-colors hover:border-vertical-border hover:bg-vertical-soft">
            <p className="font-bold flex items-center gap-2"><Plus className="h-4 w-4 text-vertical" />{m.nome}</p>
            <p className="text-xs text-muted-foreground mt-1">{m.resumo}</p>
            <p className="text-xs text-muted-foreground mt-2 tabular-nums">{m.fases.length} fases · termina na aceitação do cliente</p>
          </button>
        ))}
      </div>

      <Dialog open={!!modelo} onOpenChange={v => { if (!v) setModelo(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Novo projeto · {modelo?.nome}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Cliente</Label>
              <Select value={clienteId ?? ''} onValueChange={setClienteId}>
                <SelectTrigger><SelectValue placeholder="Escolher cliente" /></SelectTrigger>
                <SelectContent>
                  {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nome do projeto</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)}
                     placeholder={`${modelo?.nome ?? ''} · ${clientes.find(x => x.id === clienteId)?.nome ?? 'Cliente'}`} />
            </div>
            <div className="rounded-[12px] border border-border p-3">
              <p className="text-xs text-muted-foreground mb-2">Fases que vão ser criadas</p>
              <ol className="text-sm space-y-1 list-decimal list-inside">
                {modelo?.fases.map(f => <li key={f.titulo}>{f.titulo}</li>)}
              </ol>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModelo(null)}>Cancelar</Button>
            <Button onClick={criar} disabled={aCriar}>
              {aCriar ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />A criar...</> : 'Criar projeto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CardContent></Card>
  );
}

export default ModelosProjeto;
