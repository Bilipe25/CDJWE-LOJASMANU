-- Guardas da aplicação P2: aborta integralmente se dados comerciais forem alterados.
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';
LOCK TABLE public.clientes, public.enderecos, public.pedidos, public.itens_pedido, public.pdv_operadores IN SHARE ROW EXCLUSIVE MODE;
CREATE TEMP TABLE p2_antes ON COMMIT DROP AS SELECT
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
    'public.pdv_mutar_pedido(text,jsonb,uuid,uuid,bigint,uuid)'::regprocedure)) AS hash_permissoes;
