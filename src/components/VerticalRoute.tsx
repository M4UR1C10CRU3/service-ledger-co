import { useNavigate } from 'react-router-dom';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';
import { nomeProduto, type Vertical } from '@/lib/verticais';

/**
 * Porta de um vertical com entrada própria.
 *
 * Ter conta no Clariza NÃO dá entrada num vertical de cliente. O
 * `ProtectedRoute` verifica que a pessoa existe em `liberty_utilizadores` e
 * está ativa — o que basta para o grupo de empresas, mas não para um produto
 * que é de outra gente. Sem esta verificação, qualquer utilizador do grupo
 * abria as turmas do ITC ou os projetos do Elo Giro.
 *
 * A verificação assenta no que já existe: `liberty_utilizador_empresas`. O
 * `EmpresaContext` só devolve as empresas atribuídas a quem entrou, portanto
 * basta perguntar se alguma delas é deste vertical.
 *
 * Isto fecha a PORTA. Não substitui o RLS: para as paredes serem tão sólidas
 * como a porta, as tabelas têm de filtrar por empresa no servidor.
 */
export const VerticalRoute = ({
  vertical, entrada, children,
}: {
  vertical: Vertical;
  /** Para onde mandar quem não tem acesso, depois de terminar sessão. */
  entrada: string;
  children: React.ReactNode;
}) => {
  const navigate = useNavigate();
  const { empresas, isLoading } = useEmpresa();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(240_5%_8%)]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white/60" />
      </div>
    );
  }

  if (empresas.some(e => e.vertical === vertical)) return <>{children}</>;

  const sair = async () => {
    await supabase.auth.signOut();
    navigate(entrada, { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(240_5%_8%)] p-6">
      <div className="w-full max-w-md rounded-[14px] border border-white/10
                      bg-[hsl(240_5%_10%)] p-8 text-center">
        <ShieldAlert className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
        <h1 className="text-[18px] font-bold text-white mb-2">
          Sem acesso ao {nomeProduto(vertical)}
        </h1>
        <p className="text-[13px] text-muted-foreground mb-6">
          A sua conta não está autorizada neste ambiente. O acesso é atribuído
          individualmente pelo administrador.
        </p>
        <Button onClick={sair} variant="outline" className="w-full">
          Terminar sessão
        </Button>
      </div>
    </div>
  );
};

export default VerticalRoute;
