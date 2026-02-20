
-- Attach trigger for liquidacoes (receitas -> cash flow)
CREATE TRIGGER trg_auto_cash_flow_on_liquidacao
AFTER INSERT ON public.liquidacoes
FOR EACH ROW
EXECUTE FUNCTION public.auto_cash_flow_on_liquidacao();

-- Attach trigger for account_payments (despesas -> cash flow)
CREATE TRIGGER trg_auto_cash_flow_on_account_payment
AFTER INSERT ON public.account_payments
FOR EACH ROW
EXECUTE FUNCTION public.auto_cash_flow_on_account_payment();
