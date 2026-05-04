import { useState, useMemo, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Printer, RotateCcw, FileJson, Plus, Eye, Sparkles, Trash2, Save, Upload, CheckCircle2, XCircle, Clock, Paperclip, Download, FileImage, Send, Unlink, ExternalLink, Kanban } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

/**
 * Calendário Editorial — Marketing
 * Implementação fiel à spec: 7 tipos, horários por dia da semana,
 * dados iniciais Maio 2026, drag-and-drop, modal Briefing/Editar,
 * persistência isolada por empresa (localStorage com chave por empresa).
 */

// ───────────────────────────── TIPOS ─────────────────────────────

type PostType = 'carrossel' | 'produto' | 'dica' | 'data' | 'eng' | 'inst' | 'bastidores';

interface EditorialPost {
  type: PostType;
  plat: string;
  title: string;
  copy: string;
  tip: string;
  tags: string;
  holiday?: string;
  hfb?: string;
  hig?: string;
}

type CalendarState = Record<number, EditorialPost>;

const BUCKET = 'marketing-editorial';

export interface Entrega {
  id: string;
  empresa_id: string;
  ano: number;
  mes: number;
  dia: number;
  nome: string;
  storage_path: string;
  mime_type: string | null;
  tamanho_bytes: number | null;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  comentario_aprovacao: string | null;
  uploaded_by: string | null;
  uploaded_by_nome: string | null;
  aprovado_por: string | null;
  aprovado_por_nome: string | null;
  aprovado_em: string | null;
  created_at: string;
}

// ─────────────────────── CONFIG DE CATEGORIAS ─────────────────────

const TYPE_CONFIG: Record<PostType, { label: string; bg: string; text: string }> = {
  carrossel:  { label: 'Carrossel promo', bg: '#EEEDFE', text: '#3C3489' },
  produto:    { label: 'Produto',         bg: '#E1F5EE', text: '#085041' },
  dica:       { label: 'Dica útil',       bg: '#FAEEDA', text: '#633806' },
  data:       { label: 'Data especial',   bg: '#FAECE7', text: '#712B13' },
  eng:        { label: 'Interação',       bg: '#E6F1FB', text: '#0C447C' },
  inst:       { label: 'Institucional',   bg: '#F1EFE8', text: '#444441' },
  bastidores: { label: 'Bastidores',      bg: '#FBEAF0', text: '#72243E' },
};

const PLATFORM_OPTIONS = [
  'FB + IG',
  'Apenas FB',
  'Apenas IG',
  'IG Reels + FB',
  'FB + IG Stories',
];

// ─────────────────── HORÁRIOS POR DIA DA SEMANA ───────────────────
// 0=Seg, 6=Dom. Para Maio 2026, dia 1 é Sexta → weekday(d) = (d + 3) % 7
type WeekdayInfo = { fb: string; ig: string; note: string; name: string };

const WEEKDAY_INFO: Record<number, WeekdayInfo> = {
  0: { name: 'Segunda', fb: '09:00', ig: '18:00', note: 'Segunda-feira: utilizadores voltam ao trabalho. FB tem bom alcance matinal às 9h. IG performa melhor ao fim do dia (18h) quando há mais tempo livre.' },
  1: { name: 'Terça',   fb: '10:00', ig: '18:30', note: 'Terça-feira: um dos melhores dias para alcance orgânico. FB entre 10-11h. IG às 18:30h apanha a saída do trabalho.' },
  2: { name: 'Quarta',  fb: '09:00', ig: '11:00', note: 'Quarta-feira: pico de meio de semana. Ambas as plataformas funcionam bem de manhã. IG às 11h apanha pausa de trabalho remoto.' },
  3: { name: 'Quinta',  fb: '09:00', ig: '19:00', note: 'Quinta-feira: excelente para promoções pois antecipa o fim de semana. FB cedo às 9h; IG às 19h apanha utilizadores em modo lazer.' },
  4: { name: 'Sexta',   fb: '10:00', ig: '12:00', note: 'Sexta-feira: atenção elevada a partir das 10h. IG ao meio-dia apanha quem planeia o fim de semana e pode estar a pensar em casa ou obras.' },
  5: { name: 'Sábado',  fb: '11:00', ig: '10:00', note: 'Sábado: menos tráfego profissional, mais lazer. Publicar mais tarde (10-11h). IG matinal funciona bem pois as pessoas acordam e usam o telemóvel.' },
  6: { name: 'Domingo', fb: '11:00', ig: '20:00', note: 'Domingo: dia de planeamento doméstico com alta intenção de compra. FB ao almoço; IG à noite apanha quem planeia a semana seguinte.' },
};

// Maio 2026: dia 1 = Sexta. weekday(d) = (d + 3) % 7
const weekdayOf = (day: number) => (day + 3) % 7;

// ─────────────────────── DADOS INICIAIS ──────────────────────────

const ORIGINAL_MAIO_2026: CalendarState = {
  1:  { holiday: 'Dia do Trabalhador', type: 'data', plat: 'FB + IG', title: 'Dia do Trabalhador — Às mãos que constroem', copy: 'Primeiro de maio é feriado, mas há quem nunca pare de construir o futuro — tijolo a tijolo, parafuso a parafuso. A equipa da Tudo Casa saúda todos os trabalhadores de Trás-os-Montes e do país inteiro. Bom descanso e bom trabalho!', tip: 'Imagem emocional com ferramentas ou mãos a trabalhar. Tom de proximidade, sem venda. Publicar cedo (9h).', tags: '#DiaDOTrabalhador #TudoCasa #TrásOsMontes #Mirandela #TrabalhoHonesto' },
  2:  { type: 'inst', plat: 'FB + IG', title: 'Institucional — Siga o Instagram', copy: 'Ainda não nos segues no Instagram? É por lá que partilhamos as melhores dicas para a tua casa, promoções em primeira mão e as novidades da loja. Segue-nos em @loja.tudocasa e fica sempre a par!', tip: 'Post estático com identidade visual da marca. Incluir print/mockup do perfil IG.', tags: '#TudoCasa #Instagram #SigaNos #DicasDeCasa #Mirandela' },
  3:  { holiday: 'Dia da Mãe', type: 'data', plat: 'FB + IG', title: 'Dia da Mãe — Para quem faz da casa um lar', copy: 'Há quem diga que a casa é feita de paredes e telhado. Mas quem tem uma mãe sabe que a casa é feita de carinho, de cheiro a cozinha e de braços abertos. Feliz Dia da Mãe! A Tudo Casa abraça todas as mães de Trás-os-Montes e de mais além.', tip: 'Post emocional, sem promoção agressiva. Imagem quente de interior de casa. Publicar de manhã.', tags: '#DiaDaMãe #TudoCasa #ParaAMelhorMãe #TrásOsMontes #Lar' },
  5:  { type: 'produto', plat: 'FB + IG', title: 'Produto — Ar condicionado', copy: 'O calor já se começa a fazer sentir por estas bandas! Não deixes para a última hora — os melhores modelos de ar condicionado saem depressa. Na Tudo Casa tens modelos de 9 a 24 mil BTUs com preços que não vês em mais lado nenhum. Passa pela loja ou encomenda no site!', tip: 'Foto do produto com preço em destaque. CTA para loja online e loja física.', tags: '#ArCondicionado #TudoCasa #Verão2026 #Mirandela #Climatização' },
  6:  { type: 'dica', plat: 'FB + IG', title: 'Dica — Manutenção de primavera', copy: 'A primavera chegou e há trabalho a fazer! Caleiras entupidas, impermeabilizações gastas, jardim a pedir atenção… Por cá em Trás-os-Montes já se sente a diferença. A Tudo Casa tem tudo o que precisas para pôr a tua casa em ordem antes do verão.', tip: 'Carrossel com 4-5 tarefas de manutenção sazonal. Conteúdo que gera guardados.', tags: '#Primavera #ManutençãoCasa #TudoCasa #TrásOsMontes #DicasDeCasa' },
  7:  { type: 'carrossel', plat: 'FB + IG', title: 'CARROSSEL PROMO — Semana 1', copy: '5 produtos para dar uma nova vida à tua casa esta primavera — com preços especiais só esta semana. Desliza e descobre as ofertas da Tudo Casa!', tip: 'Slide 1: capa apelativa. Slides 2-5: produto + preço + CTA. Slide final: link da loja + morada.', tags: '#Promoção #TudoCasa #OfertasDaSemana #Primavera #Mirandela' },
  8:  { type: 'inst', plat: 'FB + IG', title: 'Institucional — Compra online, levanta na loja', copy: 'Sabes que podes comprar no nosso site e levantar na loja em Mirandela sem pagar portes? É simples, rápido e cómodo. Escolhes no sofá, levantas quando te der jeito. Experimenta em lojatudocasa.com!', tip: 'Post estático com os 3 passos: escolhe online → paga → levanta na loja.', tags: '#ClickAndCollect #TudoCasa #Mirandela #CompraOnline #LojaTudoCasa' },
  11: { type: 'bastidores', plat: 'IG Reels + FB', title: 'Bastidores — O nosso showroom', copy: '500 metros quadrados de inspiração no coração de Mirandela. Cozinhas, casas de banho, caixilharia, climatização… tudo em exposição para vires ver ao vivo. A equipa está cá à tua espera — passa por nós!', tip: 'Vídeo/Reels curto do showroom (30-45s). Humaniza a marca. Mostrar equipa se possível.', tags: '#Showroom #TudoCasa #Mirandela #TrásOsMontes #VisitaNos' },
  12: { type: 'produto', plat: 'FB + IG', title: 'Produto — Casa de banho', copy: 'Uma casa de banho nova muda tudo — e não tens de gastar uma fortuna para isso. Na Tudo Casa tens colunas de hidromassagem, banheiras, resguardos de duche e muito mais. Dá uma vista de olhos ao nosso catálogo e sonha à vontade!', tip: 'Fotomontagem de casa de banho completa com produtos disponíveis na loja.', tags: '#CasaDeBanho #Hidromassagem #TudoCasa #Remodelação #Mirandela' },
  13: { type: 'dica', plat: 'FB + IG', title: 'Dica — Jardim para o verão', copy: 'Por estas terras de Trás-os-Montes, maio é altura de arregaçar as mangas e tratar do jardim. Sistemas de rega automática, relva artificial, móveis de exterior e churrasqueiras — a Tudo Casa tem tudo o que precisas para um jardim que dá gosto ver.', tip: 'Reels curto ou carrossel com dicas práticas de jardim. Linguagem descontraída.', tags: '#Jardim #Exterior #TudoCasa #TrásOsMontes #Verão2026' },
  14: { type: 'carrossel', plat: 'FB + IG', title: 'CARROSSEL PROMO — Semana 2', copy: 'Esta semana na Tudo Casa: 5 ofertas para a tua casa de banho e jardim. Preços que não encontras em mais lado nenhum — garante o teu antes que acabe!', tip: 'Slides com produtos de casa de banho e jardim. Urgência de stock.', tags: '#PromoçõesTudoCasa #CasaDeBanho #Jardim #Mirandela #Oferta' },
  15: { type: 'eng', plat: 'FB + IG Stories', title: 'Interação — Mostra a tua casa', copy: 'Já fizeste obras ou decoraste a tua casa com produtos da Tudo Casa? Partilha uma fotinha nos comentários — as melhores ficam em destaque no nosso perfil! Por cá adoramos ver o resultado do vosso trabalho.', tip: 'Post de UGC (conteúdo gerado por utilizadores). Responder a todos os comentários. Alto valor para o algoritmo.', tags: '#MinhasTudoCasa #AnteseDepois #TudoCasa #Remodelação #Mirandela' },
  18: { type: 'inst', plat: 'FB + IG', title: 'Institucional — Atendimento via WhatsApp', copy: 'Preferes tratar de tudo sem sair de casa? Fala connosco diretamente pelo WhatsApp! Tiramos dúvidas, enviamos orçamentos e ajudamos a escolher o produto certo para o teu projeto. É só mandar mensagem — estamos aqui!', tip: 'Post estático com número de WhatsApp em destaque e ícone. Simples e direto.', tags: '#WhatsApp #TudoCasa #AtendimentoPersonalizado #Mirandela #FacilAssim' },
  19: { type: 'produto', plat: 'FB + IG', title: 'Produto — Pavimento Vinil', copy: 'Já pensaste em renovar os teus pavimentos sem obras pesadas? O pavimento vinil da Tudo Casa é a solução perfeita: 100% impermeável, resistente ao desgaste diário, fácil de instalar e com uma aparência que não ficas a saber que não é madeira ou pedra real.', tip: 'Carrossel com 4-5 slides: Antes/depois de um pavimento. Vantagens visuais. Gama de padrões disponíveis. CTA para showroom/site.', tags: '#PavimentoVinil #TudoCasa #Remodelação #PavimentosFáceis #Mirandela #SemObras' },
  21: { type: 'carrossel', plat: 'FB + IG', title: 'CARROSSEL PROMO — Semana 3', copy: 'Quinta-feira de ofertas! Esta semana os materiais de construção e ferramentas estão com preços especiais. Do cimento cola à impermeabilização — se tens obra pela frente, é agora!', tip: 'Foco em construção/bricolage. Público: profissionais e DIY. Linguagem prática e direta.', tags: '#Construção #Bricolage #TudoCasa #Obras #Mirandela' },
  22: { type: 'dica', plat: 'FB + IG', title: 'Dica — Janelas: PVC ou alumínio?', copy: 'É uma dúvida que ouvimos muito aqui na loja: PVC ou alumínio? Cada um tem as suas vantagens — e a escolha certa pode fazer diferença na fatura da luz. Fizemos um guia simples para te ajudar a decidir sem dores de cabeça.', tip: 'Carrossel educativo com comparação clara entre os dois materiais. Alto potencial de guardados e partilhas.', tags: '#Janelas #PVCouAluminio #EficiênciaEnergética #TudoCasa #Caixilharia' },
  25: { type: 'inst', plat: 'FB + IG', title: 'Institucional — Loja online Tudo Casa', copy: 'Sabes que tens toda a nossa gama disponível online? Materiais de construção, casa de banho, climatização e muito mais — entregues em tua casa ou prontos a levantar em Mirandela. Visita lojatudocasa.com e descobre!', tip: 'Post com destaque para o site, com imagem de produto + ecrã da loja online.', tags: '#LojaOnline #TudoCasa #Ecommerce #Mirandela #CompraFacil' },
  26: { type: 'produto', plat: 'FB + IG', title: 'Produto — Iluminação', copy: 'A iluminação certa transforma qualquer divisão — e às vezes é só isso que falta para uma casa parecer completamente diferente. Na Tudo Casa tens luminárias para todos os gostos e todos os orçamentos. Vem ver ao showroom!', tip: 'Montagem fotográfica com diferentes ambientes iluminados. Tom aspiracional.', tags: '#Iluminação #TudoCasa #Decoração #Interior #Mirandela' },
  28: { type: 'carrossel', plat: 'FB + IG', title: 'CARROSSEL PROMO — Semana 4', copy: 'Acabar maio em beleza! As melhores promoções do mês reunidas num só lugar — não percas, só até domingo. Desliza e garante o teu!', tip: 'Urgência de fim de mês. Produtos com maior stock ou margem. CTA claro para a loja online e física.', tags: '#FimDeMaio #PromoçõesTudoCasa #Oferta #Mirandela #NãoPercas' },
  29: { type: 'inst', plat: 'FB + IG', title: 'Institucional — Visita-nos em Mirandela', copy: 'Estamos na Rua Eng. José Machado Vaz, Loja nº 8, em Mirandela — com 500m² de exposição para explorares ao teu ritmo. Se vieres de longe, vale mesmo a pena! Esperamos por ti.', tip: 'Imagem apelativa do exterior ou interior da loja. Incluir mapa/pin de localização.', tags: '#TudoCasa #Mirandela #TrásOsMontes #VemCa #Showroom' },
  30: { type: 'eng', plat: 'FB + IG Stories', title: 'Interação — Qual é o teu próximo projeto?', copy: 'Vai ser a casa de banho nova? O jardim? Ou talvez um ar condicionado que já devia ter posto há mais tempo? Conta-nos nos comentários — e se precisares de ajuda a planear, é só dizer!', tip: 'Pergunta direta que gera comentários e leads qualificados. Responder a cada comentário individualmente.', tags: '#ProjetoCasa #TudoCasa #TrásOsMontes #Obras2026 #Remodelação' },
};

// ─────────────────────── ESTRUTURA DA GRELHA ──────────────────────

const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

// Maio 2026 — 5 semanas conforme spec
const MAIO_2026_WEEKS: { label: string; days: (number | null)[] }[] = [
  { label: 'Semana 1 — 1 a 3 de maio',   days: [null, null, null, null, 1, 2, 3] },
  { label: 'Semana 2 — 4 a 10 de maio',  days: [4, 5, 6, 7, 8, 9, 10] },
  { label: 'Semana 3 — 11 a 17 de maio', days: [11, 12, 13, 14, 15, 16, 17] },
  { label: 'Semana 4 — 18 a 24 de maio', days: [18, 19, 20, 21, 22, 23, 24] },
  { label: 'Semana 5 — 25 a 31 de maio', days: [25, 26, 27, 28, 29, 30, 31] },
];

// ─────────────────────────── HELPERS ──────────────────────────────

const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

const storageKey = (empresaId: string | undefined, year: number, month: number) =>
  `editorial_calendar::${empresaId || 'default'}::${year}-${String(month).padStart(2, '0')}`;

const linkKey = (empresaId: string | undefined, year: number, month: number) =>
  `editorial_calendar_kanban::${empresaId || 'default'}::${year}-${String(month).padStart(2, '0')}`;

type TarefaLink = { id: string; status: string; etapa: string | null };

// Anexo da tarefa Kanban convertido para formato Entrega (para reaproveitar UI)
function tarefaAnexoToEntrega(a: any, dia: number, ano: number, mes: number): Entrega {
  return {
    id: `kanban-${a.id}`,
    empresa_id: a.empresa_id,
    ano, mes, dia,
    nome: a.nome,
    storage_path: a.url, // path no bucket marketing-entregas
    mime_type: a.mime_type,
    tamanho_bytes: a.tamanho_bytes ? Number(a.tamanho_bytes) : null,
    status: 'aprovado', // se a tarefa Kanban foi publicada, considera-se aprovado
    comentario_aprovacao: null,
    uploaded_by: a.uploaded_by,
    uploaded_by_nome: a.uploaded_by_nome,
    aprovado_por: null,
    aprovado_por_nome: null,
    aprovado_em: null,
    created_at: a.created_at,
  };
}

// Mapeia tipo_conteudo + canal de tarefa Kanban para PostType e plat do calendário
function tarefaToPost(t: any): EditorialPost {
  const canalLower = (t.canal || '').toLowerCase();
  const hasIG = canalLower.includes('instagram') || canalLower.includes('ig');
  const hasFB = canalLower.includes('facebook') || canalLower.includes('fb');
  const plat = hasIG && hasFB ? 'FB + IG' : hasIG ? 'Apenas IG' : hasFB ? 'Apenas FB' : 'FB + IG';
  const titulo = String(t.titulo || '').toLowerCase();
  let type: PostType = 'inst';
  if (titulo.includes('carrossel') || titulo.includes('promo')) type = 'carrossel';
  else if (titulo.includes('produto')) type = 'produto';
  else if (titulo.includes('dica')) type = 'dica';
  else if (titulo.includes('bastidor')) type = 'bastidores';
  else if (titulo.includes('interaç') || titulo.includes('engaj')) type = 'eng';
  else if (titulo.includes('dia ') || titulo.includes('feriado') || titulo.includes('data especial')) type = 'data';
  return {
    type,
    plat,
    title: t.titulo || 'Sem título',
    copy: t.copy_legenda || '',
    tip: t.briefing || '',
    tags: t.hashtags || '',
    hfb: t.hora_publicacao || undefined,
    hig: t.hora_publicacao || undefined,
  };
}

// ─────────────────────────── COMPONENTE ───────────────────────────

interface Props {
  empresaIniciais?: string;
  empresaNome?: string;
}

export function MarketingEditorialCalendar({ empresaIniciais = 'TC', empresaNome = 'Loja Tudo Casa' }: Props) {
  const { toast } = useToast();
  const { empresa } = useEmpresa();

  // Mês/Ano selecionado (preparado para outros meses; arranque em Maio 2026)
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(5);

  const isMaio2026 = year === 2026 && month === 5;

  // Estado: { day -> post }
  const [state, setState] = useState<CalendarState>({});

  // Carregar do localStorage por empresa/mês, fallback para original (apenas Maio 2026)
  useEffect(() => {
    const key = storageKey(empresa?.id, year, month);
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        setState(JSON.parse(saved));
        return;
      }
    } catch {}
    setState(isMaio2026 ? { ...ORIGINAL_MAIO_2026 } : {});
  }, [empresa?.id, year, month, isMaio2026]);

  const persist = useCallback((next: CalendarState) => {
    setState(next);
    try {
      localStorage.setItem(storageKey(empresa?.id, year, month), JSON.stringify(next));
    } catch {}
  }, [empresa?.id, year, month]);

  // ───────── Entregas (uploads + aprovação) ─────────
  const [entregas, setEntregas] = useState<Record<number, Entrega[]>>({});

  const fetchEntregas = useCallback(async () => {
    if (!empresa?.id) { setEntregas({}); return; }
    const { data, error } = await supabase
      .from('marketing_editorial_entregas')
      .select('*')
      .eq('empresa_id', empresa.id)
      .eq('ano', year)
      .eq('mes', month)
      .order('created_at', { ascending: false });
    if (error) { console.error('[entregas]', error); return; }
    const grouped: Record<number, Entrega[]> = {};
    (data || []).forEach((r: any) => {
      grouped[r.dia] = grouped[r.dia] || [];
      grouped[r.dia].push(r as Entrega);
    });
    setEntregas(grouped);
  }, [empresa?.id, year, month]);

  useEffect(() => { fetchEntregas(); }, [fetchEntregas]);

  const uploadEntrega = async (dia: number, file: File): Promise<boolean> => {
    if (!empresa?.id) return false;
    const ext = file.name.split('.').pop() || 'bin';
    const path = `${empresa.id}/${year}-${String(month).padStart(2, '0')}/dia-${dia}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) { console.error(upErr); toast({ title: 'Erro no upload', description: upErr.message, variant: 'destructive' }); return false; }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from('marketing_editorial_entregas').insert({
      empresa_id: empresa.id, ano: year, mes: month, dia,
      nome: file.name, storage_path: path,
      mime_type: file.type || null, tamanho_bytes: file.size,
      status: 'pendente',
      uploaded_by: u?.user?.id || null,
      uploaded_by_nome: u?.user?.email || null,
    });
    if (error) { console.error(error); toast({ title: 'Erro a registar entrega', variant: 'destructive' }); return false; }
    await fetchEntregas();
    toast({ title: 'Entrega enviada', description: 'Aguarda aprovação.' });
    return true;
  };

  const decidirEntrega = async (e: Entrega, status: 'aprovado' | 'rejeitado', comentario?: string): Promise<boolean> => {
    const { data: u } = await supabase.auth.getUser();
    if (u?.user?.id && u.user.id === e.uploaded_by) {
      toast({ title: 'Não permitido', description: 'A aprovação deve ser feita por outro membro da equipa.', variant: 'destructive' });
      return false;
    }
    const { error } = await supabase.from('marketing_editorial_entregas').update({
      status,
      comentario_aprovacao: comentario || null,
      aprovado_por: u?.user?.id || null,
      aprovado_por_nome: u?.user?.email || null,
      aprovado_em: new Date().toISOString(),
    }).eq('id', e.id);
    if (error) { toast({ title: 'Erro', variant: 'destructive' }); return false; }
    await fetchEntregas();
    toast({ title: status === 'aprovado' ? 'Entrega aprovada' : 'Entrega rejeitada' });
    return true;
  };

  const removerEntrega = async (e: Entrega): Promise<boolean> => {
    if (!confirm(`Remover ficheiro "${e.nome}"?`)) return false;
    await supabase.storage.from(BUCKET).remove([e.storage_path]);
    const { error } = await supabase.from('marketing_editorial_entregas').delete().eq('id', e.id);
    if (error) { toast({ title: 'Erro', variant: 'destructive' }); return false; }
    await fetchEntregas();
    return true;
  };

  const downloadEntrega = async (e: Entrega) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(e.storage_path, 3600);
    if (error || !data) { toast({ title: 'Erro', variant: 'destructive' }); return; }
    window.open(data.signedUrl, '_blank');
  };

  // ───────── Ligação ao Kanban (Tarefas Marketing) ─────────
  const [linkedTarefas, setLinkedTarefas] = useState<Record<number, TarefaLink>>({});

  const fetchLinked = useCallback(async () => {
    if (!empresa?.id) { setLinkedTarefas({}); return; }
    let map: Record<string, string> = {};
    try {
      const raw = localStorage.getItem(linkKey(empresa.id, year, month));
      if (raw) map = JSON.parse(raw);
    } catch {}
    const ids = Object.values(map).filter(Boolean);
    if (ids.length === 0) { setLinkedTarefas({}); return; }
    const { data, error } = await supabase
      .from('marketing_tarefas')
      .select('id, status, etapa_atual')
      .in('id', ids);
    if (error) { console.error('[linked tarefas]', error); return; }
    const byId = new Map<string, any>((data || []).map((r: any) => [r.id, r]));
    const cleaned: Record<string, string> = {};
    const out: Record<number, TarefaLink> = {};
    Object.entries(map).forEach(([dia, id]) => {
      const r = byId.get(id);
      if (r) {
        cleaned[dia] = id;
        out[Number(dia)] = { id, status: r.status, etapa: r.etapa_atual };
      }
    });
    if (Object.keys(cleaned).length !== Object.keys(map).length) {
      localStorage.setItem(linkKey(empresa.id, year, month), JSON.stringify(cleaned));
    }
    setLinkedTarefas(out);
  }, [empresa?.id, year, month]);

  useEffect(() => { fetchLinked(); }, [fetchLinked]);

  // ───────── Sincronização automática Kanban → Calendário ─────────
  // Carrega TODAS as tarefas Kanban com data_publicacao no mês visível
  // e os respetivos anexos. Garante que tarefas publicadas aparecem
  // no calendário com toda a info + ficheiro carregado.
  const [kanbanPosts, setKanbanPosts] = useState<Record<number, EditorialPost>>({});
  const [kanbanEntregas, setKanbanEntregas] = useState<Record<number, Entrega[]>>({});
  const [kanbanLinks, setKanbanLinks] = useState<Record<number, TarefaLink>>({});

  const fetchKanbanSync = useCallback(async () => {
    if (!empresa?.id) {
      setKanbanPosts({}); setKanbanEntregas({}); setKanbanLinks({});
      return;
    }
    const monthStr = String(month).padStart(2, '0');
    const startDate = `${year}-${monthStr}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

    const { data: tarefas, error } = await supabase
      .from('marketing_tarefas')
      .select('id, titulo, descricao, tipo_conteudo, canal, status, etapa_atual, data_publicacao, hora_publicacao, hashtags, copy_legenda, briefing')
      .eq('empresa_id', empresa.id)
      .not('data_publicacao', 'is', null)
      .gte('data_publicacao', startDate)
      .lte('data_publicacao', endDate);
    if (error) { console.error('[kanban-sync]', error); return; }

    const postsByDay: Record<number, EditorialPost> = {};
    const linksByDay: Record<number, TarefaLink> = {};
    const tarefasIds: string[] = [];
    const tarefaDayMap = new Map<string, number>();

    (tarefas || []).forEach((t: any) => {
      const d = new Date(t.data_publicacao);
      const dia = d.getUTCDate();
      tarefaDayMap.set(t.id, dia);
      tarefasIds.push(t.id);
      // overlay apenas para tarefas publicadas
      if (t.status === 'publicado' || t.etapa_atual === 'publicado') {
        postsByDay[dia] = tarefaToPost(t);
      }
      linksByDay[dia] = { id: t.id, status: t.status, etapa: t.etapa_atual };
    });

    setKanbanPosts(postsByDay);
    setKanbanLinks(linksByDay);

    // Carregar anexos das tarefas
    if (tarefasIds.length === 0) { setKanbanEntregas({}); return; }
    const { data: anexos } = await supabase
      .from('marketing_anexos')
      .select('*')
      .in('tarefa_id', tarefasIds)
      .eq('tipo', 'upload');

    const entregasByDay: Record<number, Entrega[]> = {};
    (anexos || []).forEach((a: any) => {
      const dia = tarefaDayMap.get(a.tarefa_id);
      if (!dia) return;
      entregasByDay[dia] = entregasByDay[dia] || [];
      entregasByDay[dia].push(tarefaAnexoToEntrega(a, dia, year, month));
    });
    setKanbanEntregas(entregasByDay);
  }, [empresa?.id, year, month]);

  useEffect(() => { fetchKanbanSync(); }, [fetchKanbanSync]);

  // Realtime: re-sincronizar sempre que tarefas/anexos mudam
  useEffect(() => {
    if (!empresa?.id) return;
    const channel = supabase
      .channel(`marketing-sync-${empresa.id}-${year}-${month}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marketing_tarefas', filter: `empresa_id=eq.${empresa.id}` }, () => fetchKanbanSync())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marketing_anexos', filter: `empresa_id=eq.${empresa.id}` }, () => fetchKanbanSync())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [empresa?.id, year, month, fetchKanbanSync]);


  const persistLink = useCallback((day: number, tarefaId: string | null) => {
    if (!empresa?.id) return;
    let map: Record<string, string> = {};
    try {
      const raw = localStorage.getItem(linkKey(empresa.id, year, month));
      if (raw) map = JSON.parse(raw);
    } catch {}
    if (tarefaId) map[String(day)] = tarefaId;
    else delete map[String(day)];
    localStorage.setItem(linkKey(empresa.id, year, month), JSON.stringify(map));
  }, [empresa?.id, year, month]);

  const promoverParaKanban = async (day: number): Promise<boolean> => {
    if (!empresa?.id) return false;
    const post = state[day];
    if (!post) {
      toast({ title: 'Sem publicação para promover', variant: 'destructive' });
      return false;
    }
    if (linkedTarefas[day]) {
      toast({ title: 'Já existe uma tarefa Kanban associada' });
      return false;
    }
    const dataPub = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const wkInfo = WEEKDAY_INFO[weekdayOf(day)];
    const horaPub = post.hfb || wkInfo.fb;
    const tipoConteudo =
      post.type === 'carrossel' ? 'post' :
      post.type === 'bastidores' ? 'reels' :
      post.type === 'eng' ? 'story' : 'post';
    const canal =
      post.plat.includes('IG') && !post.plat.includes('FB') ? 'instagram' :
      post.plat.includes('FB') && !post.plat.includes('IG') ? 'facebook' : 'instagram';
    const { data: userResp } = await supabase.auth.getUser();
    const briefingTxt = [
      `Publicação editorial — Dia ${day} (${wkInfo.name})`,
      `Tipo: ${TYPE_CONFIG[post.type].label}`,
      `Plataformas: ${post.plat}`,
      post.holiday ? `Data especial: ${post.holiday}` : '',
      '',
      'Nota criativa:',
      post.tip || '—',
    ].filter(Boolean).join('\n');
    const { data: row, error } = await supabase.from('marketing_tarefas').insert({
      empresa_id: empresa.id,
      titulo: post.title,
      descricao: `Promovido do Calendário Editorial — Dia ${day}/${month}/${year}`,
      tipo_conteudo: tipoConteudo,
      canal,
      status: 'em_producao',
      prioridade: 'media',
      data_publicacao: dataPub,
      hora_publicacao: horaPub,
      hashtags: post.tags || null,
      copy_legenda: post.copy || null,
      briefing: briefingTxt,
      etapa_atual: 'criacao',
      solicitante_nome: userResp?.user?.email || null,
      solicitante_id: userResp?.user?.id || null,
      created_by: userResp?.user?.id || null,
    }).select('id, status, etapa_atual').single();
    if (error || !row) {
      console.error('[promover]', error);
      toast({ title: 'Erro a promover', description: error?.message, variant: 'destructive' });
      return false;
    }
    persistLink(day, row.id);
    setLinkedTarefas(prev => ({ ...prev, [day]: { id: row.id, status: row.status, etapa: row.etapa_atual } }));
    toast({ title: 'Promovido ao Kanban', description: 'Tarefa criada em "Em Produção".' });
    return true;
  };

  const desligarDoKanban = async (day: number) => {
    if (!confirm('Desligar este post da tarefa Kanban? A tarefa permanece no Kanban; só o vínculo é removido.')) return;
    persistLink(day, null);
    setLinkedTarefas(prev => {
      const next = { ...prev };
      delete next[day];
      return next;
    });
    toast({ title: 'Vínculo removido' });
  };


  // ───────── Drag & Drop ─────────
  const [dragDay, setDragDay] = useState<number | null>(null);
  const [hoverDay, setHoverDay] = useState<number | null>(null);

  const handleDrop = (targetDay: number) => {
    if (dragDay === null || dragDay === targetDay) {
      setDragDay(null);
      setHoverDay(null);
      return;
    }
    const next = { ...state };
    const a = next[dragDay];
    const b = next[targetDay];
    if (b) next[dragDay] = b; else delete next[dragDay];
    if (a) next[targetDay] = a; else delete next[targetDay];
    persist(next);
    setDragDay(null);
    setHoverDay(null);
    toast({ title: 'Publicações trocadas', description: `Dia ${dragDay} ↔ Dia ${targetDay}` });
  };

  // ───────── Modal ─────────
  const [modalDay, setModalDay] = useState<number | null>(null);
  const [modalTab, setModalTab] = useState<'briefing' | 'editar' | 'entregas'>('briefing');

  // ───────── Vistas combinadas (Calendário ⊕ Kanban) ─────────
  // Tarefas Kanban publicadas têm prioridade sobre o estado local
  // para garantir reflexo imediato e completo no calendário.
  const mergedState = useMemo<CalendarState>(() => {
    const out: CalendarState = { ...state };
    Object.entries(kanbanPosts).forEach(([dia, post]) => {
      out[Number(dia)] = post;
    });
    return out;
  }, [state, kanbanPosts]);

  const mergedEntregas = useMemo<Record<number, Entrega[]>>(() => {
    const out: Record<number, Entrega[]> = {};
    const days = new Set<number>([
      ...Object.keys(entregas).map(Number),
      ...Object.keys(kanbanEntregas).map(Number),
    ]);
    days.forEach(d => {
      out[d] = [...(entregas[d] || []), ...(kanbanEntregas[d] || [])];
    });
    return out;
  }, [entregas, kanbanEntregas]);

  const mergedLinks = useMemo<Record<number, TarefaLink>>(() => {
    return { ...kanbanLinks, ...linkedTarefas };
  }, [linkedTarefas, kanbanLinks]);


  const openView = (day: number) => {
    setModalDay(day);
    setModalTab(mergedState[day] ? 'briefing' : 'editar');
  };
  const openAdd = (day: number) => {
    setModalDay(day);
    setModalTab('editar');
  };

  // ───────── Acções topo ─────────
  const handleResetOriginal = () => {
    if (!isMaio2026) {
      toast({ title: 'Sem dados originais', description: 'Os dados originais só existem para Maio 2026.', variant: 'destructive' });
      return;
    }
    if (!confirm('Repor o calendário editorial original de Maio 2026? Todas as alterações serão perdidas.')) return;
    persist({ ...ORIGINAL_MAIO_2026 });
    toast({ title: 'Calendário reposto' });
  };

  const handlePrint = () => window.print();

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify({
      empresa: empresaNome,
      empresa_id: empresa?.id,
      ano: year,
      mes: month,
      posts: state,
    }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calendario-editorial-${year}-${String(month).padStart(2, '0')}-${(empresaNome || 'empresa').toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: 'JSON exportado' });
  };

  const handleAI = () => {
    toast({ title: 'Em breve', description: 'Geração com IA será disponibilizada em breve.' });
  };

  // ───────── Render helpers ─────────

  const weeks = useMemo(() => {
    if (isMaio2026) return MAIO_2026_WEEKS;
    // genérico: gera Mon-first weeks para qualquer mês/ano
    const first = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstColumn = (first.getDay() + 6) % 7; // Mon=0..Sun=6
    const out: { label: string; days: (number | null)[] }[] = [];
    let row: (number | null)[] = Array(7).fill(null);
    let col = firstColumn;
    let weekStart: number | null = null;
    let weekEnd: number | null = null;
    let weekIdx = 1;
    const monthName = first.toLocaleDateString('pt-PT', { month: 'long' });
    for (let d = 1; d <= daysInMonth; d++) {
      if (weekStart === null) weekStart = d;
      row[col] = d;
      weekEnd = d;
      if (col === 6) {
        out.push({ label: `Semana ${weekIdx} — ${weekStart} a ${weekEnd} de ${monthName}`, days: row });
        row = Array(7).fill(null);
        col = 0;
        weekStart = null;
        weekIdx++;
      } else {
        col++;
      }
    }
    if (weekStart !== null) out.push({ label: `Semana ${weekIdx} — ${weekStart} a ${weekEnd} de ${monthName}`, days: row });
    return out;
  }, [year, month, isMaio2026]);

  return (
    <div className="space-y-4 editorial-calendar">
      {/* Header */}
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
            <p className="text-xs text-muted-foreground mt-0.5">Facebook & Instagram</p>
          </div>
        </div>

        <div className="flex items-center gap-2 print:hidden flex-wrap">
          {/* Selector mês/ano */}
          <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m, i) => (
                <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-[100px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2025, 2026, 2027, 2028].map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={handleResetOriginal}>
            <RotateCcw className="h-4 w-4 mr-1" /> Repor original
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" /> Imprimir
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportJson}>
            <FileJson className="h-4 w-4 mr-1" /> Exportar JSON
          </Button>
          <Button size="sm" onClick={handleAI} style={{ backgroundColor: '#E8561A' }}>
            <Sparkles className="h-4 w-4 mr-1" /> Gerar com IA
          </Button>
        </div>
      </Card>

      {/* Legenda */}
      <Card className="p-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
        {(Object.keys(TYPE_CONFIG) as PostType[]).map(k => (
          <div key={k} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TYPE_CONFIG[k].text }} />
            <span className="text-muted-foreground">{TYPE_CONFIG[k].label}</span>
          </div>
        ))}
      </Card>

      <p className="text-xs text-muted-foreground text-right print:hidden">
        💡 Arrasta cards entre dias para trocar publicações · Clica "Ver" para abrir briefing/editar
      </p>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-2 text-xs font-semibold text-muted-foreground">
        {WEEKDAY_LABELS.map(d => <div key={d} className="px-2">{d}</div>)}
      </div>

      {/* Weeks */}
      <div className="space-y-3">
        {weeks.map((w, wi) => (
          <div key={wi} className="space-y-1.5">
            <p className="text-xs text-muted-foreground">{w.label}</p>
            <div className="grid grid-cols-7 gap-2">
              {w.days.map((day, ci) => {
                if (day === null) return <div key={ci} />;
                const post = mergedState[day];
                const isHover = hoverDay === day;
                const wkInfo = WEEKDAY_INFO[weekdayOf(day)];
                return (
                  <div
                    key={ci}
                    onDragOver={e => { e.preventDefault(); setHoverDay(day); }}
                    onDragLeave={() => setHoverDay(p => p === day ? null : p)}
                    onDrop={() => handleDrop(day)}
                    className={`group relative rounded-[10px] border bg-card transition-colors ${isHover ? 'border-primary bg-accent/30' : ''}`}
                    style={{ minHeight: 110 }}
                  >
                    <div className="px-2 pt-1.5 text-[11px] font-semibold text-foreground/70 flex items-center justify-between">
                      <span>{day}</span>
                      {post && (
                        <button
                          onClick={() => openView(day)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 print:hidden"
                        >
                          <Eye className="h-3 w-3" /> Ver
                        </button>
                      )}
                    </div>
                    <div className="px-1.5 pb-1.5 mt-1">
                      {!post ? (
                        <button
                          className="w-full h-[80px] rounded border border-dashed text-[11px] text-muted-foreground hover:bg-accent/30 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 print:hidden"
                          onClick={() => openAdd(day)}
                        >
                          <Plus className="h-3 w-3" /> Adicionar
                        </button>
                      ) : (
                        <div
                          draggable
                          onDragStart={() => setDragDay(day)}
                          onClick={() => openView(day)}
                          className="cursor-grab active:cursor-grabbing rounded p-1 hover:bg-accent/20 transition-colors"
                        >
                          {post.holiday && (
                            <div
                              className="inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded mb-1"
                              style={{ backgroundColor: '#FFE8D9', color: '#9A3D0A' }}
                            >
                              {post.holiday}
                            </div>
                          )}
                          <div
                            className="inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: TYPE_CONFIG[post.type].bg, color: TYPE_CONFIG[post.type].text }}
                          >
                            {TYPE_CONFIG[post.type].label}
                          </div>
                          <p className="font-medium leading-tight mt-1" style={{ fontSize: '9.5px' }}>
                            {truncate(post.title, 36)}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {post.plat.includes('FB') && (
                              <span
                                className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded font-semibold"
                                style={{ fontSize: '8px', backgroundColor: '#E6F1FB', color: '#0C447C' }}
                              >
                                FB {post.hfb || wkInfo.fb}
                              </span>
                            )}
                            {post.plat.includes('IG') && (
                              <span
                                className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded font-semibold"
                                style={{ fontSize: '8px', backgroundColor: '#FBEAF0', color: '#72243E' }}
                              >
                                IG {post.hig || wkInfo.ig}
                              </span>
                            )}
                          </div>
                          {(mergedEntregas[day]?.length || 0) > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              {(() => {
                                const list = mergedEntregas[day] || [];
                                const aprov = list.filter(x => x.status === 'aprovado').length;
                                const pend = list.filter(x => x.status === 'pendente').length;
                                const rej = list.filter(x => x.status === 'rejeitado').length;
                                return (
                                  <>
                                    <Paperclip className="h-2.5 w-2.5 text-muted-foreground" />
                                    <span className="text-[8px] text-muted-foreground">{list.length}</span>
                                    {aprov > 0 && <CheckCircle2 className="h-2.5 w-2.5" style={{ color: '#16a34a' }} />}
                                    {pend > 0 && <Clock className="h-2.5 w-2.5" style={{ color: '#d97706' }} />}
                                    {rej > 0 && <XCircle className="h-2.5 w-2.5" style={{ color: '#dc2626' }} />}
                                  </>
                                );
                              })()}
                            </div>
                          )}
                          {mergedLinks[day] && (() => {
                            const lk = mergedLinks[day];
                            const isPub = lk.status === 'publicado' || lk.etapa === 'publicado';
                            const isAprov = lk.etapa === 'aprovacao';
                            const bg = isPub ? '#DCFCE7' : isAprov ? '#F3E8FF' : '#E0F2FE';
                            const fg = isPub ? '#166534' : isAprov ? '#6B21A8' : '#075985';
                            const label = isPub ? '✅ Publicado' : isAprov ? '✋ Aprovação' : '📋 No Kanban';
                            return (
                              <div
                                className="inline-flex items-center mt-1 px-1 py-0.5 rounded font-semibold"
                                style={{ fontSize: '8px', backgroundColor: bg, color: fg }}
                                title={`Tarefa Kanban — etapa: ${lk.etapa || lk.status}`}
                              >
                                {label}
                              </div>
                            );
                          })()}

                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      <PostDialog
        day={modalDay}
        post={modalDay !== null ? mergedState[modalDay] : undefined}
        tab={modalTab}
        onTabChange={setModalTab}
        entregas={modalDay !== null ? (mergedEntregas[modalDay] || []) : []}
        linkedTarefa={modalDay !== null ? mergedLinks[modalDay] : undefined}
        onPromover={() => modalDay !== null && promoverParaKanban(modalDay)}
        onDesligar={() => modalDay !== null && desligarDoKanban(modalDay)}
        onRefreshLinked={fetchLinked}
        onUpload={(file) => modalDay !== null && uploadEntrega(modalDay, file)}
        onDecidir={decidirEntrega}
        onRemoverEntrega={removerEntrega}
        onDownloadEntrega={downloadEntrega}
        onClose={() => setModalDay(null)}
        onSave={(p) => {
          if (modalDay === null) return;
          const next = { ...state, [modalDay]: p };
          persist(next);
          setModalDay(null);
          toast({ title: 'Publicação guardada' });
        }}
        onDelete={() => {
          if (modalDay === null) return;
          const next = { ...state };
          delete next[modalDay];
          persist(next);
          setModalDay(null);
          toast({ title: 'Publicação eliminada' });
        }}
      />

      {/* Print */}
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

// ─────────────────────────── DIALOG ───────────────────────────────

interface PostDialogProps {
  day: number | null;
  post?: EditorialPost;
  tab: 'briefing' | 'editar' | 'entregas';
  onTabChange: (t: 'briefing' | 'editar' | 'entregas') => void;
  entregas: Entrega[];
  linkedTarefa?: TarefaLink;
  onPromover: () => Promise<boolean> | void;
  onDesligar: () => void;
  onRefreshLinked: () => void;
  onUpload: (file: File) => Promise<boolean> | void;
  onDecidir: (e: Entrega, status: 'aprovado' | 'rejeitado', comentario?: string) => Promise<boolean>;
  onRemoverEntrega: (e: Entrega) => Promise<boolean>;
  onDownloadEntrega: (e: Entrega) => void;
  onClose: () => void;
  onSave: (p: EditorialPost) => void;
  onDelete: () => void;
}

function PostDialog({ day, post, tab, onTabChange, entregas, linkedTarefa, onPromover, onDesligar, onRefreshLinked, onUpload, onDecidir, onRemoverEntrega, onDownloadEntrega, onClose, onSave, onDelete }: PostDialogProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data?.user?.id || null));
  }, []);
  // Refresh do estado da tarefa Kanban sempre que o modal abre
  useEffect(() => { if (day !== null) onRefreshLinked(); }, [day, onRefreshLinked]);
  const open = day !== null;
  const wkInfo = day !== null ? WEEKDAY_INFO[weekdayOf(day)] : null;

  const [form, setForm] = useState<EditorialPost>({
    type: 'inst',
    plat: 'FB + IG',
    title: '',
    copy: '',
    tip: '',
    tags: '',
    holiday: '',
    hfb: '',
    hig: '',
  });

  useEffect(() => {
    if (!open || !wkInfo) return;
    setForm(post
      ? { ...post, holiday: post.holiday || '', hfb: post.hfb || '', hig: post.hig || '' }
      : { type: 'inst', plat: 'FB + IG', title: '', copy: '', tip: '', tags: '', holiday: '', hfb: wkInfo.fb, hig: wkInfo.ig });
  }, [open, post, wkInfo]);

  if (!open || !wkInfo || day === null) return null;

  const fbTime = (post?.hfb) || wkInfo.fb;
  const igTime = (post?.hig) || wkInfo.ig;

  const handleSave = () => {
    if (!form.title.trim()) return;
    const cleaned: EditorialPost = {
      type: form.type,
      plat: form.plat,
      title: form.title.trim(),
      copy: form.copy,
      tip: form.tip,
      tags: form.tags,
    };
    if (form.holiday?.trim()) cleaned.holiday = form.holiday.trim();
    if (form.hfb && form.hfb !== wkInfo.fb) cleaned.hfb = form.hfb;
    if (form.hig && form.hig !== wkInfo.ig) cleaned.hig = form.hig;
    onSave(cleaned);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Dia {day}</span>
            <span className="text-xs font-normal text-muted-foreground">· {wkInfo.name}</span>
            {post?.holiday && (
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded"
                style={{ backgroundColor: '#FFE8D9', color: '#9A3D0A' }}
              >
                {post.holiday}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => onTabChange(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="briefing" disabled={!post}>Briefing</TabsTrigger>
            <TabsTrigger value="editar">Editar</TabsTrigger>
            <TabsTrigger value="entregas">
              Entregas {entregas.length > 0 && <span className="ml-1 text-[10px] opacity-70">({entregas.length})</span>}
            </TabsTrigger>
          </TabsList>

          {/* BRIEFING */}
          <TabsContent value="briefing" className="space-y-4 mt-4">
            {post ? (
              <>
                <div className="rounded-lg p-3 space-y-2" style={{ backgroundColor: '#FFF4EC', border: '1px solid #F4C9A5' }}>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold"
                      style={{ backgroundColor: '#E6F1FB', color: '#0C447C' }}
                    >
                      FB {fbTime}
                    </span>
                    <span
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold"
                      style={{ backgroundColor: '#FBEAF0', color: '#72243E' }}
                    >
                      IG {igTime}
                    </span>
                    <span className="text-xs text-muted-foreground">· {post.plat}</span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: '#7A3811' }}>{wkInfo.note}</p>
                </div>

                {/* Bloco Workflow Kanban */}
                <div className="rounded-lg p-3 border bg-muted/30 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Kanban className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold">Workflow no Kanban</span>
                    {linkedTarefa ? (() => {
                      const isPub = linkedTarefa.status === 'publicado' || linkedTarefa.etapa === 'publicado';
                      const isAprov = linkedTarefa.etapa === 'aprovacao';
                      const variant = isPub ? 'default' : 'secondary';
                      const label = isPub
                        ? '✅ Aprovado / Publicado'
                        : isAprov
                          ? '✋ Em Aprovação'
                          : `📋 ${linkedTarefa.etapa || linkedTarefa.status}`;
                      return <Badge variant={variant as any} className="text-[10px]">{label}</Badge>;
                    })() : (
                      <span className="text-[11px] text-muted-foreground">Ainda não está no Kanban</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {linkedTarefa ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            window.open(`/marketing?vista=kanban&tarefa=${linkedTarefa.id}`, '_blank');
                          }}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" /> Abrir no Kanban
                        </Button>
                        <Button size="sm" variant="ghost" onClick={onDesligar} title="Desligar vínculo (mantém a tarefa no Kanban)">
                          <Unlink className="h-3 w-3 mr-1" /> Desligar
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        style={{ backgroundColor: '#E8561A' }}
                        onClick={async () => { await onPromover(); onRefreshLinked(); }}
                      >
                        <Send className="h-3 w-3 mr-1" /> Promover ao Kanban
                      </Button>
                    )}
                  </div>
                </div>


                <div>
                  <span
                    className="inline-block text-xs font-semibold px-2 py-1 rounded"
                    style={{ backgroundColor: TYPE_CONFIG[post.type].bg, color: TYPE_CONFIG[post.type].text }}
                  >
                    {TYPE_CONFIG[post.type].label}
                  </span>
                  <h3 className="text-base font-semibold mt-2">{post.title}</h3>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Copy sugerida</p>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{post.copy}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Nota criativa</p>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/80">{post.tip}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Hashtags</p>
                  <p className="text-sm font-mono text-primary">{post.tags}</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Sem publicação para este dia.</p>
            )}
          </TabsContent>

          {/* EDITAR */}
          <TabsContent value="editar" className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tipo de conteúdo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as PostType })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TYPE_CONFIG) as PostType[]).map(k => (
                      <SelectItem key={k} value={k}>{TYPE_CONFIG[k].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Plataforma(s)</Label>
                <Select value={form.plat} onValueChange={(v) => setForm({ ...form, plat: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORM_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs">Título da publicação</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="h-9" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Hora FB</Label>
                <Input
                  value={form.hfb || ''}
                  placeholder={wkInfo.fb}
                  onChange={e => setForm({ ...form, hfb: e.target.value })}
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Hora IG</Label>
                <Input
                  value={form.hig || ''}
                  placeholder={wkInfo.ig}
                  onChange={e => setForm({ ...form, hig: e.target.value })}
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Data especial / feriado</Label>
                <Input
                  value={form.holiday || ''}
                  placeholder="(opcional)"
                  onChange={e => setForm({ ...form, holiday: e.target.value })}
                  className="h-9"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Copy / legenda</Label>
              <Textarea value={form.copy} onChange={e => setForm({ ...form, copy: e.target.value })} rows={4} />
            </div>
            <div>
              <Label className="text-xs">Nota criativa</Label>
              <Textarea value={form.tip} onChange={e => setForm({ ...form, tip: e.target.value })} rows={2} />
            </div>
            <div>
              <Label className="text-xs">Hashtags</Label>
              <Textarea value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} rows={2} />
            </div>

            <div className="flex justify-between pt-2 border-t">
              {post ? (
                <Button variant="destructive" size="sm" onClick={onDelete}>
                  <Trash2 className="h-4 w-4 mr-1" /> Eliminar publicação
                </Button>
              ) : <span />}
              <Button size="sm" onClick={handleSave} style={{ backgroundColor: '#E8561A' }} disabled={!form.title.trim()}>
                <Save className="h-4 w-4 mr-1" /> Guardar alterações
              </Button>
            </div>
          </TabsContent>

          {/* ENTREGAS */}
          <TabsContent value="entregas" className="space-y-3 mt-4">
            <EntregasPanel
              entregas={entregas}
              currentUserId={currentUserId}
              onUpload={onUpload}
              onDecidir={onDecidir}
              onRemoverEntrega={onRemoverEntrega}
              onDownloadEntrega={onDownloadEntrega}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────── PAINEL ENTREGAS ──────────────────────────

interface EntregasPanelProps {
  entregas: Entrega[];
  currentUserId: string | null;
  onUpload: (file: File) => Promise<boolean> | void;
  onDecidir: (e: Entrega, status: 'aprovado' | 'rejeitado', comentario?: string) => Promise<boolean>;
  onRemoverEntrega: (e: Entrega) => Promise<boolean>;
  onDownloadEntrega: (e: Entrega) => void;
}

function EntregasPanel({ entregas, currentUserId, onUpload, onDecidir, onRemoverEntrega, onDownloadEntrega }: EntregasPanelProps) {
  const [uploading, setUploading] = useState(false);
  const [comentarios, setComentarios] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<{ url: string; nome: string; mime: string | null } | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (let i = 0; i < files.length; i++) {
      await onUpload(files[i]);
    }
    setUploading(false);
  };

  const fmtSize = (b: number | null) => {
    if (!b) return '';
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Carregar ficheiro (PNG, JPG, carrossel — múltiplos ficheiros aceites)</Label>
        <div className="mt-2 border-2 border-dashed rounded-lg p-4 text-center hover:bg-accent/20 transition-colors">
          <input
            id="entrega-upload"
            type="file"
            multiple
            accept="image/*,application/pdf,video/*"
            className="hidden"
            onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
            disabled={uploading}
          />
          <label htmlFor="entrega-upload" className="cursor-pointer flex flex-col items-center gap-1.5">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm font-medium">{uploading ? 'A enviar…' : 'Clica para escolher ou arrasta ficheiros'}</span>
            <span className="text-xs text-muted-foreground">As entregas ficam pendentes até serem aprovadas por outro membro.</span>
          </label>
        </div>
      </div>

      {entregas.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Sem entregas para este dia.</p>
      ) : (
        <div className="space-y-2">
          {entregas.map(e => {
            const isOwner = currentUserId && currentUserId === e.uploaded_by;
            const statusCfg =
              e.status === 'aprovado' ? { label: 'Aprovado', icon: CheckCircle2, color: '#16a34a', bg: '#DCFCE7' } :
              e.status === 'rejeitado' ? { label: 'Rejeitado', icon: XCircle, color: '#dc2626', bg: '#FEE2E2' } :
              { label: 'Pendente', icon: Clock, color: '#d97706', bg: '#FEF3C7' };
            const StatusIcon = statusCfg.icon;
            const isImg = (e.mime_type || '').startsWith('image/');
            return (
              <div key={e.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <EntregaThumb entrega={e} onPreview={setPreview} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium break-words">{e.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmtSize(e.tamanho_bytes)} · {e.uploaded_by_nome || 'Anónimo'} · {new Date(e.created_at).toLocaleString('pt-PT')}
                      </p>
                    </div>
                  </div>
                  <span
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold shrink-0"
                    style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}
                  >
                    <StatusIcon className="h-3 w-3" /> {statusCfg.label}
                  </span>
                </div>

                {e.status !== 'pendente' && (e.aprovado_por_nome || e.comentario_aprovacao) && (
                  <div className="text-xs text-muted-foreground border-l-2 pl-2" style={{ borderColor: statusCfg.color }}>
                    {e.aprovado_por_nome && <p><b>{e.status === 'aprovado' ? 'Aprovado por' : 'Rejeitado por'}:</b> {e.aprovado_por_nome}{e.aprovado_em ? ` · ${new Date(e.aprovado_em).toLocaleString('pt-PT')}` : ''}</p>}
                    {e.comentario_aprovacao && <p className="mt-0.5">"{e.comentario_aprovacao}"</p>}
                  </div>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => onDownloadEntrega(e)}>
                    <Download className="h-3.5 w-3.5 mr-1" /> Abrir / Download
                  </Button>

                  {e.status === 'pendente' && !isOwner && (
                    <>
                      <Input
                        placeholder="Comentário (opcional)"
                        value={comentarios[e.id] || ''}
                        onChange={ev => setComentarios(c => ({ ...c, [e.id]: ev.target.value }))}
                        className="h-8 text-xs flex-1 min-w-[180px]"
                      />
                      <Button size="sm" onClick={() => onDecidir(e, 'aprovado', comentarios[e.id])} style={{ backgroundColor: '#16a34a' }}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Aprovar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => onDecidir(e, 'rejeitado', comentarios[e.id])}>
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Rejeitar
                      </Button>
                    </>
                  )}

                  {e.status === 'pendente' && isOwner && (
                    <span className="text-xs text-muted-foreground italic">Aguarda aprovação por outro membro da equipa.</span>
                  )}

                  <Button size="sm" variant="ghost" onClick={() => onRemoverEntrega(e)} className="ml-auto text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox de pré-visualização */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto p-2">
          <DialogHeader className="px-2 pt-1">
            <DialogTitle className="text-sm font-medium truncate">{preview?.nome}</DialogTitle>
          </DialogHeader>
          {preview && (
            (preview.mime || '').startsWith('image/') ? (
              <img src={preview.url} alt={preview.nome} className="max-w-full max-h-[75vh] mx-auto object-contain" />
            ) : (preview.mime || '').startsWith('video/') ? (
              <video src={preview.url} controls className="max-w-full max-h-[75vh] mx-auto" />
            ) : (preview.mime === 'application/pdf') ? (
              <iframe src={preview.url} className="w-full h-[75vh]" title={preview.nome} />
            ) : (
              <p className="text-sm text-muted-foreground p-4 text-center">
                Pré-visualização indisponível para este tipo de ficheiro.
              </p>
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────── THUMB DE ENTREGA ─────────────────────────

function EntregaThumb({ entrega, onPreview }: { entrega: Entrega; onPreview: (p: { url: string; nome: string; mime: string | null }) => void }) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const isImg = (entrega.mime_type || '').startsWith('image/');
  const isVideo = (entrega.mime_type || '').startsWith('video/');
  const isPdf = entrega.mime_type === 'application/pdf';
  const previewable = isImg || isVideo || isPdf;

  useEffect(() => {
    let cancelled = false;
    if (!isImg) return;
    supabase.storage.from('marketing-editorial').createSignedUrl(entrega.storage_path, 3600).then(({ data }) => {
      if (!cancelled && data?.signedUrl) setThumbUrl(data.signedUrl);
    });
    return () => { cancelled = true; };
  }, [entrega.storage_path, isImg]);

  const handleClick = async () => {
    if (!previewable) return;
    if (thumbUrl) {
      onPreview({ url: thumbUrl, nome: entrega.nome, mime: entrega.mime_type });
      return;
    }
    const { data } = await supabase.storage.from('marketing-editorial').createSignedUrl(entrega.storage_path, 3600);
    if (data?.signedUrl) onPreview({ url: data.signedUrl, nome: entrega.nome, mime: entrega.mime_type });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!previewable}
      className="h-16 w-16 rounded-md border bg-muted/30 shrink-0 overflow-hidden flex items-center justify-center hover:ring-2 hover:ring-primary/40 transition disabled:cursor-default disabled:hover:ring-0"
      title={previewable ? 'Pré-visualizar' : entrega.nome}
    >
      {isImg && thumbUrl ? (
        <img src={thumbUrl} alt={entrega.nome} className="h-full w-full object-cover" />
      ) : isVideo ? (
        <FileImage className="h-6 w-6 text-muted-foreground" />
      ) : isPdf ? (
        <span className="text-[10px] font-bold text-muted-foreground">PDF</span>
      ) : (
        <Paperclip className="h-5 w-5 text-muted-foreground" />
      )}
    </button>
  );
}
