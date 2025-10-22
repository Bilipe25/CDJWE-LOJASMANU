-- Adicionar campos completos à tabela enderecos
-- Execute este SQL no Supabase SQL Editor

ALTER TABLE enderecos
ADD COLUMN IF NOT EXISTS numero VARCHAR(20),
ADD COLUMN IF NOT EXISTS complemento VARCHAR(100),
ADD COLUMN IF NOT EXISTS bairro VARCHAR(100),
ADD COLUMN IF NOT EXISTS cidade VARCHAR(100),
ADD COLUMN IF NOT EXISTS estado VARCHAR(2);

-- Comentários para documentação
COMMENT ON COLUMN enderecos.numero IS 'Número do endereço';
COMMENT ON COLUMN enderecos.complemento IS 'Complemento (apto, bloco, etc)';
COMMENT ON COLUMN enderecos.bairro IS 'Bairro';
COMMENT ON COLUMN enderecos.cidade IS 'Cidade';
COMMENT ON COLUMN enderecos.estado IS 'Estado (UF)';
