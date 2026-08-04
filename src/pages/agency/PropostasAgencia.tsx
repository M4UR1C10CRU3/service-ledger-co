import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAgencyPropostas, calcularLinha } from '@/hooks/useAgencyPropostas';
import { useCatalogo, useTextosPadrao } from '@/hooks/useAgencyCatalogo';
import { useProjetos } from '@/hooks/useProjetos';
import { useClientes } from '@/hooks/useClientes';
import { useAgencyPais } from '@/hooks/useAgencyPais';
import {
  PROPOSTA_AG_ESTADOS, PROPOSTA_AG_TRANSICOES,
  type PropostaAg, type PropostaAgLinha, type PropostaAgEstado,
} from '@/types/agency';
import {
  FileText, Plus, Trash2, Rocket, Layers, Type as TypeIcon, ChevronRight, FolderKanban,
} from 'lucide-react';

const linhaVazia = (ordem: number, tipo: PropostaAgLinha['tipoLinha'] = 'artigo'): PropostaAgLinha => ({
  ordem, tipoLinha: tipo, itemCatalogoId: null, referencia: '', designacao: '',
  quantidade: 1, unidade: 'und', precoUnitario: 0, descontoPct: 0,
  totalLinha: 0, horasPrevistas: null, externo: false,
});

export default function PropostasAgencia() {
  const navigate = useNavigate();
  const { propostas, isLoading, fetchLinhas, guardar, mudarEstado, lancarJobs, eliminar } = useAgencyPropostas();
  const { projetos } = useProjetos();
  const { clientes } = useClientes();
  const { itens } = useCatalogo();
  const { padraoDe } = useTextosPadrao();
  const { eur, config } = useAgencyPais();

  const [aberto, setAberto] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [projetoId, setProjetoId] = useState('');
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [clienteNome, setClienteNome] = useState('');
  const [titulo, setTitulo] = useState('');
  const [introducao, setIntroducao] = useState('');
  const [consideracoes, setConsideracoes] = useState('');
  const [condicoes, setCondicoes] = useState('');
  const [taxaImposto, setTaxaImposto] = useState<number | null>(23);
  const [linhas, setLinhas] = useState<PropostaAgLinha[]>([linhaVazia(0)]);

  const totalSem = useMemo(
    () => linhas.reduce((s, l) => s + calcularLinha(l), 0),
    [linhas],
  );
  const imposto = Number((totalSem * (taxaImposto ?? 0) / 100).toFixed(2));

  const projetoDe = (id: string | null) => projetos.find(p => p.id === id);

  const abrirNova = () => {
    setEditId(null);
    setProjetoId(projetos[0]?.id ?? '');
    setClienteId(null); setClienteNome(''); setTitulo('');
    setIntroducao(padraoDe('introducao'));
    setConsideracoes(padraoDe('consideracoes'));
    setCondicoes(padraoDe('condicoes_pagamento'));
    setTaxaImposto(23);
    setLinhas([linhaVazia(0)]);
    setAberto(true);
  };

  const abrirEdicao = async (p: PropostaAg) => {
    setEditId(p.id);
    setProjetoId(p.projetoId ?? '');
    setClienteId(p.clienteId); setClienteNome(p.clienteNome ?? '');
    setTitulo(p.titulo ?? '');
    setIntroducao(p.introducao ?? '');
    setConsideracoes(p.consideracoes ?? '');
    setCondicoes(p.condicoesPagamento ?? '');
    setTaxaImposto(p.taxaImposto);
    const ls = await fetchLinhas(p.id);
    setLinhas(ls.length ? ls : [linhaVazia(0)]);
    setAberto(true);
  };

  const submeter = async () => {
    if (!projetoId) return;
    await guardar.mutateAsync({
      id: editId ?? undefined, projetoId, clienteId, clienteNome,
      titulo, introducao, consideracoes, condicoesPagamento: condicoes,
      taxaImposto, linhas,
    });
    setAberto(false);
  };

  const aplicarItem = (idx: number, itemId: string) => {
    const it = itens.find(i => i.id === itemId);
    if (!it) return;
    setLinhas(ls => ls.map((l, i) => i === idx ? {
      ...l,
      itemCatalogoId: it.id,
      referencia: it.codigo ?? '',
      designacao: it.designacao,
      unidade: it.unidade,
      precoUnitario: it.precoUnitario ?? 0,
      horasPrevistas: it.horasPrevistasPadrao,
    } : l));
  };

  const atualizarLinha = (idx: number, patch: Partial<PropostaAgLinha>) =>
    setLinhas(ls => ls.map((l, i) => i === idx ? { ...l, ...patch } : l));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Propostas</h1>
            <p className="text-sm text-muted-foreground">
              O que se vendeu — e que se transforma em trabalho na pauta
            </p>
          </div>
        </div>
        <Button onClick={abrirNova} disabled={projetos.length === 0}>
          <Plus className="h-4 w-4 mr-2" /> Nova Proposta
        </Button>
      </div>

      {projetos.length === 0 && (
        <Card><CardContent className="py-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Uma proposta pertence sempre a um projeto — é o projeto que junta a proposta,
            os jobs e as horas no mesmo sítio.
          </p>
          <Button variant="outline" onClick={() => navigate('/agency/projetos')}>
            <FolderKanban className="h-4 w-4 mr-2" /> Criar o primeiro projeto
          </Button>
        </CardContent></Card>
      )}

      <Card><CardContent className="p-0">
        {isLoading ? (
          <p className="text-center py-12 text-muted-foreground">A carregar...</p>
        ) : propostas.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Ainda não há propostas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Nº</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-[180px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {propostas.map(p => {
                  const proj = projetoDe(p.projetoId);
                  const seguintes = PROPOSTA_AG_TRANSICOES[p.estado];
                  return (
                    <TableRow key={p.id} className="hover:bg-muted/40">
                      <TableCell className="font-mono text-sm text-muted-foreground cursor-pointer"
                                 onClick={() => abrirEdicao(p)}>
                        {proj ? `${proj.numero}.${p.sequencial}` : p.sequencial}
                      </TableCell>
                      <TableCell className="font-medium cursor-pointer" onClick={() => abrirEdicao(p)}>
                        {p.titulo || '—'}
                      </TableCell>
                      <TableCell className="text-sm">{proj?.nome ?? '—'}</TableCell>
                      <TableCell className="text-sm">{p.clienteNome || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={PROPOSTA_AG_ESTADOS[p.estado].cor}>
                          {PROPOSTA_AG_ESTADOS[p.estado].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{eur(p.totalComImposto)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          {seguintes.map(e => (
                            <Button key={e} variant="ghost" size="sm" className="text-xs h-7"
                                    onClick={() => mudarEstado.mutate({ id: p.id, estado: e })}>
                              {PROPOSTA_AG_ESTADOS[e].label} <ChevronRight className="h-3 w-3 ml-0.5" />
                            </Button>
                          ))}
                          {p.estado === 'aprovada' && !p.jobsLancados && (
                            <Button size="sm" className="text-xs h-7"
                                    onClick={() => lancarJobs.mutate(p.id)}
                                    disabled={lancarJobs.isPending}>
                              <Rocket className="h-3 w-3 mr-1" /> Lançar jobs
                            </Button>
                          )}
                          {p.jobsLancados && (
                            <span className="text-xs text-muted-foreground px-2">jobs lançados</span>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={() => eliminar.mutate(p.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent></Card>

      {/* Editor */}
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar proposta' : 'Nova proposta'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Projeto *</Label>
                <Select value={projetoId} onValueChange={setProjetoId}>
                  <SelectTrigger><SelectValue placeholder="Escolher projeto" /></SelectTrigger>
                  <SelectContent>
                    {projetos.map(p => (
                      <SelectItem key={p.id} value={p.id}>#{p.numero} — {p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cliente</Label>
                <Select value={clienteId ?? ''} onValueChange={v => {
                  const c = clientes.find(x => x.id === v);
                  setClienteId(v); setClienteNome(c?.nome ?? '');
                }}>
                  <SelectTrigger><SelectValue placeholder="Escolher cliente" /></SelectTrigger>
                  <SelectContent>
                    {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{config?.impostoLabel ?? 'Imposto'} (%)</Label>
                <Input type="number" step="0.1" value={taxaImposto ?? ''}
                       onChange={e => setTaxaImposto(e.target.value ? Number(e.target.value) : null)} />
              </div>
            </div>

            <div>
              <Label>Título</Label>
              <Input value={titulo} placeholder="Ex.: Campanha de Natal — criação e produção"
                     onChange={e => setTitulo(e.target.value)} />
            </div>

            <div>
              <Label>Introdução</Label>
              <Textarea rows={2} value={introducao} onChange={e => setIntroducao(e.target.value)} />
            </div>

            {/* Linhas */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Itens</Label>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => setLinhas(l => [...l, linhaVazia(l.length, 'seccao')])}>
                    <Layers className="h-3.5 w-3.5 mr-1" /> Secção
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setLinhas(l => [...l, linhaVazia(l.length, 'texto')])}>
                    <TypeIcon className="h-3.5 w-3.5 mr-1" /> Texto
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setLinhas(l => [...l, linhaVazia(l.length)])}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Artigo
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg divide-y">
                {linhas.map((l, idx) => (
                  <div key={idx} className="p-2">
                    {l.tipoLinha === 'seccao' || l.tipoLinha === 'texto' ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs shrink-0">
                          {l.tipoLinha === 'seccao' ? 'Secção' : 'Texto'}
                        </Badge>
                        <Input value={l.designacao} placeholder={l.tipoLinha === 'seccao' ? 'MATERIAL' : 'Nota livre...'}
                               onChange={e => atualizarLinha(idx, { designacao: e.target.value })} />
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                                onClick={() => setLinhas(ls => ls.filter((_, i) => i !== idx))}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-12 md:col-span-4">
                          <Select value={l.itemCatalogoId ?? ''} onValueChange={v => aplicarItem(idx, v)}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Do catálogo..." />
                            </SelectTrigger>
                            <SelectContent>
                              {itens.map(i => <SelectItem key={i.id} value={i.id}>{i.designacao}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Input className="mt-1 h-8" value={l.designacao} placeholder="Designação"
                                 onChange={e => atualizarLinha(idx, { designacao: e.target.value })} />
                        </div>
                        <div className="col-span-3 md:col-span-1">
                          <Label className="text-[10px]">Qtd</Label>
                          <Input className="h-8" type="number" step="0.001" value={l.quantidade}
                                 onChange={e => atualizarLinha(idx, { quantidade: Number(e.target.value) })} />
                        </div>
                        <div className="col-span-3 md:col-span-1">
                          <Label className="text-[10px]">Un.</Label>
                          <Input className="h-8" value={l.unidade}
                                 onChange={e => atualizarLinha(idx, { unidade: e.target.value })} />
                        </div>
                        <div className="col-span-3 md:col-span-2">
                          <Label className="text-[10px]">Preço</Label>
                          <Input className="h-8" type="number" step="0.01" value={l.precoUnitario}
                                 onChange={e => atualizarLinha(idx, { precoUnitario: Number(e.target.value) })} />
                        </div>
                        <div className="col-span-3 md:col-span-1">
                          <Label className="text-[10px]">Desc.%</Label>
                          <Input className="h-8" type="number" step="0.1" value={l.descontoPct}
                                 onChange={e => atualizarLinha(idx, { descontoPct: Number(e.target.value) })} />
                        </div>
                        <div className="col-span-4 md:col-span-1">
                          <Label className="text-[10px]">Horas</Label>
                          <Input className="h-8" type="number" step="0.5" value={l.horasPrevistas ?? ''}
                                 onChange={e => atualizarLinha(idx, { horasPrevistas: e.target.value ? Number(e.target.value) : null })} />
                        </div>
                        <div className="col-span-6 md:col-span-1 text-right">
                          <Label className="text-[10px]">Total</Label>
                          <p className="text-sm font-semibold tabular-nums h-8 flex items-center justify-end">
                            {eur(calcularLinha(l))}
                          </p>
                        </div>
                        <div className="col-span-2 md:col-span-1 flex justify-end">
                          <Button variant="ghost" size="icon" className="h-8 w-8"
                                  onClick={() => setLinhas(ls => ls.filter((_, i) => i !== idx))}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                As <strong>horas</strong> de cada linha viram um job quando a proposta for aprovada e
                lançada na pauta. Linhas sem horas não geram trabalho.
              </p>
            </div>

            {/* Totais */}
            <div className="flex justify-end">
              <div className="w-64 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total sem {config?.impostoLabel ?? 'imposto'}</span>
                  <span className="tabular-nums">{eur(totalSem)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{config?.impostoLabel ?? 'Imposto'} ({taxaImposto ?? 0}%)</span>
                  <span className="tabular-nums">{eur(imposto)}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t pt-1">
                  <span>Total</span>
                  <span className="tabular-nums">{eur(totalSem + imposto)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Considerações finais</Label>
                <Textarea rows={3} value={consideracoes} onChange={e => setConsideracoes(e.target.value)} />
              </div>
              <div>
                <Label>Condições de pagamento</Label>
                <Textarea rows={3} value={condicoes} onChange={e => setCondicoes(e.target.value)} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
            <Button onClick={submeter} disabled={!projetoId || guardar.isPending}>
              {guardar.isPending ? 'A guardar...' : 'Guardar proposta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
