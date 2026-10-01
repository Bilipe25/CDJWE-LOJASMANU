-- =====================================================
-- VIEWS NECESSÁRIAS PARA O SISTEMA PDV
-- Para instalações existentes, prefira ADD_CAMPOS_ENDERECO_MIGRATION.sql.
-- Este arquivo define as views de uma instalação inicial.
-- =====================================================

-- 1. VIEW: vw_pedidos_completos
-- Retorna pedidos com informações completas de cliente e outros dados

CREATE OR REPLACE VIEW vw_pedidos_completos AS
SELECT 
  p.id,
  p.numero,
  p.data,
  p.cliente_id,
  p.endereco_id,
  p.tipo_atendimento_id,
  p.forma_pagamento_id,
  p.desconto_valor,
  p.subtotal,
  p.total,
  p.descricao,
  p.observacao,
  p.status,
  p.created_at AS criado_em,
  p.updated_at AS atualizado_em,
  
  -- Dados do cliente
  c.nome as cliente_nome,
  c.cpf as cliente_cpf,
  c.telefone as cliente_telefone,
  c.email as cliente_email,
  
  -- Dados do endereço
  e.logradouro as endereco_logradouro,
  e.numero as endereco_numero,
  e.complemento as endereco_complemento,
  e.bairro as endereco_bairro,
  e.cidade as endereco_cidade,
  e.estado as endereco_estado,
  e.cep as endereco_cep,
  
  -- Dados do tipo de atendimento
  ta.nome as tipo_atendimento_nome,
  ta.tipo as tipo_atendimento_tipo,
  
  -- Dados da forma de pagamento
  fp.nome as forma_pagamento_nome,
  
  -- Contagem de itens
  (SELECT COUNT(*) FROM itens_pedido WHERE pedido_id = p.id) as total_itens

FROM pedidos p
LEFT JOIN clientes c ON p.cliente_id = c.id
LEFT JOIN enderecos e ON p.endereco_id = e.id
LEFT JOIN tipos_atendimento ta ON p.tipo_atendimento_id = ta.id
LEFT JOIN formas_pagamento fp ON p.forma_pagamento_id = fp.id;

-- Comentário na view
COMMENT ON VIEW vw_pedidos_completos IS 'View com informações completas dos pedidos incluindo dados de cliente, endereço, tipo de atendimento e forma de pagamento';


-- 2. VIEW: vw_itens_pedido_completos
CREATE OR REPLACE VIEW vw_itens_pedido_completos AS
SELECT
  ip.id,
  ip.pedido_id,
  ip.produto_id,
  ip.cor_id,
  ip.quantidade,
  ip.valor_unitario,
  ip.desconto_valor,
  ip.valor_total,
  ip.ordem,
  pr.nome AS produto_nome,
  pr.codigo AS produto_codigo,
  pr.unidade AS produto_unidade,
  pr.valor_base AS produto_valor_base,
  ca.nome AS categoria_nome,
  co.descricao AS cor_descricao,
  co.codigo AS cor_codigo,
  co.linha AS cor_linha
FROM itens_pedido ip
LEFT JOIN produtos pr ON pr.id = ip.produto_id
LEFT JOIN categorias ca ON ca.id = pr.categoria_id
LEFT JOIN cores co ON co.id = ip.cor_id;
