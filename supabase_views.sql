-- =====================================================
-- VIEWS NECESSÁRIAS PARA O SISTEMA PDV
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- 1. VIEW: vw_pedidos_completos
-- Retorna pedidos com informações completas de cliente e outros dados
DROP VIEW IF EXISTS vw_pedidos_completos CASCADE;

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
  p.criado_em,
  p.atualizado_em,
  
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


do com informações de produtos e cores
DROP VIEW IF EXISTS vw_itens_pedido_completos CASCADE;

CREATE OR REPLACE VIEW vw_itens_pedido_completos AS
SELECT 
  ip.id,
  ip.pedido_id,
  ip.
