import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  BookOpen, CalendarCheck, ClipboardList, FileDown, MapPin, UserRound,
  AlertTriangle, CheckCircle2, ShieldCheck,
} from 'lucide-react';
import type { MatriculaPortal } from '@/hooks/usePortalAluno';

/**
 * O percurso do aluno num curso.
 *
 * Antes a matrícula era uma linha com o nome e as datas. Faltava tudo o que o
 * formando quer mesmo saber: o que vai aprender, quantas aulas faltou, que nota
 * teve, e — a pergunta mais frequente — porque é que ainda não tem certificado.
 *
 * As secções que dependem de dados por lançar não aparecem vazias: dizem que
 * ainda não foram lançados. Um ecrã com caixas vazias parece avariado.
 */
export function CursoDetalhe({ m, fmt }: { m: MatriculaPortal; fmt: (d: string | null) => string }) {
  return (
    <div className="border-t pt-4 mt-4 space-y-5">

      {/* Onde, quando e com quem */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
        <span>{fmt(m.inicio)} a {fmt(m.fim)}</span>
        {m.carga_horaria && <span>{m.carga_horaria}h</span>}
        {m.local && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{m.local}</span>}
        {m.docente_nome && <span className="inline-flex items-center gap-1"><UserRound className="h-3.5 w-3.5" />{m.docente_nome}</span>}
      </div>

      {/* ── Certificado: tem, ou porque não ─────────────────────────────── */}
      {m.certificado_codigo ? (
        <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/5 p-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          <div className="flex-1 text-sm">
            <p className="font-medium text-green-700">Certificado emitido</p>
            <code className="text-xs font-mono text-muted-foreground">{m.certificado_codigo}</code>
          </div>
          <Button size="sm" variant="outline" asChild>
            <a href={`/certificado/${encodeURIComponent(m.certificado_codigo)}`} target="_blank" rel="noreferrer">
              <ShieldCheck className="h-4 w-4 mr-1.5" />Verificar
            </a>
          </Button>
        </div>
      ) : m.motivo_sem_certificado && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-700">Ainda sem certificado</p>
            <p className="text-muted-foreground">{m.motivo_sem_certificado}</p>
          </div>
        </div>
      )}

      {/* ── Assiduidade e nota, lado a lado ─────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-4">
        <Seccao icon={CalendarCheck} titulo="Assiduidade">
          {m.aulas_registadas === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda não há presenças lançadas.</p>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{m.assiduidade_pct}%</span>
                <span className="text-sm text-muted-foreground">
                  {m.presencas} de {m.aulas_registadas} aulas
                </span>
              </div>
              <Progress value={m.assiduidade_pct ?? 0} className="h-2 mt-2" />
            </>
          )}
        </Seccao>

        <Seccao icon={ClipboardList} titulo="Avaliação">
          {m.avaliacoes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda não há avaliações lançadas.</p>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{m.nota_final}%</span>
                {m.aprovacao_minima != null && (
                  <span className="text-sm text-muted-foreground">mínimo {m.aprovacao_minima}%</span>
                )}
                {m.aprovado != null && (
                  <Badge variant="outline" className={m.aprovado
                    ? 'border-green-500/40 text-green-600 bg-green-500/10'
                    : 'border-red-500/40 text-red-600 bg-red-500/10'}>
                    {m.aprovado ? 'Aprovado' : 'Não aprovado'}
                  </Badge>
                )}
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {m.avaliacoes.map(a => (
                  <li key={a.id} className="flex justify-between gap-3 text-muted-foreground">
                    <span>{a.descricao || a.tipo || 'Avaliação'}</span>
                    <span className="font-medium text-foreground shrink-0">
                      {a.nota == null ? '—' : `${a.nota}${a.nota_maxima ? ` / ${a.nota_maxima}` : ''}`}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Seccao>
      </div>

      {/* ── Programa do curso ───────────────────────────────────────────── */}
      {m.modulos.length > 0 && (
        <Seccao icon={BookOpen} titulo="Conteúdo programático">
          <ul className="space-y-1 text-sm">
            {m.modulos.map((mod, i) => (
              <li key={i} className="flex justify-between gap-3 border-b border-border/40 pb-1">
                <span>{mod.modulo}</span>
                <span className="text-muted-foreground shrink-0">{mod.horas}h</span>
              </li>
            ))}
          </ul>
        </Seccao>
      )}

      {/* ── Materiais ───────────────────────────────────────────────────── */}
      <Seccao icon={FileDown} titulo="Materiais de apoio">
        {m.materiais.length === 0 ? (
          <p className="text-sm text-muted-foreground">Não há materiais publicados para esta turma.</p>
        ) : (
          <ul className="space-y-2">
            {m.materiais.map(mat => (
              <li key={mat.id} className="flex items-center justify-between gap-3">
                <div className="text-sm">
                  <p className="font-medium">{mat.titulo}</p>
                  {mat.descricao && <p className="text-muted-foreground text-xs">{mat.descricao}</p>}
                </div>
                {mat.url && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={mat.url} target="_blank" rel="noreferrer">
                      <FileDown className="h-4 w-4 mr-1.5" />Abrir
                    </a>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Seccao>
    </div>
  );
}

function Seccao({ icon: Icon, titulo, children }: { icon: any; titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 mb-2">
        <Icon className="h-3.5 w-3.5" />{titulo}
      </p>
      {children}
    </div>
  );
}
