import { useState, useMemo } from 'react';
import { Service, ServiceWithCalculations, DashboardMetrics } from '@/types/service';

// Sample data based on the user's example
const initialServices: Service[] = [
  {
    id: '1',
    data: '01/09/2025',
    servico: 'Consultoria Financeira',
    cliente: 'Cliente A',
    resumo: 'Revisão fiscal anual',
    proposta: 'P-101',
    fatura: 'F-2001',
    valorComIVA: 2000.00,
    valorSemIVA: 1626.02,
    liquidado: 2000.00,
    aRealizar: false,
    createdAt: new Date('2025-09-01'),
  },
  {
    id: '2',
    data: '05/09/2025',
    servico: 'Apoio Contabilístico',
    cliente: 'Cliente B',
    resumo: 'Balancete mensal',
    proposta: 'P-102',
    fatura: 'F-2002',
    valorComIVA: 1500.00,
    valorSemIVA: 1219.51,
    liquidado: 1000.00,
    aRealizar: false,
    createdAt: new Date('2025-09-05'),
  },
  {
    id: '3',
    data: '10/09/2025',
    servico: 'Auditoria Interna',
    cliente: 'Cliente C',
    resumo: 'Auditoria trimestral',
    proposta: 'P-103',
    fatura: '',
    valorComIVA: 3000.00,
    valorSemIVA: 2439.02,
    liquidado: 0.00,
    aRealizar: true,
    createdAt: new Date('2025-09-10'),
  },
  {
    id: '4',
    data: '12/09/2025',
    servico: 'Limpeza Pós-Obra',
    cliente: 'Cliente D',
    resumo: 'Conclusão edifício',
    proposta: 'P-104',
    fatura: 'F-2003',
    valorComIVA: 4000.00,
    valorSemIVA: 3252.03,
    liquidado: 2000.00,
    aRealizar: false,
    createdAt: new Date('2025-09-12'),
  },
  {
    id: '5',
    data: '15/09/2025',
    servico: 'Formação Equipa',
    cliente: 'Cliente E',
    resumo: 'Workshop fiscal',
    proposta: 'P-105',
    fatura: 'F-2004',
    valorComIVA: 1200.00,
    valorSemIVA: 975.61,
    liquidado: 0.00,
    aRealizar: false,
    createdAt: new Date('2025-09-15'),
  },
];

export const useServices = () => {
  const [services, setServices] = useState<Service[]>(initialServices);

  const calculateServiceMetrics = (service: Service): ServiceWithCalculations => {
    const executadoEmDebito = service.valorComIVA - service.liquidado;
    const percentualLiquidado = service.valorComIVA > 0 ? (service.liquidado / service.valorComIVA) * 100 : 0;
    
    // Calculate days overdue if invoice exists and not fully paid
    let diasEmAtraso = 0;
    if (service.fatura && executadoEmDebito > 0) {
      const [day, month, year] = service.data.split('/').map(Number);
      const serviceDate = new Date(year, month - 1, day);
      const today = new Date();
      const diffTime = today.getTime() - serviceDate.getTime();
      diasEmAtraso = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    }

    return {
      ...service,
      executadoEmDebito,
      diasEmAtraso,
      percentualLiquidado,
    };
  };

  const servicesWithCalculations = useMemo(() => {
    return services.map(calculateServiceMetrics);
  }, [services]);

  const dashboardMetrics = useMemo((): DashboardMetrics => {
    const faturados = services.filter(s => s.fatura);
    const naoFaturados = services.filter(s => !s.fatura);
    
    const totalFaturado = faturados.reduce((sum, s) => sum + s.valorComIVA, 0);
    const totalLiquidado = faturados.reduce((sum, s) => sum + s.liquidado, 0);
    const totalEmDebito = totalFaturado - totalLiquidado;
    const percentualLiquidado = totalFaturado > 0 ? (totalLiquidado / totalFaturado) * 100 : 0;
    const totalNaoFaturado = naoFaturados.reduce((sum, s) => sum + s.valorComIVA, 0);
    
    const servicosEmAtraso = servicesWithCalculations.filter(s => s.diasEmAtraso > 0).length;

    return {
      totalFaturado,
      totalLiquidado,
      totalEmDebito,
      percentualLiquidado,
      totalNaoFaturado,
      servicosEmAtraso,
    };
  }, [services, servicesWithCalculations]);

  const addService = (service: Omit<Service, 'id' | 'createdAt'>) => {
    const newService: Service = {
      ...service,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    setServices(prev => [...prev, newService]);
  };

  const updateService = (id: string, updates: Partial<Service>) => {
    setServices(prev => prev.map(service => 
      service.id === id ? { ...service, ...updates } : service
    ));
  };

  const deleteService = (id: string) => {
    setServices(prev => prev.filter(service => service.id !== id));
  };

  return {
    services: servicesWithCalculations,
    dashboardMetrics,
    addService,
    updateService,
    deleteService,
  };
};