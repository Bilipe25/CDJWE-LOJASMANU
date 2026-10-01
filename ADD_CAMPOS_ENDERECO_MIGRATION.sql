-- Adicionar campos completos à tabela enderecos
-- Execute este SQL no Supabase SQL Editor

BEGIN;

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

-- Acrescentar campos ausentes ao final da view, preservando suas colunas e dependências.
-- A aplicação também consulta enderecos pelo ID do pedido e funciona com views antigas.
DO $$
DECLARE
  definicao TEXT;
  campo TEXT;
BEGIN
  IF to_regclass('public.vw_pedidos_completos') IS NOT NULL THEN
    FOREACH campo IN ARRAY ARRAY['numero', 'complemento', 'bairro', 'cidade', 'estado'] LOOP
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'vw_pedidos_completos'
          AND column_name = 'endereco_' || campo
      ) THEN
        definicao := rtrim(pg_get_viewdef('public.vw_pedidos_completos'::regclass, true), E';\n\r ');
        EXECUTE format(
          'CREATE OR REPLACE VIEW public.vw_pedidos_completos AS SELECT pedido.*, endereco.%I AS %I FROM (%s) pedido LEFT JOIN public.enderecos endereco ON endereco.id = pedido.endereco_id',
          campo, 'endereco_' || campo, definicao
        );
      END IF;
    END LOOP;
  END IF;
END $$;

COMMIT;
