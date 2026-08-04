import { useState } from 'react';
import { useRhFuncoes, type Funcao } from '@/hooks/useRhFuncoes';
import { useEmployees } from '@/hooks/useEmployees';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  ChevronRight, ChevronDown, Briefcase, Target, BookOpen, Award, Clock,
  Users, ShieldAlert, GitBranch, UserPlus,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// As descrições de função, para ler no ecrã como se lê o documento em papel:
// secções que abrem e fecham, uma de cada vez.
//
// Só se desenha o que a função tem. Uma secção vazia não aparece — é preferível
// a um ecrã cheio de traços a dizer que não há nada.
// ─────────────────────────────────────────────────────────────────────────────

const NIVEL: Record<string, string> = {
  direcao: 'Direção', tecnico: 'Coordena', assistente: 'Assiste', operacional: 'Executa',
};

function Seccao({ id, titulo, icone: Icone, aberta, onToggle, children }: {
  id: string; titulo: string; icone: any; aberta: boolean;
  onToggle: (id: string) => void; children: React.ReactNode;
}) {
  return (
    <div className="border-b last:border-b-0">
      <button
        onClick={() => onToggle(id)}
        className="w-full px-1 py-3.5 flex items-center justify-between hover:bg-muted/40 transition-colors text-left"
      >
        <span className="flex items-center gap-2.5">
          <Icone size={16} className="text-muted-foreground" />
          <span className="font-semibold">{titulo}</span>
        </span>
        {aberta ? <ChevronDown size={16} className="text-muted-foreground" />
                : <ChevronRight size={16} className="text-muted-foreground" />}
      </button>
      {aberta && <div className="px-1 pb-5 pt-1">{children}</div>}
    </div>
  );
}

const Lista = ({ itens, cor }: { itens: string[]; cor?: string }) => (
  <ul className="space-y-1.5">
    {itens.map((t, i) => (
      <li key={i} className="flex gap-2.5 text-sm">
        <span className="mt-[0.55em] h-[2px] w-[7px] shrink-0 rounded"
              style={{ backgroundColor: cor || 'currentColor', opacity: cor ? 1 : 0.35 }} />
        <span>{t}</span>
      </li>
    ))}
  </ul>
);

function DetalheFuncao({ f, ocupantes }: { f: Funcao; ocupantes: string[] }) {
  const [aberta, setAberta] = useState<string | null>('responsabilidades');
  const toggle = (id: string) => setAberta(a => (a === id ? null : id));
  const cor = f.cor || '#475569';

  const temReq = (f.requisitos.obrigatorios?.length || f.requisitos.valorizados?.length);
  const temComp = (f.competencias.profissionais?.length || f.competencias.comportamentais?.length);

  return (
    <div>
      <div className="rounded-lg p-5 mb-4 text-white" style={{ backgroundColor: cor }}>
        <p className="text-[11px] uppercase tracking-widest opacity-80">{NIVEL[f.nivel] ?? f.nivel}</p>
        <h2 className="text-2xl font-bold mt-0.5">{f.nome}</h2>
        {f.departamento && <p className="text-sm opacity-90 mt-0.5">{f.departamento}</p>}
        <p className="text-sm opacity-95 mt-3 max-w-2xl">{f.missao}</p>
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="bg-white/20 rounded-full px-2.5 py-0.5 text-xs">
            Revisão {new Date(f.revisao).toLocaleDateString('pt-PT')}
          </span>
          {f.horario && <span className="bg-white/20 rounded-full px-2.5 py-0.5 text-xs">{f.horario}</span>}
          {ocupantes.length > 0 && (
            <span className="bg-white/20 rounded-full px-2.5 py-0.5 text-xs">
              {ocupantes.join(', ')}
            </span>
          )}
        </div>
      </div>

      <div className="rounded-lg border px-4">
        <Seccao id="geral" titulo="Visão geral" icone={Briefcase} aberta={aberta === 'geral'} onToggle={toggle}>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            {[
              ['Local de trabalho', f.localTrabalho],
              ['Horário', f.horario],
              ['Reporta a', f.reportaA],
              ['Ferramentas', f.ferramentas],
            ].filter(([, v]) => !!v).map(([k, v]) => (
              <div key={k as string} className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">{k}</p>
                <p className="mt-0.5">{v}</p>
              </div>
            ))}
          </div>
          {f.substitui && (
            <p className="text-xs text-muted-foreground mt-3">Substitui: {f.substitui}</p>
          )}
        </Seccao>

        {!!temReq && (
          <Seccao id="requisitos" titulo="O que é preciso ter" icone={BookOpen} aberta={aberta === 'requisitos'} onToggle={toggle}>
            {!!f.requisitos.obrigatorios?.length && (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Obrigatório</p>
                <Lista itens={f.requisitos.obrigatorios} cor={cor} />
              </>
            )}
            {!!f.requisitos.valorizados?.length && (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mt-4 mb-2">Valorizado</p>
                <Lista itens={f.requisitos.valorizados} />
              </>
            )}
          </Seccao>
        )}

        {f.responsabilidades.length > 0 && (
          <Seccao id="responsabilidades" titulo="Responsabilidades" icone={Target} aberta={aberta === 'responsabilidades'} onToggle={toggle}>
            <div className="space-y-4">
              {f.responsabilidades.map(r => (
                <div key={r.area} className="border-l-[3px] pl-3.5" style={{ borderColor: cor }}>
                  <p className="font-semibold text-sm mb-1.5">{r.area}</p>
                  <Lista itens={r.itens} />
                </div>
              ))}
            </div>
          </Seccao>
        )}

        {f.naoEDoCargo.length > 0 && (
          <Seccao id="limites" titulo="O que não é deste cargo" icone={ShieldAlert} aberta={aberta === 'limites'} onToggle={toggle}>
            <p className="text-xs text-muted-foreground mb-2.5">
              Escrever o que não é do cargo evita a conversa do "pensei que fosses tu" três meses depois.
            </p>
            <Lista itens={f.naoEDoCargo} cor="#b91c1c" />
          </Seccao>
        )}

        {!!temComp && (
          <Seccao id="competencias" titulo="Competências" icone={Award} aberta={aberta === 'competencias'} onToggle={toggle}>
            <div className="grid sm:grid-cols-2 gap-5">
              {!!f.competencias.profissionais?.length && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Profissionais</p>
                  <Lista itens={f.competencias.profissionais} />
                </div>
              )}
              {!!f.competencias.comportamentais?.length && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Comportamentais</p>
                  <Lista itens={f.competencias.comportamentais} />
                </div>
              )}
            </div>
          </Seccao>
        )}

        {f.fluxos.map((fl, idx) => (
          <Seccao key={idx} id={`fluxo-${idx}`} titulo={fl.titulo} icone={GitBranch}
                  aberta={aberta === `fluxo-${idx}`} onToggle={toggle}>
            <div className="space-y-2.5">
              {fl.passos.map((p, i) => (
                <div key={i} className="flex items-start gap-3 rounded-md border p-3">
                  <span className="h-7 w-7 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0"
                        style={{ backgroundColor: cor }}>{i + 1}</span>
                  <div>
                    <p className="text-sm font-semibold">{p.titulo}</p>
                    <p className="text-sm text-muted-foreground">{p.descricao}</p>
                  </div>
                </div>
              ))}
            </div>
            {fl.nota && (
              <div className="mt-3 rounded-md border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/30 p-3">
                <p className="text-sm">{fl.nota}</p>
              </div>
            )}
          </Seccao>
        ))}

        {f.indicadores.length > 0 && (
          <Seccao id="indicadores" titulo="Como se avalia" icone={Clock} aberta={aberta === 'indicadores'} onToggle={toggle}>
            <p className="text-xs text-muted-foreground mb-2.5">
              Sem indicadores, uma descrição de função é uma lista de boas intenções que ninguém consegue avaliar.
            </p>
            <div className="flex flex-wrap gap-2">
              {f.indicadores.map((i, k) => (
                <span key={k} className="text-sm rounded-md bg-muted px-2.5 py-1">{i}</span>
              ))}
            </div>
          </Seccao>
        )}
      </div>
    </div>
  );
}

export default function Funcoes() {
  const { funcoes, passagens, ocupantes, atribuir, isLoading, semGrupo } = useRhFuncoes();
  const { employees } = useEmployees();
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [aAtribuir, setAAtribuir] = useState<Funcao | null>(null);
  const [colaborador, setColaborador] = useState('');

  const f = funcoes.find(x => x.id === selecionada) ?? funcoes[0] ?? null;

  if (isLoading) return <p className="p-6 text-muted-foreground">A carregar...</p>;

  if (semGrupo || funcoes.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Funções</h1>
        <div className="rounded-lg border border-dashed p-10 text-center mt-6">
          <p className="text-sm font-medium">Ainda não há descrições de função para esta empresa.</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            As descrições são partilhadas pelo grupo. Assim que existirem, aparecem aqui com as
            responsabilidades, os limites do cargo e a forma como o desempenho é avaliado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Users size={22} /> Funções</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          O que cada pessoa faz, o que não lhe compete, e como o trabalho passa de umas mãos para as outras.
        </p>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-5 items-start">
        {/* Lista de funções */}
        <div className="space-y-2">
          {funcoes.map(fn => {
            const ativa = f?.id === fn.id;
            const quem = ocupantes[fn.id] ?? [];
            return (
              <button
                key={fn.id}
                onClick={() => setSelecionada(fn.id)}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${
                  ativa ? 'bg-muted/60 border-primary/50' : 'hover:bg-muted/40'
                }`}
                style={ativa ? { borderLeftWidth: 4, borderLeftColor: fn.cor || undefined } : undefined}
              >
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {NIVEL[fn.nivel] ?? fn.nivel}
                </p>
                <p className="text-sm font-medium leading-snug mt-0.5">{fn.nome}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {quem.length > 0 ? quem.join(', ') : 'Por atribuir'}
                </p>
              </button>
            );
          })}

          {passagens.length > 0 && (
            <button
              onClick={() => setSelecionada('passagens')}
              className={`w-full text-left rounded-lg border border-dashed p-3 transition-colors ${
                selecionada === 'passagens' ? 'bg-muted/60' : 'hover:bg-muted/40'
              }`}
            >
              <p className="text-sm font-medium">As passagens</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {passagens.length} momentos em que o trabalho muda de mãos
              </p>
            </button>
          )}
        </div>

        {/* Detalhe */}
        <div>
          {selecionada === 'passagens' ? (
            <div>
              <h2 className="text-xl font-bold">As passagens</h2>
              <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-2xl">
                Não pertencem a nenhuma função: pertencem às duas. É por não terem dono declarado
                que o trabalho pára entre cadeiras à espera de que alguém repare.
              </p>
              <div className="rounded-lg border overflow-x-auto">
                <table className="w-full text-sm min-w-[560px]">
                  <thead>
                    <tr className="border-b">
                      {['Momento', 'Entrega', 'Recebe', 'O que vai junto'].map(h => (
                        <th key={h} className="text-left text-[11px] uppercase tracking-wide text-muted-foreground font-semibold px-3.5 py-2.5">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {passagens.map(p => (
                      <tr key={p.id} className="border-b last:border-b-0">
                        <td className="px-3.5 py-2.5">{p.momento}</td>
                        <td className="px-3.5 py-2.5"><Badge variant="outline">{p.entrega}</Badge></td>
                        <td className="px-3.5 py-2.5"><Badge variant="outline">{p.recebe}</Badge></td>
                        <td className="px-3.5 py-2.5 text-muted-foreground">{p.levaJunto || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : f ? (
            <>
              <div className="flex justify-end mb-2">
                <Button size="sm" variant="outline" className="gap-1.5"
                        onClick={() => { setAAtribuir(f); setColaborador(''); }}>
                  <UserPlus size={14} /> Atribuir a colaborador
                </Button>
              </div>
              <DetalheFuncao f={f} ocupantes={ocupantes[f.id] ?? []} />
            </>
          ) : null}
        </div>
      </div>

      <Dialog open={!!aAtribuir} onOpenChange={o => !o && setAAtribuir(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Atribuir "{aAtribuir?.nome}"</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground -mt-1">
            A função descreve o que a pessoa faz. O cargo no contrato mantém-se como está.
          </p>
          <Select value={colaborador} onValueChange={setColaborador}>
            <SelectTrigger><SelectValue placeholder="Escolher colaborador" /></SelectTrigger>
            <SelectContent>
              {employees.filter(e => e.status === 'active').map(e => (
                <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAAtribuir(null)}>Cancelar</Button>
            <Button
              disabled={!colaborador || atribuir.isPending}
              onClick={async () => {
                if (!aAtribuir) return;
                await atribuir.mutateAsync({ employeeId: colaborador, funcaoId: aAtribuir.id }).catch(() => null);
                setAAtribuir(null);
              }}
            >
              Atribuir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
