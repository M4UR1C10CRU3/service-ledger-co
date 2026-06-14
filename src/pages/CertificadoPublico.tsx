import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { format, isPast } from 'date-fns';
import { pt } from 'date-fns/locale';
import { CheckCircle2, AlertTriangle, XCircle, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CertInfo {
  codigo: string;
  aluno_nome: string;
  curso_nome: string;
  carga_horaria: number | null;
  emitido_em: string;
  validade_em: string | null;
  docente_nome: string | null;
  empresa_nome: string;
  url_pdf: string | null;
}

type Estado = 'loading' | 'valido' | 'vencido' | 'nao_encontrado';

export default function CertificadoPublico() {
  const { codigo } = useParams<{ codigo: string }>();
  const [estado, setEstado] = useState<Estado>('loading');
  const [info, setInfo] = useState<CertInfo | null>(null);

  useEffect(() => {
    if (!codigo) { setEstado('nao_encontrado'); return; }

    (async () => {
      const { data: cert, error } = await (supabase as any)
        .from('school_certificados')
        .select('codigo, emitido_em, validade_em, url_pdf, aluno_id, turma_id, docente_id, empresa_id')
        .eq('codigo', codigo.toUpperCase())
        .maybeSingle();

      if (error || !cert) { setEstado('nao_encontrado'); return; }

      const [
        { data: aluno },
        { data: turma },
        { data: empresa },
      ] = await Promise.all([
        (supabase as any).from('school_alunos').select('nome').eq('id', cert.aluno_id).maybeSingle(),
        (supabase as any).from('school_turmas').select('titulo, curso_id').eq('id', cert.turma_id).maybeSingle(),
        (supabase as any).from('empresas').select('nome').eq('id', cert.empresa_id).maybeSingle(),
      ]);

      let curso_nome = '—';
      let carga_horaria: number | null = null;
      if (turma?.curso_id) {
        const { data: curso } = await (supabase as any)
          .from('school_cursos').select('nome, carga_horaria').eq('id', turma.curso_id).maybeSingle();
        if (curso) { curso_nome = curso.nome; carga_horaria = curso.carga_horaria; }
      }

      let docente_nome: string | null = null;
      if (cert.docente_id) {
        const { data: doc } = await (supabase as any)
          .from('school_docentes').select('nome').eq('id', cert.docente_id).maybeSingle();
        docente_nome = doc?.nome ?? null;
      }

      const certInfo: CertInfo = {
        codigo: cert.codigo,
        aluno_nome: aluno?.nome ?? '—',
        curso_nome,
        carga_horaria,
        emitido_em: cert.emitido_em,
        validade_em: cert.validade_em,
        docente_nome,
        empresa_nome: empresa?.nome ?? '—',
        url_pdf: cert.url_pdf,
      };

      setInfo(certInfo);
      const vencido = cert.validade_em && isPast(new Date(cert.validade_em + 'T23:59:59'));
      setEstado(vencido ? 'vencido' : 'valido');
    })();
  }, [codigo]);

  const fmt = (d: string) => format(new Date(d + 'T00:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: pt });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <Award className="h-12 w-12 text-amber-400 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-white">Verificação de Certificado</h1>
          <p className="text-slate-400 text-sm mt-1">Sistema Clariza School</p>
        </div>

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
            <p className="text-red-400/70 text-sm">O código <code className="bg-red-900/40 px-1.5 py-0.5 rounded font-mono">{codigo}</code> não corresponde a nenhum certificado válido.</p>
          </div>
        )}

        {(estado === 'valido' || estado === 'vencido') && info && (
          <div className={`rounded-2xl border p-8 space-y-6 ${
            estado === 'valido'
              ? 'bg-green-950/40 border-green-500/30'
              : 'bg-amber-950/40 border-amber-500/30'
          }`}>
            {/* Status badge */}
            <div className="flex items-center gap-3">
              {estado === 'valido'
                ? <CheckCircle2 className="h-8 w-8 text-green-400 shrink-0" />
                : <AlertTriangle className="h-8 w-8 text-amber-400 shrink-0" />}
              <div>
                <p className={`font-semibold text-lg ${estado === 'valido' ? 'text-green-300' : 'text-amber-300'}`}>
                  {estado === 'valido' ? 'Certificado Válido' : 'Certificado Vencido'}
                </p>
                <code className="text-xs text-slate-400 font-mono">{info.codigo}</code>
              </div>
              <Badge variant="outline" className={`ml-auto ${
                estado === 'valido'
                  ? 'border-green-500/40 text-green-300 bg-green-500/10'
                  : 'border-amber-500/40 text-amber-300 bg-amber-500/10'
              }`}>
                {estado === 'valido' ? 'AUTÊNTICO' : 'VENCIDO'}
              </Badge>
            </div>

            <div className="border-t border-white/10 pt-6 space-y-4">
              <Row label="Participante" value={info.aluno_nome} highlight />
              <Row label="Curso" value={info.curso_nome} />
              {info.carga_horaria && <Row label="Carga Horária" value={`${info.carga_horaria}h`} />}
              {info.docente_nome && <Row label="Instrutor" value={info.docente_nome} />}
              <Row label="Emitido em" value={fmt(info.emitido_em)} />
              {info.validade_em && (
                <Row
                  label="Válido até"
                  value={fmt(info.validade_em)}
                  warn={estado === 'vencido'}
                />
              )}
              <Row label="Emitido por" value={info.empresa_nome} />
            </div>

            {info.url_pdf && (
              <a
                href={info.url_pdf}
                target="_blank"
                rel="noreferrer"
                className="block w-full text-center bg-white/10 hover:bg-white/15 transition-colors text-white text-sm font-medium py-3 rounded-xl border border-white/10"
              >
                Ver PDF do Certificado
              </a>
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
