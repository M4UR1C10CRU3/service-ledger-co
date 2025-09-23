import { useState } from 'react';
import { useServices } from '@/hooks/useServices';
import { Service, ServiceWithCalculations } from '@/types/service';
import { Header } from '@/components/Header';
import { DashboardCards } from '@/components/DashboardCards';
import { ServiceChart } from '@/components/ServiceChart';
import { ServiceTable } from '@/components/ServiceTable';
import { ServiceForm } from '@/components/ServiceForm';
import { ServiceDetailDialog } from '@/components/ServiceDetailDialog';
import { ReportsDialog } from '@/components/ReportsDialog';
import { toast } from '@/hooks/use-toast';

const Index = () => {
  const { 
    services, 
    dashboardMetrics, 
    addService, 
    updateService, 
    deleteService, 
    addLiquidacao, 
    removeLiquidacao 
  } = useServices();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceWithCalculations | null>(null);

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

  const handleViewService = (service: ServiceWithCalculations) => {
    setSelectedService(service);
    setIsDetailOpen(true);
  };

  const handleAddLiquidacao = (liquidacao: any) => {
    addLiquidacao(liquidacao);
    toast({
      title: "Pagamento registrado",
      description: "O pagamento foi registrado com sucesso.",
    });
  };

  const handleRemoveLiquidacao = (liquidacaoId: string) => {
    if (selectedService) {
      removeLiquidacao(liquidacaoId, selectedService.id);
      toast({
        title: "Pagamento removido",
        description: "O pagamento foi removido com sucesso.",
        variant: "destructive",
      });
    }
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
          onViewService={handleViewService}
        />
      </main>

      <ServiceForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        editingService={editingService}
      />

      <ServiceDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        service={selectedService}
        onAddLiquidacao={handleAddLiquidacao}
        onRemoveLiquidacao={handleRemoveLiquidacao}
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
