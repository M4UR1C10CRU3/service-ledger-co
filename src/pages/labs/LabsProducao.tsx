import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJobs, useJobEtapas } from '@/hooks/useJobs';
import { useProjetos } from '@/hooks/useProjetos';
import { useNucleos } from '@/hooks/useNucleos';
import { KanbanBoard, type KanbanColumnDef } from '@/components/shared/KanbanBoard';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatJobNumero, type Job } from '@/types/agency';
import { CalendarDays, Search, AlertTriangle, ExternalLink } from 'lucide-react';

/**
 * Workflow de Produção do Clariza Labs — todos os trabalhos de todos os
 * projetos ativos num só quadro, por etapa (Briefing → … → Concluído).
 *
 * Cada projeto já tinha o seu quadro; faltava a vista de quem coordena a
 * produção: o que está em criação, o que espera aprovação do cliente, o que
 * está atrasado — em todos os clientes e núcleos ao mesmo tempo.
 *
 * Mover um cartão usa exatamente o mesmo mecanismo do quadro do projeto
 * (useJobs().moverEtapa): respeita os campos obrigatórios de cada etapa e
 * dispara as mesmas automações. Não há um segundo motor.
 */
export default function LabsProducao() {
  const navigate = useNavigate();
  const { etapas } = useJobEtapas();
  const { jobs, moverEtapa } = useJobs();
  const { projetos } = useProjetos();
  const { nucleos, porId } = useNucleos();
  const [procura, setProcura] = useState('');
  const [nucleo, setNucleo] = useState('todos');
  const [responsavel, setResponsavel] = useState('todos');
  const [bloqueio, setBloqueio] = useState<{ job: string; destino: string; mensagem: string; campos: string[] } | null>(null);

  const projetoDe = useMemo(() => Object.fromEntries(projetos.map(p => [p.id, p])), [projetos]);
  const hoje = new Date().toISOString().slice(0, 10);
  const ha14dias = new Date(Date.now() - 14 * 864e5).toISOString();

  const visiveis = useMemo(() => jobs.filter(j => {
    const p = projetoDe[j.projetoId];
    if (!p || p.arquivado || p.estado === 'cancelado') return false;
    // Concluídos há mais de 14 dias saem do quadro (continuam no projeto).
    if (j.concluido && j.concluidoEm && j.concluidoEm < ha14dias) return false;
    if (nucleo !== 'todos' && (nucleo === 'sem' ? p.nucleoId : p.nucleoId !== nucleo)) return false;
    if (responsavel !== 'todos' && (j.responsavelNome ?? '—') !== responsavel) return false;
    if (procura.trim()) {
      const q = procura.toLowerCase();
      if (!`${j.titulo} ${p.nome} ${p.clienteNome ?? ''}`.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [jobs, projetoDe, nucleo, responsavel, procura, ha14dias]);

  const responsaveis = useMemo(() => [...new Set(jobs.map(j => j.responsavelNome ?? '—'))].sort(), [jobs]);
  const atrasados = visiveis.filter(j => !j.concluido && j.prazo && j.prazo < hoje).length;
  const colunas: KanbanColumnDef[] = etapas.map(e => ({ key: e.id, label: e.nome, color: e.cor }));

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="ds-eyebrow mb-2">Labs</p>
          <h1 className="text-3xl font-bold">Workflow de Produção</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Todos os trabalhos em curso, de todos os projetos. Arrasta para mudar de etapa; clica para abrir o projeto.
          </p>
        </div>
        <div className="flex gap-4 text-sm">
          <span>Em curso: <b className="tabular-nums">{visiveis.filter(j => !j.concluido).length}</b></span>
          <span className={atrasados ? 'text-destructive' : ''}>Atrasados: <b className="tabular-nums">{atrasados}</b></span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Trabalho, projeto ou cliente…" value={procura} onChange={e => setProcura(e.target.value)} />
        </div>
        <Select value={nucleo} onValueChange={setNucleo}>
          <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os núcleos</SelectItem>
            {nucleos.map(n => <SelectItem key={n.id} value={n.id}>{n.nome}</SelectItem>)}
            <SelectItem value="sem">Sem núcleo</SelectItem>
          </SelectContent>
        </Select>
        <Select value={responsavel} onValueChange={setResponsavel}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os responsáveis</SelectItem>
            {responsaveis.map(r => <SelectItem key={r} value={r}>{r === '—' ? 'Sem responsável' : r}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {etapas.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Ainda não há etapas de trabalho definidas.</CardContent></Card>
      ) : visiveis.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Nenhum trabalho com estes filtros. Os trabalhos nascem nos projetos — cria um projeto (ou usa um modelo na página do núcleo) e as fases aparecem aqui.
        </CardContent></Card>
      ) : (
        <KanbanBoard<Job>
          columns={colunas}
          items={visiveis}
          getColumnKey={j => j.etapaId ?? colunas[0]?.key ?? ''}
          onMove={async (jobId, etapaId) => {
            const destino = etapas.find(e => e.id === etapaId);
            if (!destino) return;
            const job = jobs.find(j => j.id === jobId);
            const origem = etapas.find(e => e.id === job?.etapaId);
            const r = await moverEtapa.mutateAsync({ id: jobId, etapa: destino, estadoOrigem: origem?.estadoCodigo ?? null }).catch(() => null);
            if (r && !r.ok) setBloqueio({ job: job?.titulo ?? 'Este trabalho', destino: destino.nome, mensagem: r.mensagem ?? 'Ainda não pode avançar.', campos: r.campos });
          }}
          renderCard={j => {
            const p = projetoDe[j.projetoId];
            const atrasado = !j.concluido && j.prazo && j.prazo < hoje;
            const n = porId(p?.nucleoId);
            return (
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/labs/projetos/${j.projetoId}`)}>
                <CardContent className="p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="outline" className="text-xs font-mono px-1.5 py-0">{p ? formatJobNumero(p.numero, j.sequencial) : j.sequencial}</Badge>
                    {j.prazo && (
                      <span className={`text-xs flex items-center gap-1 ${atrasado ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                        {atrasado ? <AlertTriangle className="h-3 w-3" /> : <CalendarDays className="h-3 w-3" />}
                        {new Date(j.prazo).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium leading-tight line-clamp-2">{j.titulo}</p>
                  <p className="text-xs text-muted-foreground truncate">{p?.clienteNome || p?.nome}</p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground truncate">{j.responsavelNome ?? 'Sem responsável'}</span>
                    {n && <span className="text-[10px] font-mono uppercase tracking-wider text-vertical truncate">{n.nome}</span>}
                  </div>
                </CardContent>
              </Card>
            );
          }}
        />
      )}

      <Dialog open={!!bloqueio} onOpenChange={v => { if (!v) setBloqueio(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>«{bloqueio?.job}» ainda não pode ir para {bloqueio?.destino}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{bloqueio?.mensagem}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBloqueio(null)}>Fechar</Button>
            {bloqueio && (
              <Button onClick={() => { const j = jobs.find(x => x.titulo === bloqueio.job); setBloqueio(null); if (j) navigate(`/labs/projetos/${j.projetoId}`); }}>
                <ExternalLink className="h-4 w-4 mr-2" />Abrir o projeto
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
