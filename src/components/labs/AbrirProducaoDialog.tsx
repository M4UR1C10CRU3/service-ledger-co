import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Rocket } from 'lucide-react';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useNucleos } from '@/hooks/useNucleos';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  criarProjetoComFases, MODELOS_CRIATIVO, MODELOS_GROWTH, MODELOS_PRODUTO, type FaseModelo,
} from '@/lib/labsProjetos';
import type { Oportunidade } from '@/types/followup';

/**
 * Clariza Labs — passagem do Workflow Comercial para o Workflow de Produção (15/10/2026).
 *
 * Quando uma oportunidade é adjudicada, abre-se o projeto na produção com os jobs do modelo
 * escolhido (na etapa «Entrada de pedido»), ligado à oportunidade (ag_projetos.oportunidade_id).
 * Os modelos sugeridos são os do núcleo da oportunidade; os outros ficam disponíveis por baixo.
 */
type Modelo = { codigo: string; nome: string; resumo: string; fases: FaseModelo[]; grupo: string; nucleo: string };

const BRANCO: Modelo = {
  codigo: 'branco', nome: 'Projeto em branco', resumo: 'Só o job de briefing; as fases criam-se depois',
  fases: [{ titulo: 'Briefing e planeamento' }], grupo: 'Outro', nucleo: '',
};

const TODOS: Modelo[] = [
  ...MODELOS_GROWTH.map(m => ({ ...m, grupo: 'Growth', nucleo: 'growth' })),
  ...MODELOS_CRIATIVO.map(m => ({ ...m, grupo: 'Estúdio Criativo', nucleo: 'criativo' })),
  ...MODELOS_PRODUTO.map(m => ({ ...m, grupo: 'Produto Digital', nucleo: 'produto' })),
];

interface Props {
  oportunidade: Oportunidade | null;
  onClose: () => void;
  /** Chamado depois de criar o projeto, com o id do projeto novo. */
  onCriado?: (projetoId: string) => void;
}

export function AbrirProducaoDialog({ oportunidade, onClose, onCriado }: Props) {
  const { empresa } = useEmpresa();
  const { porId } = useNucleos();
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [modelo, setModelo] = useState<Modelo | null>(null);
  const [nome, setNome] = useState('');
  const [prazo, setPrazo] = useState('');
  const [aCriar, setACriar] = useState(false);

  const nucleo = oportunidade ? porId(oportunidade.nucleoId) : null;
  const { sugeridos, outros } = useMemo(() => {
    const cod = nucleo?.codigo ?? '';
    const s = TODOS.filter(m => m.nucleo === cod);
    return { sugeridos: s, outros: TODOS.filter(m => m.nucleo !== cod) };
  }, [nucleo?.codigo]);

  useEffect(() => {
    if (!oportunidade) return;
    setModelo(sugeridos[0] ?? null);
    const cliente = oportunidade.clienteNome ? ` - ${oportunidade.clienteNome}` : '';
    setNome(`${oportunidade.titulo}${cliente}`.slice(0, 160));
    setPrazo('');
  }, [oportunidade?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const criar = async () => {
    if (!empresa || !oportunidade || !modelo || !nome.trim()) return;
    setACriar(true);
    try {
      const descricao = [
        `Adjudicado no Workflow Comercial a ${new Date().toLocaleDateString('pt-PT')}.`,
        oportunidade.valorEstimado != null ? `Valor adjudicado: ${oportunidade.valorEstimado.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}.` : '',
        `Modelo: ${modelo.nome}.`,
        oportunidade.notasInternas ? `\nNotas da oportunidade:\n${oportunidade.notasInternas}` : '',
      ].filter(Boolean).join(' ');
      const id = await criarProjetoComFases({
        empresaId: empresa.id,
        nucleoId: oportunidade.nucleoId ?? null,
        nome: nome.trim(),
        clienteId: oportunidade.clienteId,
        clienteNome: oportunidade.clienteNome,
        descricao,
        prazo: prazo ? new Date(prazo + 'T12:00:00') : null,
        fases: modelo.fases,
        oportunidadeId: oportunidade.id,
        budget: oportunidade.valorEstimado ?? null,
      });
      qc.invalidateQueries({ queryKey: ['ag_projetos'] });
      qc.invalidateQueries({ queryKey: ['ag_jobs'] });
      toast({ title: 'Projeto aberto na produção', description: `${modelo.fases.length} job(s) em «Entrada de pedido».` });
      onCriado?.(id);
      onClose();
      navigate(`/labs/projetos/${id}`);
    } catch (e: any) {
      const duplicado = /oportunidade_uidx|duplicate/i.test(e?.message ?? '');
      toast({
        title: duplicado ? 'Esta oportunidade já tem projeto na produção' : 'Erro ao abrir o projeto',
        description: duplicado ? 'Use «Ver na produção» no detalhe da oportunidade.' : e?.message,
        variant: 'destructive',
      });
    } finally {
      setACriar(false);
    }
  };

  const Opcao = ({ m }: { m: Modelo }) => (
    <button
      type="button"
      onClick={() => setModelo(m)}
      className={`text-left rounded-lg border p-2.5 transition-colors ${modelo?.codigo === m.codigo && modelo?.grupo === m.grupo
        ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50'}`}
    >
      <p className="text-sm font-semibold">{m.nome}</p>
      <p className="text-xs text-muted-foreground">{m.resumo} · {m.fases.length} fase{m.fases.length !== 1 ? 's' : ''}</p>
    </button>
  );

  return (
    <Dialog open={!!oportunidade} onOpenChange={o => { if (!o && !aCriar) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Rocket className="h-5 w-5" />Abrir na produção</DialogTitle>
          <DialogDescription>
            {oportunidade?.clienteNome ? `${oportunidade.clienteNome} · ` : ''}{oportunidade?.titulo}
            {nucleo ? ` · núcleo ${nucleo.nome}` : ''}. O projeto e os jobs aparecem no Workflow de Produção, em «Entrada de pedido».
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {sugeridos.length > 0 && (
            <div className="space-y-2">
              <Label>Modelos do núcleo {nucleo?.nome}</Label>
              <div className="grid sm:grid-cols-2 gap-2">{sugeridos.map(m => <Opcao key={m.grupo + m.codigo} m={m} />)}</div>
            </div>
          )}
          <div className="space-y-2">
            <Label>{sugeridos.length ? 'Outros modelos' : 'Escolha o modelo'}</Label>
            <div className="grid sm:grid-cols-2 gap-2">
              {outros.map(m => <Opcao key={m.grupo + m.codigo} m={{ ...m, resumo: `${m.grupo} · ${m.resumo}` }} />)}
              <Opcao m={BRANCO} />
            </div>
          </div>
          <div className="grid sm:grid-cols-[1fr_180px] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="abrir-prod-nome">Nome do projeto</Label>
              <Input id="abrir-prod-nome" value={nome} onChange={e => setNome(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="abrir-prod-prazo">Prazo de entrega (opcional)</Label>
              <Input id="abrir-prod-prazo" type="date" value={prazo} onChange={e => setPrazo(e.target.value)} />
            </div>
          </div>
          {modelo && (
            <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Jobs a criar:</span> {modelo.fases.map(f => f.titulo).join(' · ')}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={aCriar}>Agora não</Button>
          <Button onClick={criar} disabled={aCriar || !modelo || !nome.trim()}>
            {aCriar ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Rocket className="h-4 w-4 mr-2" />}
            Abrir na produção
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
