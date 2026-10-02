DO $$
DECLARE antes record; depois record;
BEGIN
  SELECT * INTO antes FROM p2_antes;
  SELECT
    (SELECT count(*) FROM public.clientes) AS clientes,
    (SELECT count(*) FROM public.enderecos) AS enderecos,
    (SELECT count(*) FROM public.pedidos) AS pedidos,
    (SELECT count(*) FROM public.itens_pedido) AS itens,
    (SELECT md5(coalesce(string_agg(to_jsonb(c)::text,'' ORDER BY id),'')) FROM public.clientes c) AS hash_clientes,
    (SELECT md5(coalesce(string_agg((to_jsonb(e)-ARRAY['principal','ativo','updated_at'])::text,'' ORDER BY id),'')) FROM public.enderecos e) AS hash_enderecos,
    (SELECT md5(coalesce(string_agg((to_jsonb(p)-'endereco_snapshot')::text,'' ORDER BY id),'')) FROM public.pedidos p) AS hash_pedidos,
    (SELECT md5(coalesce(string_agg(to_jsonb(i)::text,'' ORDER BY id),'')) FROM public.itens_pedido i) AS hash_itens,
    (SELECT md5(coalesce(string_agg(to_jsonb(o)::text,'' ORDER BY user_id),'')) FROM public.pdv_operadores o) AS hash_operadores,
    (SELECT md5(string_agg(coalesce(proacl::text,'NULL'),'' ORDER BY proname)) FROM pg_proc WHERE oid IN (
      'public.pdv_salvar_cliente(jsonb,uuid)'::regprocedure,
      'public.pdv_mutar_pedido(text,jsonb,uuid,uuid,bigint,uuid)'::regprocedure)) AS hash_permissoes
  INTO depois;
  IF to_jsonb(antes) IS DISTINCT FROM to_jsonb(depois) THEN
    RAISE EXCEPTION 'Migração cancelada: registros comerciais, metadados ou permissões foram alterados';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_class WHERE oid IN ('public.clientes'::regclass,'public.enderecos'::regclass,'public.pedidos'::regclass,'public.itens_pedido'::regclass) AND NOT relrowsecurity) THEN
    RAISE EXCEPTION 'RLS deve continuar habilitado';
  END IF;
  IF has_function_privilege('anon','public.pdv_listar_clientes(text,boolean,integer,integer)','EXECUTE') OR
     has_function_privilege('anon','public.pdv_listar_produtos(text,uuid,integer,integer)','EXECUTE') THEN
    RAISE EXCEPTION 'Consultas P2 não podem aceitar acesso anônimo';
  END IF;
  IF has_table_privilege('authenticated','public.clientes','INSERT') OR
     has_table_privilege('authenticated','public.pedidos','UPDATE') OR
     has_table_privilege('authenticated','public.itens_pedido','DELETE') THEN
    RAISE EXCEPTION 'Escritas diretas devem continuar bloqueadas';
  END IF;
END $$;
SELECT 'P2 APLICADO; DADOS E PERMISSOES PRESERVADOS' AS resultado,
  clientes, enderecos, pedidos, itens,
  (SELECT count(*) FROM public.pedidos WHERE endereco_snapshot IS NOT NULL) AS pedidos_com_snapshot,
  (SELECT count(*) FROM public.pdv_operadores WHERE ativo) AS operadores_ativos
FROM p2_antes;
