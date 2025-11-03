-- SCRIPT DE TESTE PARA VERIFICAR DADOS DO RELATÓRIO ANUAL
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se há pedidos finalizados em 2025
SELECT 
    COUNT(*) as total_pedidos,
    MIN(data) as primeira_data,
    MAX(data) as ultima_data
FROM pedidos
WHERE EXTRACT(YEAR FROM data) = 2025
  AND status = 'FINALIZADO';

-- 2. Verificar pedidos por tipo (ENTRADA vs SAIDA)
SELECT 
    ta.tipo,
    ta.nome as tipo_atendimento,
    COUNT(*) as total_pedidos,
    SUM(p.total) as total_valor
FROM pedidos p
INNER JOIN tipos_atendimento ta ON p.tipo_atendimento_id = ta.id
WHERE EXTRACT(YEAR FROM p.data) = 2025
  AND p.status = 'FINALIZADO'
GROUP BY ta.tipo, ta.nome;

-- 3. Verificar se há cliente DIZIMO
SELECT 
    id,
    nome,
    ativo
FROM clientes
WHERE nome = 'DIZIMO';

-- 4. Verificar pedidos de DIZIMO
SELECT 
    p.id,
    p.data,
    p.total,
    c.nome as cliente_nome,
    ta.tipo as tipo_atendimento,
    ta.nome as tipo_atendimento_nome
FROM pedidos p
LEFT JOIN clientes c ON p.cliente_id = c.id
LEFT JOIN tipos_atendimento ta ON p.tipo_atendimento_id = ta.id
WHERE c.nome = 'DIZIMO'
  AND EXTRACT(YEAR FROM p.data) = 2025
  AND p.status = 'FINALIZADO';

-- 5. Testar a função relatorio_vendas_anual diretamente
SELECT * FROM relatorio_vendas_anual(2025);

-- 6. Verificar formas de pagamento disponíveis
SELECT 
    id,
    nome,
    ativo
FROM formas_pagamento
WHERE ativo = true;

-- 7. Verificar tipos de atendimento
SELECT 
    id,
    nome,
    tipo,
    ativo
FROM tipos_atendimento
WHERE ativo = true;

