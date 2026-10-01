import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Landmark, CalendarClock, Euro, FileCheck2, ListChecks, Info, ExternalLink, FileUp, Upload, Paperclip, Trash2, FolderOpen, Download } from 'lucide-react';
import { ImportarPropostaDialog } from '@/components/concursos/ImportarPropostaDialog';
import { useConcurso } from '@/hooks/useConcursos';
import { usePermissions } from '@/hooks/usePermissions';
import { formatEUR } from '@/lib/formatters';
import {
  ESTADO_LABEL, ESTADO_ORDEM, ESTADO_DOC_LABEL, ESTADO_DOC_ORDEM, FAMILIA_LABEL, parcialItem,
  type MapaItem, type EstadoDoc, type EstadoConcurso, type AnexoConcurso, type DocumentoConcurso,
} from '@/types/concursos';

const dataHora = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const data = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('pt-PT') : '—';

/** Aceita "1.250,50", "1250.50" e "1250" — o teclado português escreve com vírgula. */
const lerNumero = (s: string): number | null => {
  const t = s.trim().replace(/\s/g, '');
  if (!t) return null;
  const n = parseFloat(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t);
  return Number.isFinite(n) ? n : null;
};

const ORIGEM_BADGE: Record<string, { label: string; variant: 'secondary' | 'outline' | 'destructive' | 'default' }> = {
  reutilizado:  { label: 'igual à v1',   variant: 'secondary' },
  qtd_alterada: { label: 'qtd. mudou',   variant: 'default' },
  novo:         { label: 'novo',         variant: 'destructive' },
  manual:       { label: 'manual',       variant: 'outline' },
  importado:    { label: 'importado',    variant: 'outline' },
};

export default function ConcursoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { concurso, mapa, documentos, anexos, loading, gravarPreco, mudarEstadoDocumento, mudarEstado, urlAnexo, anexarADocumento, anexarPeca, removerAnexo, importarPrecos } = useConcurso(id);
  const podeEditar = can('concursos', 'editar');
  const [edicao, setEdicao] = useState<Record<string, string>>({});
  const [importarAberto, setImportarAberto] = useState(false);
  const [aCarregar, setACarregar] = useState<string | null>(null);

  const anexoPorId = useMemo(() => new Map(anexos.map(a => [a.id, a])), [anexos]);
  const ligados = useMemo(() => new Set(documentos.map(d => d.anexo_id).filter(Boolean) as string[]), [documentos]);
  const pecas = useMemo(() => anexos.filter(a => !ligados.has(a.id)), [anexos, ligados]);

  const abrirAnexo = async (a: AnexoConcurso) => {
    const url = await urlAnexo(a);
    if (url) window.open(url, '_blank', 'noopener');
  };
  const carregarParaDocumento = async (doc: DocumentoConcurso, f: File | null) => {
    if (!f) return;
    setACarregar(doc.id);
    try { await anexarADocumento(doc, f); } finally { setACarregar(null); }
  };
  const carregarPeca = async (f: File | null) => {
    if (!f) return;
    setACarregar('peca');
    try { await anexarPeca(f); } finally { setACarregar(null); }
  };

  // Um ZIP com os ficheiros de todas as linhas da checklist, com os nomes tal como estão
  // no cartão — é o que a Marta assina e submete na plataforma, sem abrir linha a linha.
  const [aEmpacotar, setAEmpacotar] = useState<string | null>(null);
  const docsComFicheiro = useMemo(() => documentos.filter(d => d.anexo_id && anexoPorId.has(d.anexo_id)), [documentos, anexoPorId]);
  const descarregarDossie = async () => {
    if (!concurso || docsComFicheiro.length === 0) return;
    setAEmpacotar('A preparar…');
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      const usados = new Set<string>();
      const indice: string[] = [`${concurso.designacao} · ${concurso.entidade_referencia ?? ''} · ${concurso.entidade_nome}`, ''];
      const falhas: string[] = [];
      for (let i = 0; i < docsComFicheiro.length; i++) {
        const d = docsComFicheiro[i];
        const a = anexoPorId.get(d.anexo_id!)!;
        setAEmpacotar(`${i + 1}/${docsComFicheiro.length}`);
        try {
          const url = await urlAnexo(a);
          if (!url) throw new Error('sem URL');
          const resp = await fetch(url);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          // nomes repetidos (raro) recebem um sufixo para não se sobreporem no ZIP
          let nome = a.nome;
          for (let n = 2; usados.has(nome); n++) nome = a.nome.replace(/(\.[^.]+)?$/, ` (${n})$1`);
          usados.add(nome);
          zip.file(nome, await resp.blob());
          indice.push(`${d.alinea && d.alinea !== '—' ? d.alinea + ')' : '—'}  ${d.nome}  →  ${nome}  [${ESTADO_DOC_LABEL[d.estado]}]`);
        } catch (e: any) {
          falhas.push(`${d.nome}: ${e?.message ?? 'falhou'}`);
        }
      }
      const emFalta = documentos.filter(d => !d.anexo_id && d.estado !== 'nao_aplicavel');
      if (emFalta.length) indice.push('', 'Sem ficheiro no cartão:', ...emFalta.map(d => `${d.alinea && d.alinea !== '—' ? d.alinea + ')' : '—'}  ${d.nome}`));
      zip.file('Índice.txt', indice.join('\n'));
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const el = document.createElement('a');
      const ref = (concurso.entidade_referencia || concurso.referencia_interna || 'concurso').replace(/[\\/:*?"<>|]+/g, '-');
      el.href = url; el.download = `${ref} - documentos da proposta.zip`; el.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      if (falhas.length) alert(`Ficaram de fora ${falhas.length} ficheiro(s):\n${falhas.join('\n')}`);
    } finally { setAEmpacotar(null); }
  };

  // ── Totais do mapa ──────────────────────────────────────────────────────────
  const totais = useMemo(() => {
    const porCapitulo: Record<string, { nome: string; total: number; itens: number; semPreco: number }> = {};
    let capAtual = '';
    let total = 0, itens = 0, semPreco = 0;
    for (const i of mapa) {
      if (i.nivel === 'capitulo') { capAtual = i.codigo; porCapitulo[capAtual] = { nome: i.descricao, total: 0, itens: 0, semPreco: 0 }; continue; }
      if (i.nivel !== 'item') continue;
      itens++;
      const p = parcialItem(i);
      const c = porCapitulo[capAtual] ?? (porCapitulo[capAtual] = { nome: capAtual, total: 0, itens: 0, semPreco: 0 });
      c.itens++;
      if (p == null) { semPreco++; c.semPreco++; } else { total += p; c.total += p; }
    }
    return { porCapitulo, total, itens, semPreco };
  }, [mapa]);

  const base = concurso?.preco_base ?? null;
  const diferenca = base != null ? totais.total - base : null;
  const pctBase = base ? (totais.total / base) * 100 : null;

  const docsFeitos = documentos.filter(d => ['validado', 'assinado', 'submetido'].includes(d.estado)).length;
  const docsAplicaveis = documentos.filter(d => d.estado !== 'nao_aplicavel').length;

  if (loading) return <div className="p-6 text-muted-foreground">A carregar…</div>;
  if (!concurso) return (
    <div className="p-6 space-y-3">
      <Button variant="ghost" onClick={() => navigate('/concursos')}><ArrowLeft size={14} className="mr-1" /> Concursos</Button>
      <p className="text-muted-foreground">Concurso não encontrado.</p>
    </div>
  );

  const dias = concurso.prazo_propostas ? Math.ceil((new Date(concurso.prazo_propostas).getTime() - Date.now()) / 86400000) : null;

  // ── Grelha do mapa ──────────────────────────────────────────────────────────
  const LinhaMapa = ({ i }: { i: MapaItem }) => {
    if (i.nivel === 'capitulo') {
      const c = totais.porCapitulo[i.codigo];
      return (
        <TableRow className="bg-muted/60">
          <TableCell className="font-mono text-xs font-bold">{i.codigo}</TableCell>
          <TableCell colSpan={4} className="font-bold uppercase text-xs tracking-wide">{i.descricao}</TableCell>
          <TableCell className="text-right font-bold whitespace-nowrap">{c ? formatEUR(c.total) : ''}</TableCell>
          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{c && c.semPreco > 0 ? `${c.semPreco} sem preço` : ''}</TableCell>
        </TableRow>
      );
    }
    if (i.nivel === 'artigo') {
      return (
        <TableRow className="bg-muted/30">
          <TableCell className="font-mono text-xs">{i.codigo}</TableCell>
          <TableCell colSpan={6} className="text-sm text-muted-foreground">{i.descricao}</TableCell>
        </TableRow>
      );
    }
    const p = parcialItem(i);
    const emEdicao = edicao[i.id];
    const valor = emEdicao ?? (i.preco_unitario != null ? String(i.preco_unitario).replace('.', ',') : '');
    const badge = i.origem_preco ? ORIGEM_BADGE[i.origem_preco] : null;
    return (
      <TableRow className={i.preco_unitario == null ? 'bg-destructive/5' : undefined}>
        <TableCell className="font-mono text-xs align-top">{i.codigo}</TableCell>
        <TableCell className="text-sm align-top">
          {i.descricao}
          {i.codigo_v1 && i.codigo_v1 !== i.codigo && <span className="ml-2 text-xs text-muted-foreground">(era {i.codigo_v1})</span>}
          {i.origem_preco === 'qtd_alterada' && i.quantidade_v1 != null && (
            <span className="ml-2 text-xs text-muted-foreground">qtd. v1: {i.quantidade_v1}</span>
          )}
        </TableCell>
        <TableCell className="text-xs text-center align-top">{i.unidade ?? ''}</TableCell>
        <TableCell className="text-right align-top whitespace-nowrap">{i.quantidade ?? ''}</TableCell>
        <TableCell className="align-top">
          <Input
            className="h-8 w-28 text-right"
            inputMode="decimal"
            disabled={!podeEditar}
            value={valor}
            placeholder="0,00"
            onChange={e => setEdicao(prev => ({ ...prev, [i.id]: e.target.value }))}
            onBlur={async e => {
              const n = lerNumero(e.target.value);
              const antigo = i.preco_unitario;
              setEdicao(prev => { const c = { ...prev }; delete c[i.id]; return c; });
              if (n !== antigo) await gravarPreco(i.id, n);
            }}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          />
        </TableCell>
        <TableCell className="text-right align-top whitespace-nowrap">{p != null ? formatEUR(p) : <span className="text-muted-foreground">—</span>}</TableCell>
        <TableCell className="align-top">{badge && <Badge variant={badge.variant} className="text-[10px]">{badge.label}</Badge>}</TableCell>
      </TableRow>
    );
  };

  return (
    <div className="p-6 space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" className="-ml-2 h-7" onClick={() => navigate('/concursos')}>
            <ArrowLeft size={14} className="mr-1" /> Concursos
          </Button>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{concurso.referencia_interna ?? 'Concurso'}{concurso.versao > 1 && ` · versão ${concurso.versao}`}</p>
          <h1 className="text-2xl font-semibold">{concurso.designacao}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Landmark size={13} /> {concurso.entidade_nome}{concurso.entidade_nipc && ` · NIPC ${concurso.entidade_nipc}`}{concurso.entidade_referencia && ` · ${concurso.entidade_referencia}`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant={dias != null && dias <= 2 ? 'destructive' : 'secondary'} className="gap-1 text-sm py-1">
            <CalendarClock size={13} /> Entrega {dataHora(concurso.prazo_propostas)}{dias != null && dias >= 0 && ` · faltam ${dias} dia${dias === 1 ? '' : 's'}`}
          </Badge>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Estado</span>
            <Select value={concurso.estado} onValueChange={v => mudarEstado(v as EstadoConcurso)} disabled={!podeEditar}>
              <SelectTrigger className="h-8 w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ESTADO_ORDEM.map(e => <SelectItem key={e} value={e}>{ESTADO_LABEL[e]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Preço base</p>
          <p className="text-xl font-semibold">{base != null ? formatEUR(base) : '—'}</p>
          <p className="text-xs text-muted-foreground">sem IVA</p>
        </Card>
        <Card className={`p-4 ${diferenca != null && diferenca > 0 ? 'border-destructive' : ''}`}>
          <p className="text-xs text-muted-foreground">Total do mapa</p>
          <p className="text-xl font-semibold">{formatEUR(totais.total)}</p>
          <p className="text-xs text-muted-foreground">
            {pctBase != null ? `${pctBase.toFixed(1)}% da base` : ''}{totais.semPreco > 0 && ` · ${totais.semPreco} de ${totais.itens} sem preço`}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Contra a base</p>
          <p className={`text-xl font-semibold ${diferenca != null && diferenca > 0 ? 'text-destructive' : ''}`}>
            {diferenca != null ? (diferenca > 0 ? '+' : '') + formatEUR(diferenca) : '—'}
          </p>
          <p className="text-xs text-muted-foreground">{diferenca != null && diferenca > 0 ? 'acima — não admissível' : 'margem disponível'}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Documentos</p>
          <p className="text-xl font-semibold">{docsFeitos} / {docsAplicaveis}</p>
          <p className="text-xs text-muted-foreground">validados ou além</p>
        </Card>
      </div>

      <Tabs defaultValue="mapa">
        <TabsList>
          <TabsTrigger value="dados" className="gap-1"><Info size={13} /> Dados</TabsTrigger>
          <TabsTrigger value="mapa" className="gap-1"><Euro size={13} /> Mapa de quantidades</TabsTrigger>
          <TabsTrigger value="documentos" className="gap-1"><ListChecks size={13} /> Documentos</TabsTrigger>
        </TabsList>

        {/* ── Dados ── */}
        <TabsContent value="dados" className="space-y-4">
          <Card className="p-5 grid md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            {[
              ['Tipo de procedimento', concurso.tipo_procedimento],
              ['Tipo de contrato', concurso.tipo_contrato],
              ['CPV', concurso.cpv],
              ['Local de execução', concurso.local_execucao],
              ['Prazo de execução', concurso.prazo_execucao_dias != null ? `${concurso.prazo_execucao_dias} dias` : null],
              ['Caução', concurso.caucao_pct != null ? `${concurso.caucao_pct}%` : null],
              ['Critério de adjudicação', concurso.criterio_adjudicacao],
              ['Fundos EU', concurso.fundos_eu == null ? null : concurso.fundos_eu ? 'Sim' : 'Não'],
              ['Habilitação exigida', concurso.habilitacao],
              ['Anúncio', concurso.anuncio_numero ? `${concurso.anuncio_numero}${concurso.anuncio_data ? ` · ${data(concurso.anuncio_data)}` : ''}` : null],
              ['Plataforma', concurso.plataforma],
              ['Manutenção da proposta', concurso.prazo_manutencao_dias != null ? `${concurso.prazo_manutencao_dias} dias` : null],
            ].map(([k, v]) => (
              <div key={k as string}>
                <p className="text-xs text-muted-foreground">{k}</p>
                <p>{(v as string) ?? <span className="text-muted-foreground">—</span>}</p>
              </div>
            ))}
            {concurso.url_pecas && (
              <div className="md:col-span-2">
                <a href={concurso.url_pecas} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1 text-sm">
                  Peças do concurso <ExternalLink size={12} />
                </a>
              </div>
            )}
          </Card>

          <Card className="p-5 space-y-2 text-sm">
            <p className="font-medium flex items-center gap-1"><FileCheck2 size={14} /> Decisão</p>
            {concurso.decisao ? (
              <>
                <p><Badge variant={concurso.decisao === 'avancar' ? 'default' : 'outline'}>{concurso.decisao === 'avancar' ? 'Avançar' : 'Declinar'}</Badge>
                  <span className="ml-2 text-muted-foreground">{data(concurso.decisao_em)}{concurso.decisao_por && ` · ${concurso.decisao_por}`}</span></p>
                {concurso.decisao_motivo && <p className="text-muted-foreground">{concurso.decisao_motivo}</p>}
              </>
            ) : <p className="text-muted-foreground">Ainda sem decisão.</p>}
          </Card>

          {concurso.notas && (
            <Card className="p-5 text-sm">
              <p className="font-medium mb-1">Notas</p>
              <p className="text-muted-foreground whitespace-pre-wrap">{concurso.notas}</p>
            </Card>
          )}
        </TabsContent>

        {/* ── Mapa ── */}
        <TabsContent value="mapa">
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Art.</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-center w-12">Un.</TableHead>
                    <TableHead className="text-right w-20">Qtd.</TableHead>
                    <TableHead className="w-32">P. unitário</TableHead>
                    <TableHead className="text-right w-28">Parcial</TableHead>
                    <TableHead className="w-24">Origem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mapa.map(i => <LinhaMapa key={i.id} i={i} />)}
                  <TableRow className="bg-muted font-bold">
                    <TableCell colSpan={5} className="text-right">TOTAL sem IVA</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{formatEUR(totais.total)}</TableCell>
                    <TableCell className="text-xs font-normal text-muted-foreground">{pctBase != null && `${pctBase.toFixed(1)}% da base`}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <div className="px-4 py-2 border-t flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
              O preço grava-se ao sair do campo. Os itens a vermelho ainda não têm preço. «Igual à v1» é o preço da versão anterior deste concurso; «qtd. mudou» é o mesmo preço com quantidade nova — convém rever.
              </p>
              {podeEditar && (
                <Button size="sm" onClick={() => setImportarAberto(true)} className="gap-1 shrink-0"><FileUp size={14} /> Importar proposta</Button>
              )}
            </div>
          </Card>
          <ImportarPropostaDialog
            aberto={importarAberto}
            onFechar={() => setImportarAberto(false)}
            mapa={mapa}
            precoBase={base}
            onAplicar={importarPrecos}
          />
        </TabsContent>

        {/* ── Documentos ── */}
        <TabsContent value="documentos" className="space-y-4">
          <Card className="p-0 overflow-hidden">
            <div className="px-4 py-2 border-b text-sm font-medium flex items-center justify-between gap-2">
              <span className="flex items-center gap-2"><ListChecks size={14} /> Documentos da proposta · art. 9.º do Programa</span>
              <Button size="sm" variant="outline" className="gap-1" disabled={docsComFicheiro.length === 0 || !!aEmpacotar} onClick={descarregarDossie} title="Um ZIP com os ficheiros de todas as linhas, com os nomes tal como estão aqui">
                <Download size={14} /> {aEmpacotar ? `A empacotar ${aEmpacotar}` : `Descarregar dossiê (${docsComFicheiro.length} ficheiros)`}
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">Al.</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead className="w-36">Estado</TableHead>
                  <TableHead>Ficheiro</TableHead>
                  <TableHead className="w-40">Quando</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documentos.map(d => {
                  const a = d.anexo_id ? anexoPorId.get(d.anexo_id) : null;
                  return (
                    <TableRow key={d.id} className={d.estado === 'nao_aplicavel' ? 'opacity-50' : undefined}>
                      <TableCell className="font-mono text-xs align-top">{d.alinea ?? ''}</TableCell>
                      <TableCell className="text-sm align-top">
                        {d.nome}
                        <div className="flex flex-wrap gap-1 mt-1">
                          <Badge variant="outline" className="text-[10px]">{FAMILIA_LABEL[d.familia]}</Badge>
                          {d.depende_do_preco && <Badge variant="outline" className="text-[10px]">depende do preço</Badge>}
                        </div>
                        {d.notas && <p className="text-xs text-muted-foreground mt-1">{d.notas}</p>}
                      </TableCell>
                      <TableCell className="align-top">
                        <Select value={d.estado} onValueChange={v => mudarEstadoDocumento(d.id, v as EstadoDoc)} disabled={!podeEditar}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[...ESTADO_DOC_ORDEM, 'nao_aplicavel' as EstadoDoc].map(e => <SelectItem key={e} value={e}>{ESTADO_DOC_LABEL[e]}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="align-top">
                        {a ? (
                          <div className="flex items-center gap-1 flex-wrap">
                            <Button variant="link" size="sm" className="h-7 px-1 gap-1 text-xs" onClick={() => abrirAnexo(a)}><Paperclip size={12} /> {a.nome}</Button>
                            {podeEditar && (
                              <label className="cursor-pointer text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 px-1">
                                <Upload size={12} /> substituir
                                <input type="file" className="hidden" onChange={e => carregarParaDocumento(d, e.target.files?.[0] ?? null)} />
                              </label>
                            )}
                          </div>
                        ) : podeEditar ? (
                          <label className="cursor-pointer inline-flex items-center gap-1 text-xs border rounded px-2 py-1 hover:bg-muted">
                            <Upload size={12} /> {aCarregar === d.id ? 'A carregar…' : 'Carregar ficheiro'}
                            <input type="file" className="hidden" onChange={e => carregarParaDocumento(d, e.target.files?.[0] ?? null)} />
                          </label>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground align-top">
                        {d.assinado_em ? `assinado ${dataHora(d.assinado_em)}` : d.validado_em ? `validado ${dataHora(d.validado_em)}${d.validado_por ? ` · ${d.validado_por}` : ''}` : ''}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <p className="px-4 py-2 text-xs text-muted-foreground border-t">
              Carregar um ficheiro num documento «por fazer» passa-o a «gerado». As certidões não se guardam aqui de forma permanente — carrega-se a versão atualizada em cada concurso.
            </p>
          </Card>

          <Card className="p-0 overflow-hidden">
            <div className="px-4 py-2 border-b text-sm font-medium flex items-center justify-between gap-2">
              <span className="flex items-center gap-2"><FolderOpen size={14} /> Peças do concurso e outros anexos · {pecas.length}</span>
              {podeEditar && (
                <label className="cursor-pointer inline-flex items-center gap-1 text-xs border rounded px-2 py-1 hover:bg-muted">
                  <Upload size={12} /> {aCarregar === 'peca' ? 'A carregar…' : 'Carregar'}
                  <input type="file" multiple className="hidden" onChange={async e => { for (const f of Array.from(e.target.files ?? [])) await carregarPeca(f); e.target.value = ''; }} />
                </label>
              )}
            </div>
            {pecas.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">Caderno de encargos, programa do procedimento, mapa da entidade, desenhos, anúncio — tudo o que veio da plataforma fica aqui.</p>
            ) : (
              <Table>
                <TableBody>
                  {pecas.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="text-sm">
                        <Button variant="link" size="sm" className="h-7 px-1 gap-1" onClick={() => abrirAnexo(a)}><Paperclip size={12} /> {a.nome}</Button>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground w-44">{dataHora(a.criado_em)}{a.adicionado_por_nome && ` · ${a.adicionado_por_nome}`}</TableCell>
                      <TableCell className="w-10">
                        {podeEditar && <Button variant="ghost" size="icon" className="h-7 w-7" title="Remover" onClick={() => { if (confirm(`Remover "${a.nome}"?`)) removerAnexo(a); }}><Trash2 size={13} /></Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
