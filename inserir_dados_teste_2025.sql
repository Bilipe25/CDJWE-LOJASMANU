-- =====================================================
-- DADOS DE TESTE PARA 2025
-- Execute este SQL no Supabase SQL Editor APENAS SE não houver dados
-- =====================================================

-- ATENÇÃO: Este script cria dados de TESTE. 
-- Execute APENAS se você quiser dados de exemplo!

-- ============================================
-- 1. Criar cliente DIZIMO (se não existir)
-- ============================================
INSERT INTO clientes (nome, cpf, telefone, ativo)
SELECT 'DIZIMO', NULL, NULL, true
WHERE NOT EXISTS (
    SELECT 1 FROM clientes WHERE nome = 'DIZIMO'
);

-- ============================================
-- 2. Criar formas de pagamento (se não existirem)
-- ============================================
INSERT INTO formas_pagamento (nome, ativo)
SELECT 'Pix', true
WHERE NOT EXISTS (SELECT 1 FROM formas_pagamento WHERE nome = 'Pix');

INSERT INTO formas_pagamento (nome, ativo)
SELECT 'Dinheiro', true
WHERE NOT EXISTS (SELECT 1 FROM formas_pagamento WHERE nome = 'Dinheiro');

INSERT INTO formas_pagamento (nome, ativo)
SELECT 'Cartão de Crédito', true
WHERE NOT EXISTS (SELECT 1 FROM formas_pagamento WHERE nome = 'Cartão de Crédito');

-- ============================================
-- 3. Criar tipos de atendimento (se não existirem)
-- ============================================
INSERT INTO tipos_atendimento (nome, tipo, ativo)
SELECT 'Venda Presencial', 'ENTRADA', true
WHERE NOT EXISTS (SELECT 1 FROM tipos_atendimento WHERE nome = 'Venda Presencial');

INSERT INTO tipos_atendimento (nome, tipo, ativo)
SELECT 'Venda Delivery', 'ENTRADA', true
WHERE NOT EXISTS (SELECT 1 FROM tipos_atendimento WHERE nome = 'Venda Delivery');

INSERT INTO tipos_atendimento (nome, tipo, ativo)
SELECT 'Dízimo', 'SAIDA', true
WHERE NOT EXISTS (SELECT 1 FROM tipos_atendimento WHERE nome = 'Dízimo');

-- ============================================
-- 4. Criar pedidos de TESTE para 2025
-- ============================================

-- Variáveis (você pode ajustar)
DO $$
DECLARE
    v_cliente_dizimo_id uuid;
    v_tipo_venda_id uuid;
    v_tipo_dizimo_id uuid;
    v_forma_pix_id uuid;
    v_forma_dinheiro_id uuid;
    v_forma_cartao_id uuid;
    v_pedido_id uuid;
BEGIN
    -- Buscar IDs
    SELECT id INTO v_cliente_dizimo_id FROM clientes WHERE nome = 'DIZIMO' LIMIT 1;
    SELECT id INTO v_tipo_venda_id FROM tipos_atendimento WHERE tipo = 'ENTRADA' LIMIT 1;
    SELECT id INTO v_tipo_dizimo_id FROM tipos_atendimento WHERE tipo = 'SAIDA' AND nome = 'Dízimo' LIMIT 1;
    SELECT id INTO v_forma_pix_id FROM formas_pagamento WHERE nome = 'Pix' LIMIT 1;
    SELECT id INTO v_forma_dinheiro_id FROM formas_pagamento WHERE nome = 'Dinheiro' LIMIT 1;
    SELECT id INTO v_forma_cartao_id FROM formas_pagamento WHERE nome = 'Cartão de Crédito' LIMIT 1;

    -- Criar 3 vendas em Janeiro 2025
    INSERT INTO pedidos (data, tipo_atendimento_id, forma_pagamento_id, total, status)
    VALUES 
        ('2025-01-10', v_tipo_venda_id, v_forma_pix_id, 150.00, 'FINALIZADO'),
        ('2025-01-15', v_tipo_venda_id, v_forma_dinheiro_id, 200.00, 'FINALIZADO'),
        ('2025-01-20', v_tipo_venda_id, v_forma_cartao_id, 350.00, 'FINALIZADO');

    -- Criar 1 DÍZIMO em Janeiro 2025
    INSERT INTO pedidos (data, cliente_id, tipo_atendimento_id, forma_pagamento_id, total, status)
    VALUES 
        ('2025-01-25', v_cliente_dizimo_id, v_tipo_dizimo_id, v_forma_pix_id, 70.00, 'FINALIZADO');

    -- Criar 2 vendas em Fevereiro 2025
    INSERT INTO pedidos (data, tipo_atendimento_id, forma_pagamento_id, total, status)
    VALUES 
        ('2025-02-10', v_tipo_venda_id, v_forma_pix_id, 180.00, 'FINALIZADO'),
        ('2025-02-20', v_tipo_venda_id, v_forma_dinheiro_id, 250.00, 'FINALIZADO');

    -- Criar 1 DÍZIMO em Fevereiro 2025
    INSERT INTO pedidos (data, cliente_id, tipo_atendimento_id, forma_pagamento_id, total, status)
    VALUES 
        ('2025-02-28', v_cliente_dizimo_id, v_tipo_dizimo_id, v_forma_pix_id, 43.00, 'FINALIZADO');

    RAISE NOTICE 'Dados de teste inseridos com sucesso!';
END $$;

-- ============================================
-- 5. Verificar os dados inseridos
-- ============================================
SELECT 
    'Total de pedidos em 2025' as descricao,
    COUNT(*) as quantidade
FROM pedidos
WHERE EXTRACT(YEAR FROM data) = 2025;

SELECT 
    'Pedidos por tipo' as descricao,
    ta.nome,
    ta.tipo,
    COUNT(*) as quantidade,
    SUM(total) as total_valor
FROM pedidos p
JOIN tipos_atendimento ta ON p.tipo_atendimento_id = ta.id
WHERE EXTRACT(YEAR FROM p.data) = 2025
GROUP BY ta.nome, ta.tipo;

-- Testar a função
SELECT * FROM relatorio_vendas_anual(2025);

