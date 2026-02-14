import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useServices } from '@/hooks/useServices';
import { useClientes } from '@/hooks/useClientes';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { Service, ServiceWithCalculations } from '@/types/service';
import { DashboardCards } from '@/components/DashboardCards';
import { ServiceChart } from '@/components/ServiceChart';
import { ServiceTable } from '@/components/ServiceTable';
import { ServiceForm } from '@/components/ServiceForm';
import { ServiceDetailDialog } from '@/components/ServiceDetailDialog';
import { ReportsDialog } from '@/components/ReportsDialog';
import { CreateInvoiceDialog } from '@/components/CreateInvoiceDialog';
import { DateFilter } from '@/components/DateFilter';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText } from 'lucide-react';

const Index = () => {
  const { empresa } = useEmpresa();
  const navigate = useNavigate();

  useEffect(() => {
    if (!empresa) {
      const savedEmpresa = localStorage.getItem('selectedEmpresa');
      if (!savedEmpresa) navigate('/empresa');
    }
  }, [empresa, navigate]);

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
    liquidacoes,
  } = useServices(empresa?.id);

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
  const [clienteSearch, setClienteSearch] = useState<string>('');
  const [debitoFilter, setDebitoFilter] = useState<string | null>(null);

  const filteredServices = useMemo(() => {
    if (!isInitialized) return [];
    return services.filter((service) => {
      const parts = service.data.split('/');
      if (parts.length !== 3) return true;
      const [day, month, year] = parts;
      if (selectedYear && year !== selectedYear) return false;
      if (selectedMonth && month !== selectedMonth) return false;
      if (clienteSearch && !service.cliente.toLowerCase().includes(clienteSearch.toLowerCase())) return false;
      if (debitoFilter) {
        if (service.executadoEmDebito <= 0) return false;
        switch (debitoFilter) {
          case 'ate30': if (service.diasEmAtraso < 1 || service.diasEmAtraso > 30) return false; break;
          case '31a90': if (service.diasEmAtraso < 31 || service.diasEmAtraso > 90) return false; break;
          case 'acima90': if (service.diasEmAtraso <= 90) return false; break;
        }
      }
      return true;
    });
  }, [services, selectedYear, selectedMonth, clienteSearch, debitoFilter, isInitialized]);

  const [selectedContract, setSelectedContract] = useState<ServiceWithCalculations | null>(null);

  const handleAddService = () => { setEditingService(null); setIsFormOpen(true); };
  const handleEditService = (service: Service) => { setEditingService(service); setIsFormOpen(true); };

  const handleDuplicateService = (service: ServiceWithCalculations) => {
    const duplicatedService = {
      ...service,
      id: '',
      resumo: service.resumo ? `${service.resumo} (Cópia)` : '(Cópia)',
      numeroFatura: '',
      liquidado: 0,
      valorFaturado: 0,
      data: new Date().toLocaleDateString('pt-PT'),
    } as Service;
    setEditingService(duplicatedService);
    setIsFormOpen(true);
    toast({ title: "Duplicar serviço", description: "Dados copiados. Faça as alterações necessárias e guarde." });
  };

  const handleViewService = (service: ServiceWithCalculations) => { setSelectedService(service); setIsDetailOpen(true); };

  const handleAddLiquidacao = (liquidacao: any) => {
    addLiquidacao(liquidacao);
    toast({ title: "Pagamento registrado", description: "O pagamento foi registrado com sucesso." });
  };

  const handleRemoveLiquidacao = (liquidacaoId: string) => {
    if (selectedService) {
      removeLiquidacao(liquidacaoId, selectedService.id);
      toast({ title: "Pagamento removido", description: "O pagamento foi removido com sucesso.", variant: "destructive" });
    }
  };

  const handleCreateInvoice = (contract: ServiceWithCalculations) => { setSelectedContract(contract); setIsCreateInvoiceOpen(true); };

  const handleCreateInvoiceSubmit = (invoiceData: any) => {
    addService(invoiceData);
    toast({ title: "Fatura criada", description: "A fatura parcial foi criada com sucesso." });
  };

  const handleFormSubmit = async (serviceData: Omit<Service, 'id' | 'createdAt'>, liquidacoesData?: any[]) => {
    try {
      const isRealEdit = editingService && editingService.id;
      if (isRealEdit) {
        updateService(editingService.id, serviceData);
        if (liquidacoesData && liquidacoesData.length > 0) {
          for (const liq of liquidacoesData) {
            await addLiquidacao({ serviceId: editingService.id, valor: liq.valor, dataPagamento: liq.dataPagamento, formaPagamento: liq.formaPagamento, observacoes: liq.observacoes });
          }
        }
        toast({ title: "Serviço atualizado", description: "O serviço foi atualizado com sucesso." });
      } else {
        addService(serviceData, liquidacoesData);
        toast({ title: editingService ? "Serviço duplicado" : "Serviço adicionado", description: editingService ? "A cópia do serviço foi criada com sucesso." : "O novo serviço foi adicionado com sucesso." });
      }
      setEditingService(null);
    } catch (error) {
      console.error('Erro ao guardar serviço:', error);
      toast({ title: "Erro ao guardar", description: "Ocorreu um erro ao guardar o serviço. Tente novamente.", variant: "destructive" });
    }
  };

  const handleDeleteService = (id: string) => {
    deleteService(id);
    toast({ title: "Serviço removido", description: "O serviço foi removido com sucesso.", variant: "destructive" });
  };

  if (!isInitialized) {
    return (
      <div className="p-6 flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">A carregar serviços...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vendas / Serviços</h1>
          <p className="text-sm text-muted-foreground">Gestão de serviços e faturação</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsReportsOpen(true)}>
            <FileText className="w-4 h-4 mr-2" />
            Relatórios
          </Button>
          <Button size="sm" onClick={handleAddService}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Serviço
          </Button>
        </div>
      </div>

      <DashboardCards metrics={dashboardMetrics} />
      <DateFilter
        services={services}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        clienteSearch={clienteSearch}
        debitoFilter={debitoFilter}
        onYearChange={setSelectedYear}
        onMonthChange={setSelectedMonth}
        onClienteSearchChange={setClienteSearch}
        onDebitoFilterChange={setDebitoFilter}
      />
      <ServiceChart services={filteredServices} />
      <ServiceTable
        services={filteredServices}
        onEditService={handleEditService}
        onDeleteService={handleDeleteService}
        onViewService={handleViewService}
        onDuplicateService={handleDuplicateService}
      />

      <ServiceForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        editingService={editingService}
        existingLiquidacoes={editingService ? liquidacoes[editingService.id] || [] : []}
        onUpdateLiquidacao={(liquidacaoId, updates) => { if (editingService) updateLiquidacao(liquidacaoId, editingService.id, updates); }}
        onRemoveLiquidacao={(liquidacaoId) => { if (editingService) removeLiquidacao(liquidacaoId, editingService.id); }}
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
        onUpdateLiquidacao={updateLiquidacao}
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
