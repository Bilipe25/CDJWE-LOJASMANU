-- Adicionar coluna telefone_contato na tabela pedidos
-- Execute este SQL no Supabase SQL Editor

ALTER TABLE pedidos 
ADD COLUMN IF NOT EXISTS telefone_contato VARCHAR(20);

-- Adicionar comentário na coluna
COMMENT ON COLUMN pedidos.telefone_contato IS 'Telefone de contato para o pedido';

-- Verificar se foi adicionado corretamente
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'pedidos' AND column_name = 'telefone_contato';
