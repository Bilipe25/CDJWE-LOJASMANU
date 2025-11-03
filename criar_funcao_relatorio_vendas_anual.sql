-- =====================================================
-- FUNÇÃO: relatorio_vendas_anual
-- Cria a função para gerar relatório de vendas anual
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- Primeiro, remove a função se ela já existir
DROP FUNCTION IF EXISTS relatorio_vendas_anual(integer);

-- Cria a função
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

-- Comentário na função
COMMENT ON FUNCTION relatorio_vendas_anual(integer) IS 'Retorna relatório de vendas e despesas (DÍZIMO) agrupado por mês e forma de pagamento para um ano específico';

-- Teste a função
SELECT * FROM relatorio_vendas_anual(2025);

