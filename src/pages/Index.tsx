import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useServices } from '@/hooks/useServices';
import { Service, ServiceWithCalculations } from '@/types/service';
import { Header } from '@/components/Header';
import { DashboardCards } from '@/components/DashboardCards';
import { ServiceChart } from '@/components/ServiceChart';
import { ServiceTable } from '@/components/ServiceTable';
import { ServiceForm } from '@/components/ServiceForm';
import { ServiceDetailDialog } from '@/components/ServiceDetailDialog';
import { ReportsDialog } from '@/components/ReportsDialog';
import { CreateInvoiceDialog } from '@/components/CreateInvoiceDialog';
import { toast } from '@/hooks/use-toast';

const Index = () => {
  const [userName, setUserName] = useState<string>('');
  
  useEffect(() => {
    // Get user profile
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase
          .from('profiles')
          .select('nome')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setUserName(data.nome);
            }
          });
      }
    });
  }, []);

  const { 
    services, 
    dashboardMetrics, 
    addService, 
    updateService, 
    deleteService, 
    addLiquidacao, 
    removeLiquidacao,
    updateLiquidacao,
    isLoading,
    liquidacoes 
  } = useServices();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceWithCalculations | null>(null);
  const [selectedContract, setSelectedContract] = useState<ServiceWithCalculations | null>(null);

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

  const handleCreateInvoice = (contract: ServiceWithCalculations) => {
    setSelectedContract(contract);
    setIsCreateInvoiceOpen(true);
  };

  const handleCreateInvoiceSubmit = (invoiceData: any) => {
    addService(invoiceData);
    toast({
      title: "Fatura criada",
      description: "A fatura parcial foi criada com sucesso.",
    });
  };

  const handleFormSubmit = (serviceData: Omit<Service, 'id' | 'createdAt'>, liquidacoes?: any[]) => {
    if (editingService) {
      updateService(editingService.id, serviceData);
      toast({
        title: "Serviço atualizado",
        description: "O serviço foi atualizado com sucesso.",
      });
    } else {
      addService(serviceData, liquidacoes);
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
      <Header 
        onAddService={handleAddService} 
        onOpenReports={handleOpenReports}
        userName={userName}
      />
      
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
        existingLiquidacoes={editingService ? liquidacoes[editingService.id] || [] : []}
        onUpdateLiquidacao={(liquidacaoId, updates) => {
          if (editingService) {
            updateLiquidacao(liquidacaoId, editingService.id, updates);
          }
        }}
        onRemoveLiquidacao={(liquidacaoId) => {
          if (editingService) {
            removeLiquidacao(liquidacaoId, editingService.id);
          }
        }}
      />

      <ServiceDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        service={selectedService}
        allServices={services}
        onAddLiquidacao={handleAddLiquidacao}
        onRemoveLiquidacao={handleRemoveLiquidacao}
      />

      <ReportsDialog 
        open={isReportsOpen}
        onOpenChange={setIsReportsOpen}
        services={services}
        isLoading={isLoading}
      />

      <CreateInvoiceDialog
        open={isCreateInvoiceOpen}
        onOpenChange={setIsCreateInvoiceOpen}
        contract={selectedContract}
        onCreateInvoice={handleCreateInvoiceSubmit}
      />
    </div>
  );
};

export default Index;
