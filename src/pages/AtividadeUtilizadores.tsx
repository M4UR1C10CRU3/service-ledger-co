import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, subDays } from 'date-fns';
import { pt } from 'date-fns/locale';
import { AlertTriangle, CalendarDays, Download, FileText, History, Search, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { nomeDaSessao } from '@/lib/nomeDaSessao';
import {
  POR_PAGINA, lerTodosParaExportar, useAuditoria, usePessoasAuditoria,
  type FiltrosAuditoria, type TipoAcaoFiltro,
} from '@/hooks/useAuditoria';
import {
  MODULOS, contextoSemRepetir, entidadeDe, formatarValor, fraseDaAuditoria, moduloDe, rotuloCampo, tipoDeAcao,
  type RegistoAuditoria,
} from '@/lib/auditoriaFrases';
import { exportarExcel, exportarPDF } from '@/lib/auditoriaExportar';

/**
 * «Atividade dos utilizadores» — o relatório da auditoria total (21/10/2026).
 *
 * Tudo o que alguém cria, altera, apaga, marca ou desmarca fica registado pela
 * base de dados (gatilho em cada tabela), com quem, quando e o antes/depois.
 * Só administradores; cada um vê só as empresas e grupos a que tem acesso.
 */

const hoje = () => format(new Date(), 'yyyy-MM-dd');
const haDias = (n: number) => format(subDays(new Date(), n), 'yyyy-MM-dd');

const ACOES: { valor: TipoAcaoFiltro; nome: string }[] = [
  { valor: 'todas', nome: 'Todas (sem entradas)' },
  { valor: 'criou', nome: 'Criou' },
  { valor: 'alterou', nome: 'Alterou' },
  { valor: 'apagou', nome: 'Apagou' },
  { valor: 'marcou', nome: 'Marcou / desmarcou tarefas' },
  { valor: 'entrou', nome: 'Entradas na aplicação' },
];

const COR_ACAO: Record<ReturnType<typeof tipoDeAcao>, string> = {
  criou: 'bg-green-600 text-white',
  alterou: 'bg-sky-600 text-white',
  apagou: 'bg-destructive text-destructive-foreground',
  marcou: 'bg-violet-600 text-white',
  entrou: 'bg-muted text-muted-foreground',
  evento: 'bg-amber-600 text-white',
};

const FILTROS_INICIAIS: FiltrosAuditoria = {
  autor: 'todos', empresaId: 'todas', modulo: 'todos', acao: 'todas',
  de: haDias(7), ate: hoje(), pesquisa: '', incluirAutomaticas: false, registo: null,
};

export default function AtividadeUtilizadores() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, isLoading: permACarregar } = usePermissions();
  const { empresas } = useEmpresa();
  const pessoas = usePessoasAuditoria();

  const [filtros, setFiltros] = useState<FiltrosAuditoria>(FILTROS_INICIAIS);
  const [pesquisa, setPesquisa] = useState('');
  const [pagina, setPagina] = useState(0);
  const [aberto, setAberto] = useState<RegistoAuditoria | null>(null);
  const [aExportar, setAExportar] = useState<'excel' | 'pdf' | null>(null);
  const [eu, setEu] = useState('');

  const { registos, total, aCarregar, erro, semMigracao } = useAuditoria(filtros, pagina);

  useEffect(() => {
    if (!permACarregar && !isAdmin) {
      toast({ variant: 'destructive', title: 'Acesso negado', description: 'Só administradores veem a atividade dos utilizadores.' });
      navigate('/dashboard');
    }
  }, [isAdmin, permACarregar, navigate, toast]);

  useEffect(() => { void nomeDaSessao().then(s => setEu(s.nome)); }, []);

  const mudar = (parte: Partial<FiltrosAuditoria>) => {
    setFiltros(f => ({ ...f, ...parte }));
    setPagina(0);
  };

  // a pesquisa só dispara depois de parar de escrever
  useEffect(() => {
    const t = setTimeout(() => {
      setFiltros(f => (f.pesquisa === pesquisa ? f : { ...f, pesquisa }));
      setPagina(p => (filtros.pesquisa === pesquisa ? p : 0));
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reage ao texto escrito
  }, [pesquisa]);

  const empresaPorId = useMemo(() => new Map(empresas.map(e => [e.id, e])), [empresas]);
  const nomeEmpresa = (r: Pick<RegistoAuditoria, 'empresa_id' | 'ambito'>) =>
    (r.empresa_id && empresaPorId.get(r.empresa_id)?.nome)
    || (r.ambito === 'grupo' ? 'Todo o grupo' : r.ambito === 'global' ? 'Geral' : '—');
  const moedaDe = (id: string | null) => (id && empresaPorId.get(id)?.moeda) || 'EUR';

  const descricaoFiltros = () => {
    const partes: string[] = [];
    if (filtros.registo) partes.push(`histórico de ${entidadeDe(filtros.registo.tabela)} «${filtros.registo.rotulo ?? filtros.registo.registoId}»`);
    else partes.push(`de ${format(parseISO(filtros.de), 'dd/MM/yyyy')} a ${format(parseISO(filtros.ate), 'dd/MM/yyyy')}`);
    if (filtros.autor === 'sistema') partes.push('utilizador: Sistema');
    else if (filtros.autor !== 'todos') partes.push(`utilizador: ${pessoas.find(p => p.authUid === filtros.autor)?.nome ?? filtros.autor}`);
    if (filtros.empresaId !== 'todas') partes.push(`empresa: ${empresaPorId.get(filtros.empresaId)?.nome ?? ''}`);
    if (filtros.modulo !== 'todos') partes.push(`módulo: ${filtros.modulo}`);
    if (!filtros.registo) partes.push(`ação: ${ACOES.find(a => a.valor === filtros.acao)?.nome}`);
    if (filtros.pesquisa) partes.push(`pesquisa: «${filtros.pesquisa}»`);
    if (!filtros.incluirAutomaticas && !filtros.registo) partes.push('sem efeitos automáticos');
    return partes.join(' · ');
  };

  const exportar = async (tipo: 'excel' | 'pdf') => {
    setAExportar(tipo);
    try {
      const { registos: todos, cortado } = await lerTodosParaExportar(filtros);
      if (!todos.length) { toast({ title: 'Nada para exportar', description: 'Nenhum registo com estes filtros.' }); return; }
      const ctx = {
        nomeEmpresa,
        moedaEmpresa: moedaDe, filtros: descricaoFiltros(), geradoPor: eu || 'administrador',
      };
      if (tipo === 'excel') exportarExcel(todos, ctx); else exportarPDF(todos, ctx);
      if (cortado) toast({ title: 'Exportação limitada', description: 'Foram exportados os 10 000 registos mais recentes. Reduza o período para ver o resto.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Não foi possível exportar', description: e instanceof Error ? e.message : String(e) });
    } finally {
      setAExportar(null);
    }
  };

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  if (!isAdmin) return null;

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" /> Atividade dos utilizadores
          </h1>
          <p className="text-sm text-muted-foreground">
            Tudo o que cada pessoa cria, altera, apaga, marca ou desmarca — registado pela base de dados, com o antes e o depois.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" disabled={!!aExportar || semMigracao} onClick={() => exportar('excel')}>
            <Download className="w-4 h-4" /> {aExportar === 'excel' ? 'A exportar…' : 'Excel'}
          </Button>
          <Button variant="outline" className="gap-2" disabled={!!aExportar || semMigracao} onClick={() => exportar('pdf')}>
            <FileText className="w-4 h-4" /> {aExportar === 'pdf' ? 'A exportar…' : 'PDF'}
          </Button>
        </div>
      </div>

      {semMigracao && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="p-4 flex gap-3 text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">A auditoria ainda não está ativa nesta base de dados.</p>
              <p className="text-muted-foreground">
                Falta correr a migração no SQL Editor do Supabase (<code>sql-para-correr/2026-10-21-auditoria-1</code> a <code>-5</code>).
                Até lá, o registo antigo continua em <button className="underline" onClick={() => navigate('/auditoria')}>Auditoria</button>.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {filtros.registo ? (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="p-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              Histórico completo de {entidadeDe(filtros.registo.tabela)} <strong>«{filtros.registo.rotulo ?? filtros.registo.registoId}»</strong>
            </span>
            <Button size="sm" variant="outline" onClick={() => mudar({ registo: null })}>Voltar à lista</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-[200px]">
            <Label className="text-xs">Utilizador</Label>
            <Select value={filtros.autor} onValueChange={v => mudar({ autor: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="sistema">Sistema / automático</SelectItem>
                {pessoas.map(p => (
                  <SelectItem key={p.authUid} value={p.authUid}>{p.nome}{p.inativo ? ' (inativo)' : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-[190px]">
            <Label className="text-xs">Empresa</Label>
            <Select value={filtros.empresaId} onValueChange={v => mudar({ empresaId: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as minhas</SelectItem>
                {empresas.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-[190px]">
            <Label className="text-xs">Módulo</Label>
            <Select value={filtros.modulo} onValueChange={v => mudar({ modulo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {MODULOS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-[210px]">
            <Label className="text-xs">Ação</Label>
            <Select value={filtros.acao} onValueChange={v => mudar({ acao: v as TipoAcaoFiltro })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACOES.map(a => <SelectItem key={a.valor} value={a.valor}>{a.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-[145px]">
            <Label className="text-xs">De</Label>
            <Input type="date" value={filtros.de} max={filtros.ate} onChange={e => mudar({ de: e.target.value })} />
          </div>
          <div className="w-[145px]">
            <Label className="text-xs">Até</Label>
            <Input type="date" value={filtros.ate} min={filtros.de} onChange={e => mudar({ ate: e.target.value })} />
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => mudar({ de: hoje(), ate: hoje() })}>Hoje</Button>
            <Button size="sm" variant="ghost" onClick={() => mudar({ de: haDias(7), ate: hoje() })}>7 dias</Button>
            <Button size="sm" variant="ghost" onClick={() => mudar({ de: haDias(30), ate: hoje() })}>30 dias</Button>
          </div>
          <div className="flex-1 min-w-[200px] max-w-sm">
            <Label className="text-xs">Pesquisa</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Nº, nome, cartão, pessoa…" value={pesquisa} onChange={e => setPesquisa(e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground pb-2.5 cursor-pointer">
            <Switch checked={filtros.incluirAutomaticas} onCheckedChange={v => mudar({ incluirAutomaticas: v })} />
            Incluir efeitos automáticos
          </label>
        </div>
      )}

      <Card className="border-border">
        <CardContent className="p-0">
          {aCarregar ? (
            <div className="p-12 text-center text-muted-foreground">A carregar…</div>
          ) : erro && !semMigracao ? (
            <div className="p-12 text-center text-destructive text-sm">Não foi possível ler a auditoria: {erro}</div>
          ) : registos.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">Nenhuma atividade com estes filtros.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Quando</TableHead>
                    <TableHead className="w-[170px]">Quem</TableHead>
                    <TableHead>O que fez</TableHead>
                    <TableHead className="w-[160px]">Empresa</TableHead>
                    <TableHead className="w-[150px]">Módulo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registos.map(r => {
                    const tipo = tipoDeAcao(r);
                    return (
                      <TableRow key={r.id} className="cursor-pointer" onClick={() => setAberto(r)}>
                        <TableCell className="whitespace-nowrap text-sm tabular-nums">
                          {format(parseISO(r.quando), 'dd/MM/yyyy HH:mm:ss')}
                        </TableCell>
                        <TableCell className="text-sm font-medium">{r.autor_nome}</TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-start gap-2">
                            <Badge className={`text-[10px] shrink-0 mt-0.5 ${COR_ACAO[tipo]}`}>{tipo}</Badge>
                            <div className="min-w-0">
                              <p className="break-words">{fraseDaAuditoria(r, moedaDe(r.empresa_id))}</p>
                              {contextoSemRepetir(r) && <p className="text-xs text-muted-foreground break-words">{contextoSemRepetir(r)}</p>}
                              {r.automatica && <p className="text-[11px] text-muted-foreground italic">efeito automático</p>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{nomeEmpresa(r)}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{moduloDe(r.tabela)}</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {total > 0 && !aCarregar && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{total} registos · página {pagina + 1} de {totalPaginas}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={pagina === 0} onClick={() => setPagina(p => p - 1)}>Anterior</Button>
            <Button variant="outline" size="sm" disabled={pagina >= totalPaginas - 1} onClick={() => setPagina(p => p + 1)}>Seguinte</Button>
          </div>
        </div>
      )}

      <DetalheRegisto
        registo={aberto}
        empresa={aberto ? nomeEmpresa(aberto) : ''}
        moeda={moedaDe(aberto?.empresa_id ?? null)}
        onFechar={() => setAberto(null)}
        onHistorico={r => { setAberto(null); mudar({ registo: { tabela: r.tabela, registoId: r.registo_id!, rotulo: r.rotulo } }); }}
        onDiaDaPessoa={r => {
          setAberto(null);
          const dia = format(parseISO(r.quando), 'yyyy-MM-dd');
          mudar({ registo: null, autor: r.auth_uid ?? 'sistema', de: dia, ate: dia, acao: 'todas', modulo: 'todos', empresaId: 'todas' });
        }}
      />
    </div>
  );
}

function DetalheRegisto({ registo: r, empresa, moeda, onFechar, onHistorico, onDiaDaPessoa }: {
  registo: RegistoAuditoria | null;
  empresa: string;
  moeda: string;
  onFechar: () => void;
  onHistorico: (r: RegistoAuditoria) => void;
  onDiaDaPessoa: (r: RegistoAuditoria) => void;
}) {
  if (!r) return null;
  const antes = (r.antes ?? {}) as Record<string, unknown>;
  const depois = (r.depois ?? {}) as Record<string, unknown>;
  const linha = r.operacao === 'INSERT' ? depois : antes;
  const campos = r.operacao === 'UPDATE'
    ? r.campos ?? []
    : Object.keys(linha).filter(c => linha[c] !== null && linha[c] !== '').sort((a, b) => rotuloCampo(a).localeCompare(rotuloCampo(b), 'pt'));
  const vazios = r.operacao === 'UPDATE' ? 0 : Object.keys(linha).length - campos.length;

  return (
    <Dialog open onOpenChange={aberto => { if (!aberto) onFechar(); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base leading-snug pr-6">
            {r.autor_nome} {fraseDaAuditoria(r, moeda)}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
          <Info nome="Quando" valor={format(parseISO(r.quando), "dd 'de' MMMM yyyy, HH:mm:ss", { locale: pt })} />
          <Info nome="Quem" valor={`${r.autor_nome}${r.autor_email ? ` · ${r.autor_email}` : ''}`} />
          <Info nome="Empresa" valor={empresa} />
          <Info nome="Módulo" valor={`${moduloDe(r.tabela)} · ${entidadeDe(r.tabela)}`} />
          {r.contexto && <Info nome="Onde" valor={r.contexto} largo />}
          <Info nome="Origem" valor={r.automatica ? 'efeito automático de outra ação' : r.papel === 'authenticated' ? 'ação na aplicação' : `sistema (${r.papel ?? '?'})`} />
          <Info nome="Sessão / IP" valor={`${r.sessao_id ? r.sessao_id.slice(0, 8) : '—'} · ${r.ip ?? '—'}`} />
          <Info nome="Registo" valor={`${r.tabela} · ${r.registo_id ?? '—'}`} largo />
          {r.erro && <Info nome="Falha no registo" valor={r.erro} largo />}
        </div>

        {campos.length > 0 && (
          <div className="mt-3 border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Campo</TableHead>
                  {r.operacao === 'UPDATE' ? (<><TableHead>Antes</TableHead><TableHead>Depois</TableHead></>)
                    : <TableHead>{r.operacao === 'INSERT' ? 'Valor criado' : 'Valor apagado'}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {campos.map(c => (
                  <TableRow key={c}>
                    <TableCell className="text-xs font-medium align-top">{rotuloCampo(c)}</TableCell>
                    {r.operacao === 'UPDATE' ? (
                      <>
                        <TableCell className="text-xs align-top whitespace-pre-wrap break-words text-muted-foreground">{formatarValor(c, antes[c], moeda, false)}</TableCell>
                        <TableCell className="text-xs align-top whitespace-pre-wrap break-words">{formatarValor(c, depois[c], moeda, false)}</TableCell>
                      </>
                    ) : (
                      <TableCell className="text-xs align-top whitespace-pre-wrap break-words">{formatarValor(c, linha[c], moeda, false)}</TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {vazios > 0 && <p className="text-[11px] text-muted-foreground px-3 py-1.5">{vazios} campo{vazios > 1 ? 's' : ''} vazio{vazios > 1 ? 's' : ''} omitido{vazios > 1 ? 's' : ''}.</p>}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          {r.registo_id && (
            <Button size="sm" variant="outline" className="gap-2" onClick={() => onHistorico(r)}>
              <History className="w-4 h-4" /> Histórico deste registo
            </Button>
          )}
          <Button size="sm" variant="outline" className="gap-2" onClick={() => onDiaDaPessoa(r)}>
            <CalendarDays className="w-4 h-4" /> Tudo o que {r.autor_nome} fez neste dia
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Info({ nome, valor, largo }: { nome: string; valor: string; largo?: boolean }) {
  return (
    <div className={largo ? 'col-span-2' : undefined}>
      <span className="text-xs text-muted-foreground">{nome}</span>
      <p className="break-words">{valor}</p>
    </div>
  );
}
