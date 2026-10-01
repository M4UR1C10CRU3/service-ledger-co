import { Badge } from '@/components/ui/badge';
import { CheckCircle2, CircleDashed, XCircle } from 'lucide-react';
import type { AnaliseCV } from '@/lib/rhIA';

const AV = {
  cumpre:        { label: 'Cumpre',      icon: CheckCircle2, cor: 'text-emerald-600' },
  parcial:       { label: 'Em parte',    icon: CircleDashed, cor: 'text-amber-600' },
  nao_evidencia: { label: 'Não mostra',  icon: XCircle,      cor: 'text-red-600' },
} as const;

const corAderencia = (v: number) =>
  v >= 75 ? 'bg-emerald-100 text-emerald-800' : v >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800';

/** A análise do CV contra a vaga: requisito a requisito, mais-valias, pontos de atenção e o que confirmar. */
export function AnaliseCVView({ a }: { a: AnaliseCV }) {
  const lista = (v?: string[], cor = '') => (v?.length
    ? <ul className={`list-disc pl-5 space-y-0.5 text-sm ${cor}`}>{v.map((x, i) => <li key={i}>{x}</li>)}</ul>
    : <p className="text-sm text-muted-foreground">—</p>);
  const reqs = a.requisitos ?? [];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Badge className={`text-sm px-3 py-1 ${corAderencia(a.aderencia ?? 0)}`}>Adequação {a.aderencia ?? '—'}%</Badge>
        {a.classificacao && <Badge variant="outline">{a.classificacao}</Badge>}
        {a.experiencia_anos != null && <span className="text-sm text-muted-foreground">{a.experiencia_anos} anos de experiência relevante</span>}
      </div>
      <p className="text-sm">{a.resumo}</p>
      {a.justificacao && <p className="text-sm text-muted-foreground italic">{a.justificacao}</p>}

      {reqs.length > 0 && (
        <section>
          <h4 className="text-sm font-semibold mb-2">Requisitos da vaga</h4>
          <div className="rounded-md border divide-y">
            {reqs.map((r, i) => {
              const cfg = AV[r.avaliacao] ?? AV.nao_evidencia;
              const Icon = cfg.icon;
              return (
                <div key={i} className="flex gap-3 p-2.5 text-sm">
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.cor}`} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{r.requisito} {r.tipo === 'valorizado' && <span className="text-xs text-muted-foreground font-normal">(valorizado)</span>}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">{cfg.label} — {r.evidencia}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <section><h4 className="text-sm font-semibold mb-1 text-emerald-700">Mais-valias</h4>{lista(a.mais_valias)}</section>
        <section><h4 className="text-sm font-semibold mb-1 text-amber-700">Pontos de atenção</h4>{lista(a.pontos_atencao)}</section>
      </div>
      <section><h4 className="text-sm font-semibold mb-1">A confirmar na entrevista</h4>{lista(a.a_confirmar_na_entrevista)}</section>
      <div className="grid md:grid-cols-2 gap-4 text-sm">
        {a.formacao && <section><h4 className="font-semibold mb-1">Formação</h4><p>{a.formacao}</p></section>}
        {a.idiomas?.length ? <section><h4 className="font-semibold mb-1">Idiomas</h4><p>{a.idiomas.join(', ')}</p></section> : null}
      </div>
      <p className="text-xs text-muted-foreground">Análise preparada pela IA a partir do CV. Serve para preparar a entrevista; não substitui o juízo de quem entrevista.</p>
    </div>
  );
}
