import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { CheckCircle2, AlertTriangle, XCircle, Award, Search, Ban } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Verificação pública de autenticidade.
 *
 * Não toca na tabela: chama school_verificar_certificado, que é a única porta
 * aberta a quem não tem sessão. A versão anterior consultava school_certificados
 * diretamente e a RLS devolvia sempre vazio, pelo que a página dizia "não
 * encontrado" a toda a gente — o certificado dizia para verificar num sítio que
 * nunca confirmava nada.
 */

interface CertInfo {
  codigo: string;
  valido: boolean;
  vencido: boolean;
  cancelado: boolean;
  aluno_nome: string | null;
  aluno_cpf: string | null;
  curso_nome: string | null;
  carga_horaria: number | null;
  reconhecimento: string | null;
  docente_nome: string | null;
  data_inicio: string | null;
  data_conclusao: string | null;
  emitido_em: string | null;
  validade_em: string | null;
  emissor_nome: string | null;
  local_aplicacao: string | null;
}

type Estado = 'vazio' | 'loading' | 'valido' | 'vencido' | 'cancelado' | 'nao_encontrado';

/** O código é transcrito de um papel: aceitamos travessões, espaços e minúsculas. */
export function normalizarCodigo(v: string): string {
  return v
    .normalize('NFKC')
    .replace(/[‐‑‒–—−]/g, '-')
    .replace(/\s+/g, '')
    .trim()
    .toUpperCase();
}

export default function CertificadoPublico() {
  const { codigo } = useParams<{ codigo: string }>();
  const navigate = useNavigate();
  const [estado, setEstado] = useState<Estado>(codigo ? 'loading' : 'vazio');
  const [info, setInfo] = useState<CertInfo | null>(null);
  const [campo, setCampo] = useState(codigo ?? '');

  useEffect(() => {
    if (!codigo) { setEstado('vazio'); setInfo(null); return; }
    setCampo(codigo);
    setEstado('loading');

    let cancelado = false;
    (async () => {
      const { data, error } = await (supabase.rpc as any)('school_verificar_certificado', {
        p_codigo: normalizarCodigo(codigo),
      });
      if (cancelado) return;

      const linha: CertInfo | undefined = Array.isArray(data) ? data[0] : data;
      if (error || !linha) { setInfo(null); setEstado('nao_encontrado'); return; }

      setInfo(linha);
      setEstado(linha.cancelado ? 'cancelado' : linha.vencido ? 'vencido' : 'valido');
    })();

    return () => { cancelado = true; };
  }, [codigo]);

  const submeter = (e: React.FormEvent) => {
    e.preventDefault();
    const c = normalizarCodigo(campo);
    if (c) navigate(`/certificado/${encodeURIComponent(c)}`);
  };

  const fmt = (d?: string | null) =>
    d ? format(new Date(d + 'T00:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: pt }) : '—';

  const cor = estado === 'valido'
    ? { fundo: 'bg-green-950/40 border-green-500/30', texto: 'text-green-300', badge: 'border-green-500/40 text-green-300 bg-green-500/10' }
    : estado === 'vencido'
      ? { fundo: 'bg-amber-950/40 border-amber-500/30', texto: 'text-amber-300', badge: 'border-amber-500/40 text-amber-300 bg-amber-500/10' }
      : { fundo: 'bg-red-950/40 border-red-500/30', texto: 'text-red-300', badge: 'border-red-500/40 text-red-300 bg-red-500/10' };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Award className="h-12 w-12 text-amber-400 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-white">Verificação de Autenticidade</h1>
          <p className="text-slate-400 text-sm mt-1">
            {info?.emissor_nome ? info.emissor_nome : 'Clariza School'}
          </p>
        </div>

        {/* Introdução do código — para quem tem o certificado na mão e não um link. */}
        <form onSubmit={submeter} className="flex gap-2 mb-6">
          <Input
            value={campo}
            onChange={e => setCampo(e.target.value)}
            placeholder="Codificação do certificado"
            className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 font-mono"
            aria-label="Codificação do certificado"
          />
          <Button type="submit" className="shrink-0">
            <Search className="h-4 w-4 mr-2" /> Verificar
          </Button>
        </form>

        {estado === 'vazio' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <p className="text-slate-300 text-sm">
              Introduza a codificação impressa no certificado para confirmar que foi
              emitido por esta instituição.
            </p>
          </div>
        )}

        {estado === 'loading' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400 mx-auto mb-3" />
            <p className="text-slate-300 text-sm">A verificar certificado...</p>
          </div>
        )}

        {estado === 'nao_encontrado' && (
          <div className="bg-red-950/40 border border-red-500/30 rounded-2xl p-8 text-center">
            <XCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
            <h2 className="text-xl font-semibold text-red-300 mb-2">Certificado não encontrado</h2>
            <p className="text-red-400/70 text-sm">
              A codificação <code className="bg-red-900/40 px-1.5 py-0.5 rounded font-mono">{codigo}</code> não
              corresponde a nenhum certificado emitido.
            </p>
          </div>
        )}

        {(estado === 'valido' || estado === 'vencido' || estado === 'cancelado') && info && (
          <div className={`rounded-2xl border p-8 space-y-6 ${cor.fundo}`}>
            <div className="flex items-center gap-3">
              {estado === 'valido' ? <CheckCircle2 className="h-8 w-8 text-green-400 shrink-0" />
                : estado === 'vencido' ? <AlertTriangle className="h-8 w-8 text-amber-400 shrink-0" />
                : <Ban className="h-8 w-8 text-red-400 shrink-0" />}
              <div>
                <p className={`font-semibold text-lg ${cor.texto}`}>
                  {estado === 'valido' ? 'Certificado Válido'
                    : estado === 'vencido' ? 'Certificado Vencido'
                    : 'Certificado Cancelado'}
                </p>
                <code className="text-xs text-slate-400 font-mono">{info.codigo}</code>
              </div>
              <Badge variant="outline" className={`ml-auto ${cor.badge}`}>
                {estado === 'valido' ? 'AUTÊNTICO' : estado === 'vencido' ? 'VENCIDO' : 'CANCELADO'}
              </Badge>
            </div>

            <div className="border-t border-white/10 pt-6 space-y-4">
              <Row label="Participante" value={info.aluno_nome ?? '—'} highlight />
              {info.aluno_cpf && <Row label="CPF" value={info.aluno_cpf} />}
              <Row label="Curso" value={info.curso_nome ?? '—'} />
              {info.carga_horaria ? <Row label="Carga Horária" value={`${info.carga_horaria}h`} /> : null}
              {info.docente_nome && <Row label="Instrutor" value={info.docente_nome} />}
              {(info.data_inicio || info.data_conclusao) && (
                <Row label="Período" value={`${fmt(info.data_inicio)} a ${fmt(info.data_conclusao)}`} />
              )}
              {info.local_aplicacao && <Row label="Local de aplicação" value={info.local_aplicacao} />}
              <Row label="Emitido em" value={fmt(info.emitido_em)} />
              {info.validade_em && (
                <Row label="Válido até" value={fmt(info.validade_em)} warn={estado !== 'valido'} />
              )}
              <Row label="Emitido por" value={info.emissor_nome ?? '—'} />
            </div>

            {info.reconhecimento && (
              <p className="text-slate-400 text-xs leading-relaxed border-t border-white/10 pt-4">
                {info.reconhecimento}
              </p>
            )}
          </div>
        )}

        <p className="text-center text-slate-600 text-xs mt-6">
          Verificação automática · Clariza School · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, highlight, warn }: { label: string; value: string; highlight?: boolean; warn?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-slate-400 text-sm shrink-0">{label}</span>
      <span className={`text-sm text-right ${highlight ? 'text-white font-semibold text-base' : warn ? 'text-amber-300' : 'text-slate-200'}`}>
        {value}
      </span>
    </div>
  );
}
