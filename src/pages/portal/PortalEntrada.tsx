import { Navigate, useSearchParams } from 'react-router-dom';
import { PortalShell } from '@/components/portal/PortalShell';
import { usePortalIdentidade } from '@/hooks/usePortalIdentidade';
import { perfilValido } from '@/lib/perfisPortal';

/**
 * Porta de entrada do portal.
 *
 * É para aqui que a ligação enviada por email traz a pessoa. Daqui, encaminha
 * para o portal que lhe corresponde.
 *
 * `?perfil=` traz a porta por onde a pessoa entrou e serve de PREFERÊNCIA para
 * quem tem mais do que um papel — quem é aluno e instrutor e entrou pela porta
 * do instrutor devia cair no do instrutor, não no de aluno por ordem alfabética
 * do código. Não é permissão: se não tiver ficha desse papel, segue a ordem
 * normal e pode trocar no cabeçalho.
 */
export default function PortalEntrada() {
  const { data, isLoading } = usePortalIdentidade();
  const [searchParams] = useSearchParams();
  const preferido = perfilValido(searchParams.get('perfil'));

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (preferido === 'aluno'       && data?.aluno)       return <Navigate to="/portal/aluno" replace />;
  if (preferido === 'instrutor'   && data?.docente)     return <Navigate to="/portal/instrutor" replace />;
  if (preferido === 'corporativo' && data?.corporativo) return <Navigate to="/portal/corporativo" replace />;

  if (data?.aluno)       return <Navigate to="/portal/aluno" replace />;
  if (data?.docente)     return <Navigate to="/portal/instrutor" replace />;
  if (data?.corporativo) return <Navigate to="/portal/corporativo" replace />;

  // Sem ficha: o PortalShell explica o que falta, em vez de deixar em branco.
  return <PortalShell><div /></PortalShell>;
}
