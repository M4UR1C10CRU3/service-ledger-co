import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useServices } from '@/hooks/useServices';
import { useClientes } from '@/hooks/useClientes';
import { Service, ServiceWithCalculations } from '@/types/service';
import { Header } from '@/components/Header';
import { DashboardCards } from '@/components/DashboardCards';
import { ServiceChart } from '@/components/ServiceChart';
import { ServiceTable } from '@/components/ServiceTable';
import { ServiceForm } from '@/components/ServiceForm';
import { ServiceDetailDialog } from '@/components/ServiceDetailDialog';
import { ReportsDialog } from '@/components/ReportsDialog';
import { CreateInvoiceDialog } from '@/components/CreateInvoiceDialog';
import { DateFilter } from '@/components/DateFilter';
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
    isInitialized,
    liquidacoes 
  } = useServices();
  
  const { clientes, addCliente } = useClientes();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceWithCalculations | null>(null);
  
  // Date filter state
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // Filter services by year and month - only after data is loaded
  const filteredServices = useMemo(() => {
    // Don't filter until data is initialized
    if (!isInitialized) return [];
    
    return services.filter((service) => {
      // Data format is DD/MM/YYYY
      const parts = service.data.split('/');
      if (parts.length !== 3) return true;
      
      const [day, month, year] = parts;
      
      if (selectedYear && year !== selectedYear) return false;
      if (selectedMonth && month !== selectedMonth) return false;
      
      return true;
    });
  }, [services, selectedYear, selectedMonth, isInitialized]);
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

  const handleDuplicateService = (service: ServiceWithCalculations) => {
    // Cria uma cópia do serviço para edição, sem ID (será criado novo)
    const duplicatedService = {
      ...service,
      id: '', // Limpa o ID para criar novo
      resumo: service.resumo ? `${service.resumo} (Cópia)` : '(Cópia)',
      numeroFatura: '', // Limpa número da fatura
      liquidado: 0, // Novo serviço começa sem liquidações
      valorFaturado: 0, // Começa sem valor faturado
      data: new Date().toLocaleDateString('pt-PT'), // Data atual
    } as Service;
    
    setEditingService(duplicatedService);
    setIsFormOpen(true);
    toast({
      title: "Duplicar serviço",
      description: "Dados copiados. Faça as alterações necessárias e guarde.",
    });
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
    // Verifica se é edição real (tem id) ou duplicação/novo (sem id)
    const isRealEdit = editingService && editingService.id;
    
    if (isRealEdit) {
      updateService(editingService.id, serviceData);
      toast({
        title: "Serviço atualizado",
        description: "O serviço foi atualizado com sucesso.",
      });
    } else {
      addService(serviceData, liquidacoes);
      toast({
        title: editingService ? "Serviço duplicado" : "Serviço adicionado",
        description: editingService 
          ? "A cópia do serviço foi criada com sucesso."
          : "O novo serviço foi adicionado com sucesso.",
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

  // Show loading state while data is being loaded
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-background">
        <Header 
          onAddService={handleAddService} 
          onOpenReports={handleOpenReports}
          userName={userName}
        />
        <main className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
              <p className="text-muted-foreground">A carregar serviços...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header 
        onAddService={handleAddService} 
        onOpenReports={handleOpenReports}
        userName={userName}
      />
      
      <main className="container mx-auto px-6 py-6 space-y-6">
        <DashboardCards metrics={dashboardMetrics} />
        <DateFilter
          services={services}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onYearChange={setSelectedYear}
          onMonthChange={setSelectedMonth}
        />
        <ServiceChart services={filteredServices} />
        <ServiceTable 
          services={filteredServices}
          onEditService={handleEditService}
          onDeleteService={handleDeleteService}
          onViewService={handleViewService}
          onDuplicateService={handleDuplicateService}
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
        clientes={clientes}
        onCreateCliente={addCliente}
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
