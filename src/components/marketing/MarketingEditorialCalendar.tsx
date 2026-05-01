import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Printer, RotateCcw, FileJson, Plus, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/**
 * Calendário Editorial — Loja Tudo Casa (Maio 2026)
 * Layout estático conforme spec visual aprovada.
 * Dados hardcoded como template demonstrativo. "Repor original" restaura.
 */

type EditorialCategoria =
  | 'carrossel_promo'
  | 'produto'
  | 'dica_util'
  | 'data_especial'
  | 'interacao'
  | 'institucional'
  | 'bastidores';

interface EditorialPost {
  id: string;
  day: number; // dia do mês (Maio 2026)
  categoria: EditorialCategoria;
  titulo: string;
  badge?: string; // ex: "Dia do Trabalhador" / "Dia da Mãe" / "Siga o Instagram"
  fb?: string; // hora FB ex "10:00h"
  ig?: string; // hora IG ex "12:00h"
  briefing?: string;
}

const CATEGORIA_CONFIG: Record<EditorialCategoria, { label: string; color: string; bg: string; text: string }> = {
  carrossel_promo: { label: 'Carrossel promo', color: '#A855F7', bg: 'bg-purple-100', text: 'text-purple-700' },
  produto:         { label: 'Produto',          color: '#22C55E', bg: 'bg-green-100',  text: 'text-green-700' },
  dica_util:       { label: 'Dica útil',        color: '#F97316', bg: 'bg-orange-100', text: 'text-orange-700' },
  data_especial:   { label: 'Data especial',    color: '#EF4444', bg: 'bg-red-100',    text: 'text-red-700' },
  interacao:       { label: 'Interação',        color: '#3B82F6', bg: 'bg-blue-100',   text: 'text-blue-700' },
  institucional:   { label: 'Institucional',    color: '#64748B', bg: 'bg-slate-200',  text: 'text-slate-700' },
  bastidores:      { label: 'Bastidores',       color: '#EC4899', bg: 'bg-pink-100',   text: 'text-pink-700' },
};

// Exatamente os 18 posts visíveis na imagem de referência (Maio 2026)
const ORIGINAL_POSTS: EditorialPost[] = [
  // Semana 1 (1–3)
  { id: 'p-01', day: 1, categoria: 'data_especial', badge: 'Dia do Trabalhador', titulo: 'Dia do Trabalhador — Às mãos que c…', fb: '10:00h', ig: '12:00h',
    briefing: 'Homenagem ao Dia do Trabalhador — celebrar as mãos que constroem casa. Tom emotivo, agradecer clientes e equipa.' },
  { id: 'p-02', day: 2, categoria: 'institucional', titulo: 'Siga o Instagram', fb: '11:00h', ig: '18:00h',
    briefing: 'Convite para seguir o Instagram da Loja Tudo Casa — destacar conteúdo exclusivo e novidades.' },
  { id: 'p-03', day: 3, categoria: 'data_especial', badge: 'Dia da Mãe', titulo: 'Dia da Mãe — Para quem faz da casa…', fb: '11:00h', ig: '20:00h',
    briefing: 'Homenagem ao Dia da Mãe — "para quem faz da casa um lar". CTA: visitar loja para presente especial.' },

  // Semana 2 (4–10)
  { id: 'p-05', day: 5, categoria: 'produto', titulo: 'Ar condicionado', fb: '10:00h', ig: '18:00h',
    briefing: 'Apresentar gama de ar condicionado disponível para o verão — eficiência energética, instalação e marcas.' },
  { id: 'p-06', day: 6, categoria: 'dica_util', titulo: 'Manutenção de primavera', fb: '09:00h', ig: '11:00h',
    briefing: 'Dicas práticas de manutenção de primavera para a casa: limpezas, revisões e pequenas reparações.' },
  { id: 'p-07', day: 7, categoria: 'carrossel_promo', titulo: 'Semana 1', fb: '09:00h', ig: '19:00h',
    briefing: 'Carrossel promocional — destaques da Semana 1 de Maio. 5 a 7 produtos com preços.' },
  { id: 'p-08', day: 8, categoria: 'institucional', titulo: 'Compra online, levanta na loja', fb: '10:00h', ig: '12:00h',
    briefing: 'Reforçar serviço click & collect — comprar online no site e levantar gratuitamente na loja física.' },

  // Semana 3 (11–17)
  { id: 'p-11', day: 11, categoria: 'bastidores', titulo: 'O nosso showroom', fb: '09:00h', ig: '19:00h',
    briefing: 'Bastidores — apresentar o showroom da loja, mostrar ambientes, equipa e variedade de produtos.' },
  { id: 'p-12', day: 12, categoria: 'produto', titulo: 'Casa de banho', fb: '10:00h', ig: '19:00h',
    briefing: 'Apresentar coleções de casa de banho — louças sanitárias, móveis e acessórios.' },
  { id: 'p-13', day: 13, categoria: 'dica_util', titulo: 'Jardim para o verão', fb: '09:00h', ig: '11:00h',
    briefing: 'Dicas para preparar o jardim para o verão — rega, plantas, mobiliário e iluminação exterior.' },
  { id: 'p-14', day: 14, categoria: 'carrossel_promo', titulo: 'Semana 2', fb: '09:00h', ig: '19:00h',
    briefing: 'Carrossel promocional — destaques da Semana 2 de Maio. 5 a 7 produtos com preços.' },
  { id: 'p-15', day: 15, categoria: 'interacao', titulo: 'Mostra a tua casa', fb: '09:00h', ig: '12:00h',
    briefing: 'Pedido de interação — convidar seguidores a partilhar fotos da casa renovada com produtos da loja.' },

  // Semana 4 (18–24)
  { id: 'p-18', day: 18, categoria: 'institucional', titulo: 'Atendimento via WhatsApp', fb: '09:00h', ig: '19:00h',
    briefing: 'Reforçar canal WhatsApp para atendimento rápido — tirar dúvidas, orçamentos e disponibilidade.' },
  { id: 'p-19', day: 19, categoria: 'produto', titulo: 'Pavimento Vinil', fb: '10:00h', ig: '19:00h',
    briefing: 'Apresentar pavimento vinílico — vantagens, cores, fácil instalação e resistência.' },
  { id: 'p-21', day: 21, categoria: 'carrossel_promo', titulo: 'Semana 3', fb: '09:00h', ig: '19:00h',
    briefing: 'Carrossel promocional — destaques da Semana 3 de Maio.' },
  { id: 'p-22', day: 22, categoria: 'dica_util', titulo: 'Janelas: PVC ou alumínio?', fb: '09:00h', ig: '12:00h',
    briefing: 'Comparativo entre janelas em PVC e alumínio — vantagens, isolamento, manutenção e preço.' },

  // Semana 5 (25–31)
  { id: 'p-25', day: 25, categoria: 'institucional', titulo: 'Loja online Tudo Casa', fb: '10:00h', ig: '19:00h',
    briefing: 'Apresentar a loja online — catálogo, encomendas, envios e segurança.' },
  { id: 'p-26', day: 26, categoria: 'produto', titulo: 'Iluminação', fb: '10:00h', ig: '19:00h',
    briefing: 'Apresentar gama de iluminação interior e exterior — candeeiros, LED, focos.' },
  { id: 'p-28', day: 28, categoria: 'carrossel_promo', titulo: 'Semana 4', fb: '09:00h', ig: '19:00h',
    briefing: 'Carrossel promocional — destaques da Semana 4 de Maio.' },
  { id: 'p-29', day: 29, categoria: 'institucional', titulo: 'Visita-nos em Mirandela', fb: '09:00h', ig: '19:00h',
    briefing: 'Convite para visitar a loja física em Mirandela — morada, horário e mapa.' },
  { id: 'p-30', day: 30, categoria: 'interacao', titulo: 'Qual é o teu próximo projeto?', fb: '11:00h', ig: '18:00h',
    briefing: 'Pergunta aberta nos comentários — qual o próximo projeto de casa do seguidor?' },
];

const STORAGE_KEY = 'tudocasa_editorial_maio2026_v1';

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

// Maio 2026: 1 = sexta-feira. Calculamos as semanas Seg→Dom
const MAIO_2026 = {
  ano: 2026,
  mes: 5, // Maio
  diasNoMes: 31,
  // weekday do dia 1 (0=Dom..6=Sáb) — 2026-05-01 é Sexta-feira → 5
  primeiroWeekday: 5,
};

interface WeekRow {
  label: string;
  days: (number | null)[]; // 7 colunas Seg..Dom
}

function buildWeeks(): WeekRow[] {
  const weeks: WeekRow[] = [];
  // converter para Mon-first: Mon=0..Sun=6
  const firstColumn = (MAIO_2026.primeiroWeekday + 6) % 7; // 5+6=11 %7 = 4 → Sex (correto)
  let currentRow: (number | null)[] = Array(7).fill(null);
  let col = firstColumn;
  let weekStart: number | null = null;
  let weekEnd: number | null = null;

  for (let day = 1; day <= MAIO_2026.diasNoMes; day++) {
    if (weekStart === null) weekStart = day;
    currentRow[col] = day;
    weekEnd = day;
    if (col === 6) {
      weeks.push({
        label: `${weekStart} a ${weekEnd} de maio`,
        days: currentRow,
      });
      currentRow = Array(7).fill(null);
      col = 0;
      weekStart = null;
    } else {
      col++;
    }
  }
  if (weekStart !== null) {
    weeks.push({
      label: `${weekStart} a ${weekEnd} de maio`,
      days: currentRow,
    });
  }
  return weeks;
}

interface Props {
  empresaIniciais?: string; // para o avatar do header
  empresaNome?: string;
}

export function MarketingEditorialCalendar({ empresaIniciais = 'TC', empresaNome = 'Loja Tudo Casa' }: Props) {
  const { toast } = useToast();

  // Carregar do localStorage ou usar original
  const [posts, setPosts] = useState<EditorialPost[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return ORIGINAL_POSTS;
  });
  const [viewPost, setViewPost] = useState<EditorialPost | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [hoverDay, setHoverDay] = useState<number | null>(null);

  const weeks = useMemo(() => buildWeeks(), []);

  const persist = useCallback((next: EditorialPost[]) => {
    setPosts(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }, []);

  const byDay = useMemo(() => {
    const m: Record<number, EditorialPost[]> = {};
    for (const p of posts) (m[p.day] = m[p.day] || []).push(p);
    return m;
  }, [posts]);

  const handleDrop = (targetDay: number) => {
    if (!dragId) return;
    const post = posts.find(p => p.id === dragId);
    setDragId(null);
    setHoverDay(null);
    if (!post || post.day === targetDay) return;
    const next = posts.map(p => p.id === dragId ? { ...p, day: targetDay } : p);
    persist(next);
    toast({ title: 'Post movido', description: `${post.titulo} → dia ${targetDay} de maio` });
  };

  const handleResetOriginal = () => {
    if (!confirm('Repor o calendário editorial original de Maio 2026? Todas as alterações locais serão perdidas.')) return;
    persist(ORIGINAL_POSTS);
    toast({ title: 'Calendário reposto', description: 'Voltou ao layout original de Maio 2026.' });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify({
      empresa: empresaNome,
      titulo: 'Calendário Editorial',
      mes: 'Maio 2026',
      canais: ['Facebook', 'Instagram'],
      posts,
    }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calendario-editorial-maio-2026-${empresaNome.toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: 'JSON exportado' });
  };

  return (
    <div className="space-y-4 editorial-calendar">
      {/* Header card */}
      <Card className="p-4 flex items-center justify-between gap-3 flex-wrap print:shadow-none print:border-0">
        <div className="flex items-center gap-3">
          <div
            className="h-11 w-11 rounded-md flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: '#E8561A' }}
          >
            {empresaIniciais}
          </div>
          <div>
            <h2 className="text-lg font-semibold leading-tight">Calendário Editorial — {empresaNome}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Maio 2026 · Facebook & Instagram</p>
          </div>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={handleResetOriginal}>
            <RotateCcw className="h-4 w-4 mr-1" /> Repor original
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" /> Imprimir
          </Button>
          <Button size="sm" onClick={handleExportJson} style={{ backgroundColor: '#E8561A' }}>
            <FileJson className="h-4 w-4 mr-1" /> Exportar JSON
          </Button>
        </div>
      </Card>

      {/* Legenda */}
      <Card className="p-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
        {(Object.keys(CATEGORIA_CONFIG) as EditorialCategoria[]).map(k => (
          <div key={k} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORIA_CONFIG[k].color }} />
            <span className="text-muted-foreground">{CATEGORIA_CONFIG[k].label}</span>
          </div>
        ))}
      </Card>

      <p className="text-xs text-muted-foreground text-right print:hidden">
        💡 Arrasta posts entre dias para trocar datas · Clica "Ver" para briefing completo
      </p>

      {/* Title */}
      <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">Maio 2026</h3>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-2 text-xs font-semibold text-muted-foreground">
        {WEEKDAYS.map(d => <div key={d} className="px-2">{d}</div>)}
      </div>

      {/* Weeks */}
      <div className="space-y-3">
        {weeks.map((w, idx) => (
          <div key={idx} className="space-y-1.5">
            <p className="text-xs text-muted-foreground">
              Semana {idx + 1} <span className="opacity-50">—</span> {w.label}
            </p>
            <div className="grid grid-cols-7 gap-2">
              {w.days.map((day, ci) => {
                if (day === null) return <div key={ci} />;
                const items = byDay[day] || [];
                const isHover = hoverDay === day;
                return (
                  <div
                    key={ci}
                    onDragOver={e => { e.preventDefault(); setHoverDay(day); }}
                    onDragLeave={() => setHoverDay(p => p === day ? null : p)}
                    onDrop={() => handleDrop(day)}
                    className={`rounded-lg border bg-card transition-colors ${isHover ? 'border-primary bg-accent/30' : ''}`}
                    style={{ minHeight: 138 }}
                  >
                    <div className="px-2 pt-1.5 text-[11px] font-semibold text-foreground/70">{day}</div>
                    <div className="px-1.5 pb-1.5 mt-1 space-y-1">
                      {items.length === 0 ? (
                        <button
                          className="w-full h-[100px] rounded border border-dashed text-[11px] text-muted-foreground hover:bg-accent/30 transition-colors flex items-center justify-center gap-1 print:hidden"
                          onClick={() => toast({ title: 'Em breve', description: 'Adição manual de posts disponível em breve.' })}
                        >
                          <Plus className="h-3 w-3" /> Adicionar
                        </button>
                      ) : (
                        items.map(p => {
                          const cfg = CATEGORIA_CONFIG[p.categoria];
                          return (
                            <Card
                              key={p.id}
                              draggable
                              onDragStart={() => setDragId(p.id)}
                              className="p-1.5 text-left cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                            >
                              {p.badge && (
                                <div className={`inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded mb-1 ${cfg.bg} ${cfg.text}`}>
                                  {p.badge}
                                </div>
                              )}
                              <div className={`inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.text}`}>
                                {cfg.label}
                              </div>
                              <p className="text-[11px] font-medium leading-tight mt-1 line-clamp-2">{p.titulo}</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {p.fb && (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] bg-blue-50 text-blue-700 px-1 py-0.5 rounded font-medium">
                                    <span className="font-bold">FB</span> {p.fb}
                                  </span>
                                )}
                                {p.ig && (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] bg-pink-50 text-pink-700 px-1 py-0.5 rounded font-medium">
                                    <span className="font-bold">IG</span> {p.ig}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => setViewPost(p)}
                                className="mt-1 w-full text-[9px] text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-0.5 print:hidden"
                              >
                                <Eye className="h-2.5 w-2.5" /> Ver
                              </button>
                            </Card>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Briefing modal (simples) */}
      {viewPost && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:hidden"
          onClick={() => setViewPost(null)}
        >
          <Card className="max-w-md w-full p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <span
                  className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded ${CATEGORIA_CONFIG[viewPost.categoria].bg} ${CATEGORIA_CONFIG[viewPost.categoria].text}`}
                >
                  {CATEGORIA_CONFIG[viewPost.categoria].label}
                </span>
                <h3 className="text-base font-semibold mt-1">{viewPost.titulo}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Dia {viewPost.day} de maio de 2026</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setViewPost(null)}>✕</Button>
            </div>
            {viewPost.briefing && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Briefing</p>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{viewPost.briefing}</p>
              </div>
            )}
            <div className="flex gap-2 pt-2 border-t">
              {viewPost.fb && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded"><b>FB</b> {viewPost.fb}</span>}
              {viewPost.ig && <span className="text-xs bg-pink-50 text-pink-700 px-2 py-1 rounded"><b>IG</b> {viewPost.ig}</span>}
            </div>
          </Card>
        </div>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body { background: white !important; }
          .editorial-calendar { font-size: 10px; }
          .editorial-calendar .grid { gap: 4px !important; }
        }
      `}</style>
    </div>
  );
}
