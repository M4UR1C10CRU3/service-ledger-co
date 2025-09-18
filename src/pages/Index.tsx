import { useState } from 'react';
import { useServices } from '@/hooks/useServices';
import { Service } from '@/types/service';
import { Header } from '@/components/Header';
import { DashboardCards } from '@/components/DashboardCards';
import { ServiceChart } from '@/components/ServiceChart';
import { ServiceTable } from '@/components/ServiceTable';
import { ServiceForm } from '@/components/ServiceForm';
import { ReportsDialog } from '@/components/ReportsDialog';
import { toast } from '@/hooks/use-toast';

const Index = () => {
  const { services, dashboardMetrics, addService, updateService, deleteService } = useServices();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const handleAddService = () => {
    setEditingService(null);
    setIsFormOpen(true);
  };

  const handleOpenReports = () => {
    setIsReportsOpen(true);
  };

  const handleEditService = (service: Service) => {
    setEditingService(service);
    setIsFormOpen(true);
  };

  const handleFormSubmit = (serviceData: Omit<Service, 'id' | 'createdAt'>) => {
    if (editingService) {
      updateService(editingService.id, serviceData);
      toast({
        title: "Serviço atualizado",
        description: "O serviço foi atualizado com sucesso.",
      });
    } else {
      addService(serviceData);
      toast({
        title: "Serviço adicionado",
        description: "O novo serviço foi adicionado com sucesso.",
      });
    }
    setEditingService(null);
  };

  const handleDeleteService = (id: string) => {
    deleteService(id);
    toast({
      title: "Serviço removido",
      description: "O serviço foi removido com sucesso.",
      variant: "destructive",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onAddService={handleAddService} onOpenReports={handleOpenReports} />
      
      <main className="container mx-auto px-6 py-6 space-y-6">
        <DashboardCards metrics={dashboardMetrics} />
        <ServiceChart services={services} />
        <ServiceTable 
          services={services}
          onEditService={handleEditService}
          onDeleteService={handleDeleteService}
        />
      </main>

      <ServiceForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        editingService={editingService}
      />

      <ReportsDialog 
        open={isReportsOpen}
        onOpenChange={setIsReportsOpen}
        services={services}
      />
    </div>
  );
};

export default Index;
