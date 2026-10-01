import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, Save, FileCheck2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/hooks/use-toast';
import type { Candidato, Entrevista, Vaga } from '@/hooks/useRecrutamento';
import {
  BLOCO_LABEL, Guiao, RECOMENDACAO_LABEL, RelatorioEntrevista, Respostas,
  chamarIA, classificacaoPontuacao, contextoVaga, pontuacaoGuiao,
} from '@/lib/rhIA';

interface Props {
  aberto: boolean;
  onFechar: () => void;
  vaga: Vaga;
  funcao: any | null;
  candidato: Candidato;
  /** Entrevista já agendada, se houver; senão cria-se uma ao gravar. */
  entrevista: Entrevista | null;
}

/** Análise do CV para a IA: a nova (cruzada com a vaga) ou, nos candidatos antigos, os campos soltos. */
// Antes de correr rh-2-1-estrutura.sql a base não tem onde guardar o guião — dizê-lo claramente.
const explicarErro = (e: any) => /column/i.test(e?.message ?? '')
  ? 'A base de dados ainda não tem os campos do guião: falta correr o SQL rh-2-1-estrutura.sql.'
  : (e?.message ?? 'Sem permissão.');

const analiseDoCandidato = (c: Candidato) => c.ia_analise ?? {
  resumo: c.ia_resumo_perfil, mais_valias: c.ia_pontos_fortes, pontos_atencao: c.ia_pontos_atencao,
  classificacao: c.ia_adequacao_vaga, justificacao: c.ia_justificacao,
};

/**
 * Entrevista guiada: o guião é preparado para ESTE candidato (a partir da vaga,
 * da Função e da análise do CV); o entrevistador regista um resumo de cada
 * resposta e dá nota de 1 a 5 com as descrições à vista; no fim sai o
 * relatório prévio para a direção. A decisão continua a ser da direção.
 */
export function EntrevistaGuiaoDialog({ aberto, onFechar, vaga, funcao, candidato, entrevista }: Props) {
  const { empresa } = useEmpresa();
  const eu = useCurrentUser();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [entId, setEntId] = useState<string | null>(null);
  const [guiao, setGuiao] = useState<Guiao | null>(null);
  const [respostas, setRespostas] = useState<Respostas>({});
  const [notas, setNotas] = useState('');
  const [relatorio, setRelatorio] = useState<RelatorioEntrevista | null>(null);
  const [aPreparar, setAPreparar] = useState(false);
  const [aGravar, setAGravar] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    setEntId(entrevista?.id ?? null);
    setGuiao((entrevista?.guiao as Guiao) ?? null);
    setRespostas((entrevista?.respostas as Respostas) ?? {});
    setNotas(entrevista?.notas ?? '');
    setRelatorio((entrevista?.relatorio as RelatorioEntrevista) ?? null);
  }, [aberto, entrevista?.id]);

  const pontuacao = useMemo(() => pontuacaoGuiao(guiao, respostas), [guiao, respostas]);
  const respondidas = guiao ? guiao.perguntas.filter(p => respostas[p.id]?.nota).length : 0;

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ['rh-entrevistas'] });
    qc.invalidateQueries({ queryKey: ['rh-candidatos'] });
  };

  /** Grava a entrevista (cria-a se ainda não existir). Devolve o id. */
  const gravar = async (extra: Record<string, unknown> = {}): Promise<string | null> => {
    if (!empresa) return null;
    const payload = {
      guiao, respostas, notas: notas || null,
      pontuacao_100: pontuacao, pontuacao_final: pontuacao,
      entrevistador_nome: entrevista?.entrevistador_nome || eu.nome,
      ...extra,
    };
    if (entId) {
      const { data, error } = await (supabase.from('rh_entrevistas') as any).update(payload).eq('id', entId).select('id');
      if (error || !data?.length) { toast({ title: 'Não foi possível gravar', description: explicarErro(error), variant: 'destructive' }); return null; }
      return entId;
    }
    const { data, error } = await (supabase.from('rh_entrevistas') as any).insert({
      ...payload, empresa_id: empresa.id, vaga_id: vaga.id, candidato_id: candidato.id,
      data_hora: new Date().toISOString(), tipo: 'Presencial', estado: 'agendada',
    }).select('id').single();
    if (error || !data) { toast({ title: 'Não foi possível gravar', description: explicarErro(error), variant: 'destructive' }); return null; }
    setEntId(data.id);
    return data.id;
  };

  const preparar = async () => {
    setAPreparar(true);
    try {
      const g = await chamarIA<Guiao>('gerar_guiao', { vaga: contextoVaga(vaga, funcao), analise: analiseDoCandidato(candidato) });
      setGuiao(g);
      setRespostas({});
      toast({ title: 'Guião preparado', description: `${g.perguntas.length} perguntas. Pode gravar e usá-lo na entrevista.` });
    } catch (e: any) {
      toast({ title: 'Não foi possível preparar o guião', description: e.message, variant: 'destructive' });
    } finally {
      setAPreparar(false);
    }
  };

  const guardar = async () => {
    setAGravar(true);
    try { if (await gravar()) { refrescar(); toast({ title: 'Entrevista gravada' }); } }
    finally { setAGravar(false); }
  };

  const concluir = async () => {
    if (!guiao) return;
    setAGravar(true);
    try {
      const entrevistaRegistada = guiao.perguntas.map(p => ({
        bloco: p.bloco, criterio: p.criterio, pergunta: p.pergunta,
        resposta: respostas[p.id]?.resposta ?? '', nota: respostas[p.id]?.nota ?? null,
      }));
      const r = await chamarIA<RelatorioEntrevista>('relatorio_entrevista', {
        vaga: contextoVaga(vaga, funcao), candidato: candidato.nome, analise: analiseDoCandidato(candidato),
        entrevista: entrevistaRegistada, pontuacao, notas,
      });
      const id = await gravar({ relatorio: r, estado: 'realizada', recomendacao: r.recomendacao });
      if (!id) return;
      setRelatorio(r);
      // Média das entrevistas realizadas deste candidato, para o comparativo da vaga.
      const { data: todas } = await (supabase.from('rh_entrevistas') as any)
        .select('pontuacao_final').eq('candidato_id', candidato.id).eq('estado', 'realizada');
      const vals = (todas ?? []).map((x: any) => Number(x.pontuacao_final)).filter((v: number) => v > 0);
      const media = vals.length ? Math.round((vals.reduce((s: number, v: number) => s + v, 0) / vals.length) * 10) / 10 : pontuacao;
      await (supabase.from('rh_candidatos') as any).update({ pontuacao_media_entrev: media, estado: 'entrevistado' }).eq('id', candidato.id);
      refrescar();
      toast({ title: 'Entrevista concluída', description: 'O relatório prévio está pronto para a direção.' });
    } catch (e: any) {
      toast({ title: 'Não foi possível gerar o relatório', description: e.message, variant: 'destructive' });
    } finally {
      setAGravar(false);
    }
  };

  const setResp = (id: string, patch: { resposta?: string; nota?: number }) =>
    setRespostas(r => ({ ...r, [id]: { ...r[id], ...patch } }));
  const cls = classificacaoPontuacao(pontuacao);

  return (
    <Dialog open={aberto} onOpenChange={o => { if (!o) onFechar(); }}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Entrevista — {candidato.nome}</DialogTitle>
          <DialogDescription>{vaga.cargo}{entrevista?.data_hora ? ` · ${new Date(entrevista.data_hora).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })}` : ''}</DialogDescription>
        </DialogHeader>

        {!guiao ? (
          <div className="rounded-lg border border-dashed p-6 text-center space-y-3">
            <p className="text-sm">O Clariza prepara um guião de entrevista para este candidato, a partir dos requisitos da vaga e dos pontos de atenção do CV.</p>
            <Button onClick={preparar} disabled={aPreparar} className="gap-2">
              {aPreparar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Preparar guião
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted/50 p-3">
              <span className="text-sm">Respondidas <b>{respondidas}/{guiao.perguntas.length}</b></span>
              <span className="text-sm">Pontuação <b>{pontuacao ?? '—'}{pontuacao != null && '/100'}</b></span>
              <Badge className={cls.cor}>{cls.label}</Badge>
              {!relatorio && <Button variant="ghost" size="sm" className="ml-auto gap-1" onClick={preparar} disabled={aPreparar}><Sparkles className="h-3.5 w-3.5" /> Refazer guião</Button>}
            </div>

            {guiao.introducao && <p className="text-sm text-muted-foreground"><b>Abertura:</b> {guiao.introducao}</p>}

            {(['tecnico', 'comportamental', 'esclarecer'] as const).map(bloco => {
              const ps = guiao.perguntas.filter(p => p.bloco === bloco);
              if (!ps.length) return null;
              return (
                <section key={bloco} className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{BLOCO_LABEL[bloco]}</h3>
                  {ps.map((p, i) => {
                    const r = respostas[p.id] ?? {};
                    return (
                      <div key={p.id} className="rounded-lg border p-3 space-y-2">
                        <div className="flex gap-2 items-start">
                          <span className="text-xs font-mono text-muted-foreground mt-0.5">{i + 1}.</span>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm">{p.pergunta}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{p.criterio} · peso {p.peso} · procurar: {p.procurar}</p>
                          </div>
                        </div>
                        <Label htmlFor={`resp-${p.id}`} className="sr-only">Resposta</Label>
                        <Textarea id={`resp-${p.id}`} rows={2} placeholder="Resumo do que o candidato respondeu" value={r.resposta ?? ''}
                          onChange={e => setResp(p.id, { resposta: e.target.value })} disabled={!!relatorio} />
                        <div className="grid grid-cols-5 gap-1.5">
                          {[1, 2, 3, 4, 5].map(n => (
                            <button key={n} type="button" disabled={!!relatorio}
                              onClick={() => setResp(p.id, { nota: r.nota === n ? undefined : n })}
                              className={`rounded-md border px-2 py-1.5 text-left text-[11px] leading-tight transition-colors ${r.nota === n ? 'border-primary bg-primary/10' : 'hover:bg-muted'}`}>
                              <span className="block text-sm font-semibold">{n}</span>
                              <span className="text-muted-foreground">{n === 1 ? p.nota1 : n === 3 ? p.nota3 : n === 5 ? p.nota5 : ''}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </section>
              );
            })}

            {guiao.fecho && <p className="text-sm text-muted-foreground"><b>Fecho:</b> {guiao.fecho}</p>}

            <div className="space-y-1">
              <Label htmlFor="ent-notas">Notas livres do entrevistador</Label>
              <Textarea id="ent-notas" rows={3} value={notas} onChange={e => setNotas(e.target.value)} disabled={!!relatorio} />
            </div>

            {relatorio ? (
              <RelatorioView r={relatorio} pontuacao={pontuacao} />
            ) : (
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={guardar} disabled={aGravar} className="gap-1"><Save className="h-4 w-4" /> Gravar progresso</Button>
                <Button onClick={concluir} disabled={aGravar || respondidas === 0} className="gap-1">
                  {aGravar ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />} Concluir e gerar relatório
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function RelatorioView({ r, pontuacao }: { r: RelatorioEntrevista; pontuacao: number | null | undefined }) {
  const lista = (v?: string[]) => (v?.length ? <ul className="list-disc pl-5 text-sm space-y-0.5">{v.map((x, i) => <li key={i}>{x}</li>)}</ul> : <p className="text-sm text-muted-foreground">—</p>);
  const cls = classificacaoPontuacao(pontuacao);
  return (
    <div className="rounded-lg border-2 border-primary/30 p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">Relatório prévio da entrevista</h3>
        <Badge className={cls.cor}>{pontuacao ?? '—'}/100 · {cls.label}</Badge>
        <Badge variant="outline">Recomendação provável: {RECOMENDACAO_LABEL[r.recomendacao] ?? r.recomendacao}</Badge>
      </div>
      <p className="text-sm">{r.resumo}</p>
      <p className="text-sm text-muted-foreground italic">{r.justificacao}</p>
      {r.respostas_chave?.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-sm font-semibold">Respostas-chave</h4>
          {r.respostas_chave.map((x, i) => (
            <p key={i} className="text-sm"><b>{x.tema}:</b> {x.o_que_disse} <span className="text-muted-foreground">— {x.leitura}</span></p>
          ))}
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        <section><h4 className="text-sm font-semibold text-emerald-700 mb-1">Forças</h4>{lista(r.forcas)}</section>
        <section><h4 className="text-sm font-semibold text-amber-700 mb-1">Reservas</h4>{lista(r.reservas)}</section>
      </div>
      <section><h4 className="text-sm font-semibold mb-1">A verificar antes de decidir</h4>{lista(r.a_verificar)}</section>
      <p className="text-xs text-muted-foreground">A decisão de contratar é da direção. Este relatório resume o que foi registado na entrevista.</p>
    </div>
  );
}
