import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/usePermissions';

/**
 * Trinco de permissão para uma rota.
 *
 * Esconder o item do menu não protege nada: quem escrever o endereço entra na
 * mesma. Este componente fecha essa porta — o `usePermissions` deixa passar
 * enquanto carrega, de propósito, para não piscar o ecrã de recusa a quem tem
 * acesso.
 *
 * Não substitui o RLS. A porta é aqui; as paredes são as políticas da base de
 * dados, que filtram por empresa no servidor.
 */
export const PermissaoRoute = ({
  modulo, children,
}: {
  modulo: string;
  children: React.ReactNode;
}) => {
  const { can, isLoading } = usePermissions();

  if (isLoading) return <>{children}</>;
  if (can(modulo, 'ver')) return <>{children}</>;

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-16 text-center">
      <ShieldAlert className="h-10 w-10 text-muted-foreground" />
      <div>
        <h1 className="text-xl font-semibold">Sem acesso a esta área</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          A sua conta não tem permissão para o módulo Administrativo. Fale com a administração
          se precisar de lá entrar.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link to="/dashboard">Voltar ao início</Link>
      </Button>
    </div>
  );
};
