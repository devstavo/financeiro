-- Script para debugar transações de crédito que não estão sendo conciliadas
-- Execute este script para ver exatamente quais transações de crédito existem

-- Ver todas as transações de crédito não conciliadas
SELECT 
    id,
    transaction_date,
    description,
    amount,
    transaction_type,
    reconciled,
    UPPER(description) as description_upper
FROM bank_transactions 
WHERE user_id IN (SELECT id FROM users WHERE username = 'ita')
    AND transaction_type = 'credit'
    AND reconciled = false
ORDER BY transaction_date DESC;

-- Ver regras de entrada ativas
SELECT 
    rule_name,
    bank_description_pattern,
    transaction_description,
    transaction_type,
    active,
    auto_reconcile
FROM reconciliation_rules 
WHERE user_id IN (SELECT id FROM users WHERE username = 'ita')
    AND transaction_type = 'entrada'
    AND active = true
ORDER BY rule_name;

-- Simular matching manual - ver quais transações de crédito fariam match com quais regras
SELECT 
    bt.description as transacao_original,
    bt.amount,
    bt.transaction_type,
    rr.rule_name,
    rr.bank_description_pattern,
    rr.transaction_type as rule_type,
    CASE 
        WHEN UPPER(bt.description) LIKE '%' || UPPER(REPLACE(rr.bank_description_pattern, '%', '')) || '%' 
        THEN 'MATCH' 
        ELSE 'NO MATCH' 
    END as pattern_match,
    CASE 
        WHEN bt.transaction_type = 'credit' AND rr.transaction_type = 'entrada' 
        THEN 'TYPE MATCH' 
        ELSE 'TYPE NO MATCH' 
    END as type_match
FROM bank_transactions bt
CROSS JOIN reconciliation_rules rr
WHERE bt.user_id IN (SELECT id FROM users WHERE username = 'ita')
    AND rr.user_id IN (SELECT id FROM users WHERE username = 'ita')
    AND bt.transaction_type = 'credit'
    AND bt.reconciled = false
    AND rr.active = true
    AND rr.auto_reconcile = true
ORDER BY bt.transaction_date DESC, rr.rule_name;

-- Comentário
COMMENT ON TABLE bank_transactions IS 'Debug para identificar por que créditos não estão sendo conciliados';
