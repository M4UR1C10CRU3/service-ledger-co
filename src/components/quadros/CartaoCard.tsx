import { QuadroCartao } from '@/types/quadros';
import { Calendar, CheckSquare, AlignLeft, MessageSquare, User, Building2, FileText, Hourglass } from 'lucide-react';

interface Props {
  cartao: QuadroCartao;
  comentariosCount?: number;
  onClick?: () => void;
  /** Nome do cliente ou fornecedor associado, resolvido pelo quadro. */
  parteNome?: string | null;
  /** Tipo da parte, para o ícone certo. */
  parteTipo?: 'cliente' | 'fornecedor' | null;
  /** Mostrar «sem movimento há N dias» (desligado nas colunas de fim: concluído, perdido…). */
  vigiarParado?: boolean;
}

const fmtEur = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });

const isOverdue = (d: string | null) => !!d && new Date(d) < new Date();
const isDueSoon = (d: string | null) => {
  if (!d) return false;
  const diff = new Date(d).getTime() - Date.now();
  return diff > 0 && diff < 86_400_000 * 2;
};

function initials(nome: string | null) {
  if (!nome) return '?';
  return nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

const AVATAR_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#14b8a6'];
const avatarColor = (id: string) => AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length];

// Cartões parados: a partir de 14 dias sem mudar de coluna nem ser editado
// fica âmbar, a partir de 30 fica vermelho. Não precisa de agendador — é
// calculado ao abrir o quadro.
const diasParado = (c: QuadroCartao): number | null => {
  const ts = [c.movido_em, c.atualizado_em].filter(Boolean).map(d => new Date(d as string).getTime());
  if (!ts.length) return null;
  return Math.floor((Date.now() - Math.max(...ts)) / 86_400_000);
};

export default function CartaoCard({ cartao, comentariosCount, onClick, parteNome, parteTipo, vigiarParado = false }: Props) {
  const totalItems = cartao.checklists.reduce((s, cl) => s + cl.items.length, 0);
  const doneItems  = cartao.checklists.reduce((s, cl) => s + cl.items.filter(i => i.concluido).length, 0);
  const done = cartao.data_limite_concluida;
  const overdue = !done && isOverdue(cartao.data_limite);
  const dueSoon = !done && isDueSoon(cartao.data_limite);
  const hasDesc = !!cartao.descricao?.trim();
  const parado = vigiarParado ? diasParado(cartao) : null;
  const mostrarParado = parado != null && parado >= 14;

  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-2.5 cursor-pointer hover:border-primary/40 transition-colors"
      onClick={onClick}
    >
      {cartao.cor && <div className="h-2 rounded-full mb-2" style={{ backgroundColor: cartao.cor }} />}

      {cartao.etiquetas.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {cartao.etiquetas.map(e => (
            <span key={e.id} className="h-2 w-9 rounded-full" style={{ backgroundColor: e.cor }} title={e.nome} />
          ))}
        </div>
      )}

      {/* A parte de quem se trata, acima do título — é o primeiro dado que o
          gestor procura, tal como no Workflow Comercial. Num quadro livre não
          existe e nada disto aparece. */}
      {parteNome && (
        <p className="flex items-center gap-1 text-[11px] font-medium text-gray-500 mb-0.5 truncate">
          {parteTipo === 'fornecedor' ? <Building2 size={11} /> : <User size={11} />}
          <span className="truncate">{parteNome}</span>
        </p>
      )}

      <p className="text-sm text-gray-800 leading-snug break-words">{cartao.titulo}</p>

      {(cartao.valor != null || cartao.doc_tipo) && (
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {cartao.doc_tipo && (
            <span className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
              <FileText size={10} /> {cartao.doc_tipo.replace(/_/g, ' ')}
            </span>
          )}
          {cartao.valor != null && (
            <span className="text-sm font-semibold text-gray-800 tabular-nums ml-auto">
              {fmtEur(Number(cartao.valor))}
            </span>
          )}
        </div>
      )}

      {(cartao.data_limite || mostrarParado || totalItems > 0 || hasDesc || (comentariosCount ?? 0) > 0 || cartao.membros.length > 0) && (
        <div className="flex items-center gap-2.5 mt-2 flex-wrap">
          {mostrarParado && (
            <span
              title="Dias sem mudar de coluna nem ser editado"
              className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${parado! >= 30 ? 'bg-red-100 text-red-700 font-medium' : 'bg-amber-100 text-amber-700'}`}
            >
              <Hourglass size={11} /> {parado} dias parado
            </span>
          )}
          {cartao.data_limite && (
            <span className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${
              done    ? 'bg-green-100 text-green-700' :
              overdue ? 'bg-red-100 text-red-700 font-medium' :
              dueSoon ? 'bg-yellow-100 text-yellow-700' : 'text-gray-400'
            }`}>
              <Calendar size={11} /> {fmtDate(cartao.data_limite)}
            </span>
          )}
          {hasDesc && <AlignLeft size={13} className="text-gray-400" />}
          {totalItems > 0 && (
            <span className={`flex items-center gap-1 text-xs ${doneItems === totalItems ? 'text-green-600' : 'text-gray-400'}`}>
              <CheckSquare size={12} /> {doneItems}/{totalItems}
            </span>
          )}
          {(comentariosCount ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-xs text-gray-400"><MessageSquare size={12} /> {comentariosCount}</span>
          )}

          {cartao.membros.length > 0 && (
            <div className="flex items-center -space-x-1.5 ml-auto">
              {cartao.membros.slice(0, 3).map(m => (
                <span key={m.utilizador_id} title={m.nome || ''}
                  className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-white"
                  style={{ backgroundColor: avatarColor(m.utilizador_id) }}>
                  {initials(m.nome)}
                </span>
              ))}
              {cartao.membros.length > 3 && (
                <span className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center text-[10px] font-bold text-gray-700 ring-2 ring-white">
                  +{cartao.membros.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { initials, avatarColor };
