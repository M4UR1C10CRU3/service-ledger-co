import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Construction } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description?: string;
  backTo?: string;
}

const PlaceholderPage = ({ title, description, backTo = '/dashboard' }: PlaceholderPageProps) => {
  const navigate = useNavigate();

  return (
    <div className="p-6 flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardContent className="flex flex-col items-center text-center p-8 space-y-4">
          <div className="p-3 rounded-full bg-primary-lighter">
            <Construction className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">
            {description || 'Esta funcionalidade está em desenvolvimento e estará disponível em breve.'}
          </p>
          <Button variant="outline" onClick={() => navigate(backTo)}>
            ← Voltar ao Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlaceholderPage;
