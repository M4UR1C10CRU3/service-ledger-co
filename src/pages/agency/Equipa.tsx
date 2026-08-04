import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  useAgencyEquipa, AREAS, SENIORIDADES, ORIGENS,
  type Funcao, type Senioridade,
} from '@/hooks/useAgencyEquipa';
import { useUtilizadores } from '@/hooks/useUtilizadores';
import { useAgencyPais } from '@/hooks/useAgencyPais';
import {
  UsersRound, Plus, AlertTriangle, ShieldQuestion, Trash2,
  Target, ClipboardCheck, Gauge, Split,
} from 'lucide-react';

export default function Equipa() {
  const { funcoes, equipa, funcoesSemDono, isLoading, atribuir, remover } = useAgencyEquipa();
  const { utilizadores } = useUtilizadores();
  const { eur } = useAgencyPais();

  const [detalhe, setDetalhe] = useState<Funcao | null>(null);
  const [atribuirAberto, setAtribuirAberto] = useState(false);
  const [form, setForm] = useState({
    utilizadorId: '', funcaoId: '', senioridade: 'pleno' as Senioridade, principal: false,
  });

  /** Pessoas com as funções que acumulam. */
  const pessoas = useMemo(() => {
    const m = new Map<string, { nome: string; horas: number; custo: number; funcoes: typeof equipa }>();
    for (const e of equipa) {
      const at = m.get(e.utilizadorId) ?? { nome: e.pessoa, horas: e.horas90d, custo: e.custo90d, funcoes: [] };
      at.funcoes.push(e);
      m.set(e.utilizadorId, at);
    }
    return Array.from(m.entries()).map(([id, v]) => ({ id, ...v }));
  }, [equipa]);

  const abrirAtribuir = (funcaoId?: string) => {
    setForm({ utilizadorId: '', funcaoId: funcaoId ?? '', senioridade: 'pleno', principal: false });
    setAtribuirAberto(true);
  };

  const submeter = async () => {
    if (!form.utilizadorId || !form.funcaoId) return;
    await atribuir.mutateAsync(form);
    setAtribuirAberto(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <UsersRound className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Equipa e funções</h1>
            <p className="text-sm text-muted-foreground">
              Quem é responsável por quê — e o que se espera de cada função
            </p>
          </div>
        </div>
        <Button onClick={() => abrirAtribuir()}>
          <Plus className="h-4 w-4 mr-2" /> Atribuir função
        </Button>
      </div>

      {/* O diagnóstico central */}
      {funcoesSemDono.length > 0 && (
        <Card className="border-amber-300 dark:border-amber-900/60">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-2 min-w-0">
              <p className="text-sm font-medium">
                {funcoesSemDono.length} responsabilidade{funcoesSemDono.length > 1 ? 's' : ''} sem dono
              </p>
              <p className="text-sm text-muted-foreground">
                Numa agência pequena não faz mal a mesma pessoa acumular funções — faz mal
                uma responsabilidade não ter dono nenhum. É aí que o trabalho cai no chão.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {funcoesSemDono.map(f => (
                  <button key={f.id}
                          className="text-xs px-2.5 py-1 rounded-full border border-amber-300 dark:border-amber-800
                                     hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                          onClick={() => abrirAtribuir(f.id)}>
                    {f.nome}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="pessoas">
        <TabsList>
          <TabsTrigger value="pessoas">Quem faz o quê</TabsTrigger>
          <TabsTrigger value="funcoes">As funções</TabsTrigger>
        </TabsList>

        {/* PESSOAS */}
        <TabsContent value="pessoas" className="mt-4">
          {pessoas.length === 0 ? (
            <Card><CardContent className="py-16 text-center">
              <UsersRound className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">
                Ainda ninguém tem função atribuída.
              </p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => abrirAtribuir()}>
                <Plus className="h-4 w-4 mr-2" /> Atribuir a primeira
              </Button>
            </CardContent></Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {pessoas.map(p => (
                <Card key={p.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{p.nome}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {p.horas.toFixed(1)}h nos últimos 90 dias · {eur(p.custo)}
                        </p>
                      </div>
                      {p.funcoes.length > 1 && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          acumula {p.funcoes.length}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {p.funcoes.map(f => (
                        <span key={f.funcaoId}
                              className="group inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md"
                              style={{ background: `${AREAS[f.area].cor}18`, color: AREAS[f.area].cor }}>
                          {f.funcao}
                          <span className="opacity-60">· {SENIORIDADES[f.senioridade]}</span>
                          {f.principal && <span title="Função principal">★</span>}
                          <button className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Remover função"
                                  onClick={() => remover.mutate({ utilizadorId: p.id, funcaoId: f.funcaoId })}>
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* FUNÇÕES */}
        <TabsContent value="funcoes" className="mt-4 space-y-3">
          {isLoading ? (
            <p className="text-center py-12 text-muted-foreground">A carregar...</p>
          ) : (
            Object.entries(AREAS).map(([area, cfg]) => {
              const doArea = funcoes.filter(f => f.area === area);
              if (!doArea.length) return null;
              return (
                <div key={area} className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: cfg.cor }}>
                    {cfg.label}
                  </p>
                  <div className="grid gap-2 md:grid-cols-2">
                    {doArea.map(f => {
                      const quem = equipa.filter(m => m.funcaoId === f.id);
                      return (
                        <Card key={f.id} className="cursor-pointer hover:shadow-md transition-shadow"
                              onClick={() => setDetalhe(f)}>
                          <CardContent className="p-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-semibold">{f.nome}</p>
                                {f.aliases && (
                                  <p className="text-xs text-muted-foreground truncate">{f.aliases}</p>
                                )}
                              </div>
                              {quem.length === 0 ? (
                                <Badge variant="outline" className="text-xs shrink-0 border-amber-400 text-amber-700 dark:text-amber-400">
                                  sem dono
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs shrink-0">
                                  {quem.length === 1 ? quem[0].pessoa.split(' ')[0] : `${quem.length} pessoas`}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">{f.missao}</p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Ficha completa da função */}
      <Dialog open={!!detalhe} onOpenChange={v => { if (!v) setDetalhe(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {detalhe && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                  {detalhe.nome}
                  <Badge variant="outline" className="text-xs"
                         style={{ borderColor: AREAS[detalhe.area].cor, color: AREAS[detalhe.area].cor }}>
                    {AREAS[detalhe.area].label}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-5">
                {detalhe.aliases && (
                  <p className="text-xs text-muted-foreground">também: {detalhe.aliases}</p>
                )}

                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm font-medium flex items-start gap-2">
                    <Target className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    {detalhe.missao}
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Responsabilidades
                    </p>
                    <ul className="text-sm space-y-1.5 list-disc pl-5 text-muted-foreground">
                      {detalhe.responsabilidades.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <ClipboardCheck className="h-3.5 w-3.5" /> Entregáveis típicos
                    </p>
                    <ul className="text-sm space-y-1.5 list-disc pl-5 text-muted-foreground">
                      {detalhe.entregaveis.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Gauge className="h-3.5 w-3.5" /> Indicadores
                  </p>
                  <div className="space-y-1.5">
                    {detalhe.indicadores.map((ind, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5"
                               title={ORIGENS[ind.o]?.nota}>
                          {ORIGENS[ind.o]?.label ?? ind.o}
                        </Badge>
                        <span className="text-muted-foreground">{ind.i}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {detalhe.sinaisAlerta && (
                  <div className="rounded-lg border border-amber-300 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1.5 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" /> Sinais de alerta
                    </p>
                    <p className="text-sm text-muted-foreground">{detalhe.sinaisAlerta}</p>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Split className="h-3.5 w-3.5" /> Decide sozinho
                    </p>
                    <p className="text-sm text-muted-foreground">{detalhe.decideSozinho}</p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <ShieldQuestion className="h-3.5 w-3.5" /> Tem de escalar
                    </p>
                    <p className="text-sm text-muted-foreground">{detalhe.escala}</p>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDetalhe(null)}>Fechar</Button>
                <Button onClick={() => { const id = detalhe.id; setDetalhe(null); abrirAtribuir(id); }}>
                  <Plus className="h-4 w-4 mr-2" /> Atribuir a alguém
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Atribuir */}
      <Dialog open={atribuirAberto} onOpenChange={setAtribuirAberto}>
        <DialogContent>
          <DialogHeader><DialogTitle>Atribuir função</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Pessoa</Label>
              <Select value={form.utilizadorId}
                      onValueChange={v => setForm(f => ({ ...f, utilizadorId: v }))}>
                <SelectTrigger><SelectValue placeholder="Escolher pessoa" /></SelectTrigger>
                <SelectContent>
                  {utilizadores.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Função</Label>
              <Select value={form.funcaoId} onValueChange={v => setForm(f => ({ ...f, funcaoId: v }))}>
                <SelectTrigger><SelectValue placeholder="Escolher função" /></SelectTrigger>
                <SelectContent>
                  {funcoes.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Senioridade</Label>
              <Select value={form.senioridade}
                      onValueChange={v => setForm(f => ({ ...f, senioridade: v as Senioridade }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SENIORIDADES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.principal}
                        onCheckedChange={c => setForm(f => ({ ...f, principal: !!c }))} />
              <Label className="cursor-pointer">É a função principal desta pessoa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAtribuirAberto(false)}>Cancelar</Button>
            <Button onClick={submeter}
                    disabled={!form.utilizadorId || !form.funcaoId || atribuir.isPending}>
              {atribuir.isPending ? 'A atribuir...' : 'Atribuir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
