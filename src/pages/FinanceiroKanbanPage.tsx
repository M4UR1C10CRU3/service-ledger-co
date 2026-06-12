import { FinanceiroKanban } from '@/components/financeiro/FinanceiroKanban';
import { Wallet } from 'lucide-react';

export default function FinanceiroKanbanPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Wallet className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Financeiro — Workflow</h1>
          <p className="text-sm text-muted-foreground">
            Pagamentos a fornecedores · Recebimentos · Cobranças
          </p>
        </div>
      </div>

      <FinanceiroKanban />
    </div>
  );
}
