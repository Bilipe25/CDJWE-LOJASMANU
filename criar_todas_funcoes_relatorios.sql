-- =====================================================
-- TODAS AS FUNÇÕES DE RELATÓRIOS
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- ============================================
-- 1. FUNÇÃO: relatorio_vendas_periodo
-- ============================================
DROP FUNCTION IF EXISTS relatorio_vendas_periodo(date, date);

CREATE OR REPLACE FUNCTION relatorio_vendas_periodo(
    data_inicio date,
    data_fim date
)
RETURNS TABLE (
    data date,
    total_pedidos bigint,
    total_itens bigint,
    valor_total numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.data,
        COUNT(DISTINCT p.id)::bigint as total_pedidos,
        COALESCE(SUM((
            SELECT COUNT(*) 
            FROM itens_pedido ip 
            WHERE ip.pedido_id = p.id
        )), 0)::bigint as total_itens,
        COALESCE(SUM(p.total), 0) as valor_total
    FROM pedidos p
    INNER JOIN tipos_atendimento ta ON p.tipo_atendimento_id = ta.id
    WHERE p.data BETWEEN data_inicio AND data_fim
      AND p.status = 'FINALIZADO'
      AND ta.tipo = 'ENTRADA'
    GROUP BY p.data
    ORDER BY p.data;
END;
$$;

COMMENT ON FUNCTION relatorio_vendas_periodo(date, date) IS 'Retorna vendas agrupadas por data em um período (apenas ENTRADA)';


-- ============================================
-- 2. FUNÇÃO: top_produtos_vendidos
-- ============================================
DROP FUNCTION IF EXISTS top_produtos_vendidos(date, date, integer);

CREATE OR REPLACE FUNCTION top_produtos_vendidos(
    data_inicio date DEFAULT NULL,
    data_fim date DEFAULT NULL,
    limite integer DEFAULT 10
)
RETURNS TABLE (
    produto_id uuid,
    produto_nome character varying,
    categoria_nome character varying,
    quantidade_vendida numeric,
    total_vendas bigint,
    valor_total numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as produto_id,
        p.nome::character varying as produto_nome,
        COALESCE(c.nome, 'Sem categoria')::character varying as categoria_nome,
        COALESCE(SUM(ip.quantidade), 0) as quantidade_vendida,
        COUNT(DISTINCT ped.id)::bigint as total_vendas,
        COALESCE(SUM(ip.valor_total), 0) as valor_total
    FROM produtos p
    LEFT JOIN categorias c ON p.categoria_id = c.id
    LEFT JOIN itens_pedido ip ON p.id = ip.produto_id
    LEFT JOIN pedidos ped ON ip.pedido_id = ped.id
    LEFT JOIN tipos_atendimento ta ON ped.tipo_atendimento_id = ta.id
    WHERE 
        (data_inicio IS NULL OR ped.data >= data_inicio)
        AND (data_fim IS NULL OR ped.data <= data_fim)
        AND ped.status = 'FINALIZADO'
        AND ta.tipo = 'ENTRADA'
    GROUP BY p.id, p.nome, c.nome
    HAVING SUM(ip.quantidade) > 0
    ORDER BY valor_total DESC, quantidade_vendida DESC
    LIMIT limite;
END;
$$;

COMMENT ON FUNCTION top_produtos_vendidos(date, date, integer) IS 'Retorna os produtos mais vendidos em um período (apenas ENTRADA)';


-- ============================================
-- 3. FUNÇÃO: relatorio_vendas_anual
-- ============================================
DROP FUNCTION IF EXISTS relatorio_vendas_anual(integer);

CREATE OR REPLACE FUNCTION relatorio_vendas_anual(ano integer)
RETURNS TABLE (
    forma_pagamento_nome character varying,
    mes integer,
    total_vendas numeric,
    total_despesas numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (CASE 
            WHEN ta.tipo = 'SAIDA' AND c.nome = 'DIZIMO' THEN 'DIZIMO'
            ELSE COALESCE(fp.nome, 'Não especificado')
        END)::character varying as forma_pagamento_nome,
        EXTRACT(MONTH FROM p.data)::INTEGER as mes,
        SUM(CASE WHEN ta.tipo = 'ENTRADA' THEN p.total ELSE 0 END) as total_vendas,
        SUM(CASE WHEN ta.tipo = 'SAIDA' THEN p.total ELSE 0 END) as total_despesas
    FROM pedidos p
    INNER JOIN tipos_atendimento ta ON p.tipo_atendimento_id = ta.id
    LEFT JOIN formas_pagamento fp ON p.forma_pagamento_id = fp.id
    LEFT JOIN clientes c ON p.cliente_id = c.id
    WHERE EXTRACT(YEAR FROM p.data) = ano
      AND p.status = 'FINALIZADO'
    GROUP BY 
        EXTRACT(MONTH FROM p.data), 
        CASE 
            WHEN ta.tipo = 'SAIDA' AND c.nome = 'DIZIMO' THEN 'DIZIMO'
            ELSE COALESCE(fp.nome, 'Não especificado')
        END
    ORDER BY mes, forma_pagamento_nome;
END;
$$;

COMMENT ON FUNCTION relatorio_vendas_anual(integer) IS 'Retorna relatório de vendas e despesas (DÍZIMO) agrupado por mês e forma de pagamento para um ano específico';


-- ============================================
-- TESTES
-- ============================================

-- Teste 1: Relatório de vendas por período (últimos 30 dias)
SELECT * FROM relatorio_vendas_periodo(
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE
);

-- Teste 2: Top 10 produtos mais vendidos
SELECT * FROM top_produtos_vendidos(NULL, NULL, 10);

-- Teste 3: Relatório anual de 2025
SELECT * FROM relatorio_vendas_anual(2025);

-- Verificar se as funções foram criadas
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%relatorio%'
  OR routine_name LIKE '%top_produtos%';

