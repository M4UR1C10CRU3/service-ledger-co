import { Calculator, FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onAddService: () => void;
  onOpenReports: () => void;
}

export const Header = ({ onAddService, onOpenReports }: HeaderProps) => {
  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
            <Calculator className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Obrajusta II</h1>
            <p className="text-sm text-muted-foreground">Gestão de Serviços e Faturação</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={onOpenReports}>
            <FileText className="w-4 h-4 mr-2" />
            Relatórios
          </Button>
          <Button onClick={onAddService} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Novo Serviço
          </Button>
        </div>
      </div>
    </header>
  );
};