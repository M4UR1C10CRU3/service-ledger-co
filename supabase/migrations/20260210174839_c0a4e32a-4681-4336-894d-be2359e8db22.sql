
-- Atualizar liquidações com forma de pagamento detetada nas observações
UPDATE liquidacoes SET forma_pagamento = 'transferencia' 
WHERE forma_pagamento IS NULL AND (LOWER(observacoes) LIKE '%transfer%' OR LOWER(observacoes) LIKE '%trandfer%' OR LOWER(observacoes) LIKE '%tranfer%');

UPDATE liquidacoes SET forma_pagamento = 'cheque' 
WHERE forma_pagamento IS NULL AND LOWER(observacoes) LIKE '%cheque%';

UPDATE liquidacoes SET forma_pagamento = 'numerario' 
WHERE forma_pagamento IS NULL AND LOWER(observacoes) LIKE '%numer%';

UPDATE liquidacoes SET forma_pagamento = 'multibanco' 
WHERE forma_pagamento IS NULL AND LOWER(observacoes) LIKE '%multibanco%';
