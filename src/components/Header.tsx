import { FileText, Plus, LogOut, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import logoObrajusta from '@/assets/logo-obrajusta.png';

interface HeaderProps {
  onAddService: () => void;
  onOpenReports: () => void;
  userName?: string;
}

export const Header = ({ onAddService, onOpenReports, userName }: HeaderProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Erro ao sair",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Logout realizado",
        description: "Até logo!",
      });
      navigate('/auth');
    }
  };

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img 
            src={logoObrajusta} 
            alt="Obrajusta Logo" 
            className="w-12 h-12 object-contain"
          />
          <div>
            <h1 className="text-xl font-bold text-foreground">Obrajusta II</h1>
            <p className="text-sm text-muted-foreground">Gestão de Serviços e Faturação</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {userName && (
            <span className="text-sm text-muted-foreground">
              Olá, <span className="font-medium text-foreground">{userName}</span>
            </span>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate('/clientes')}>
            <Users className="w-4 h-4 mr-2" />
            Clientes
          </Button>
          <Button variant="outline" size="sm" onClick={onOpenReports}>
            <FileText className="w-4 h-4 mr-2" />
            Relatórios
          </Button>
          <Button onClick={onAddService} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Novo Serviço
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </div>
    </header>
  );
};