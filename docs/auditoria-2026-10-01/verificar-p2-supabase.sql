-- Somente leitura sob o mesmo perfil da API. ROLLBACK não altera registros.
BEGIN READ ONLY;
-- Resolve a identidade atual: a conta pode ter sido recriada desde a ativação P0/P1.
SELECT set_config('request.jwt.claim.sub',
  (SELECT id::text FROM auth.users WHERE lower(email)='cdjweltda@gmail.com'),true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE clientes jsonb; produtos jsonb;
BEGIN
  IF NOT public.pdv_acesso(true) THEN RAISE EXCEPTION 'ADMIN existente sem acesso'; END IF;
  SELECT public.pdv_listar_clientes('',NULL,25,0) INTO clientes;
  SELECT public.pdv_listar_produtos('',NULL,25,0) INTO produtos;
  IF (clientes->>'total')::bigint <> (SELECT count(*) FROM public.clientes) OR
     jsonb_array_length(clientes->'clientes') <> least(25,(clientes->>'total')::integer) THEN
    RAISE EXCEPTION 'Paginação de clientes divergente';
  END IF;
  IF (produtos->>'total')::bigint <> (SELECT count(*) FROM public.produtos WHERE ativo) OR
     jsonb_array_length(produtos->'produtos') <> least(25,(produtos->>'total')::integer) THEN
    RAISE EXCEPTION 'Paginação de produtos divergente';
  END IF;
  IF EXISTS(SELECT 1 FROM public.pedidos p JOIN public.enderecos e ON e.id=p.endereco_id WHERE p.endereco_snapshot IS NULL) THEN
    RAISE EXCEPTION 'Pedido com endereço conhecido sem cópia histórica';
  END IF;
  IF has_function_privilege('anon','public.pdv_listar_clientes(text,boolean,integer,integer)','EXECUTE') OR
     has_function_privilege('anon','public.pdv_listar_produtos(text,uuid,integer,integer)','EXECUTE') OR
     has_table_privilege('authenticated','public.pedidos','UPDATE') THEN
    RAISE EXCEPTION 'Permissões da API divergentes';
  END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
DO $$ BEGIN
  IF public.pdv_acesso() OR (SELECT count(*) FROM public.clientes)>0 THEN
    RAISE EXCEPTION 'Conta não habilitada acessa dados';
  END IF;
  BEGIN
    PERFORM public.pdv_listar_clientes('',NULL,25,0);
    RAISE EXCEPTION 'Consulta permitiu conta não habilitada';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
ROLLBACK;
SELECT 'P2 APROVADO' AS verificacao,
  'ADMIN lê clientes/produtos com paginação coerente; cópias históricas preenchidas; anônimo e conta não habilitada sem acesso; escrita direta bloqueada.' AS resultado;
