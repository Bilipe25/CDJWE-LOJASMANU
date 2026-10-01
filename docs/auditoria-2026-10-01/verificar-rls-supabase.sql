BEGIN READ ONLY;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','a20233c5-c7fa-4003-b072-5686a6811c58',true);
DO $$ DECLARE lista jsonb; estatisticas jsonb; BEGIN
  IF NOT public.pdv_acesso(true) THEN RAISE EXCEPTION 'ADMIN ativo sem acesso'; END IF;
  SELECT public.pdv_listar_pedidos('{}',1,0) INTO lista;
  SELECT public.pdv_estatisticas_pedidos('{}') INTO estatisticas;
  IF (lista->>'total')::bigint <> (estatisticas->>'total')::bigint THEN RAISE EXCEPTION 'Lista e indicadores divergentes'; END IF;
  IF (SELECT count(*) FROM public.clientes)=0 OR (SELECT count(*) FROM public.vw_clientes_completos)=0 OR (SELECT count(*) FROM public.vw_itens_pedido_completos)=0 THEN RAISE EXCEPTION 'Leitura autorizada vazia'; END IF;
  PERFORM public.pdv_estatisticas_clientes();
  PERFORM public.pdv_totais_clientes(ARRAY(SELECT id FROM public.clientes LIMIT 1));
  IF has_table_privilege(current_user,'public.pdv_operadores','INSERT,UPDATE,DELETE') THEN RAISE EXCEPTION 'API permite alterar papéis'; END IF;
  IF has_function_privilege(current_user,'public.duplicar_pedido(uuid)','EXECUTE') OR has_function_privilege(current_user,'public.obter_proximo_numero_pedido()','EXECUTE') THEN RAISE EXCEPTION 'RPC legada permite escrita direta'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
DO $$ BEGIN
  IF public.pdv_acesso() OR (SELECT count(*) FROM public.clientes)>0 OR (SELECT count(*) FROM public.vw_pedidos_completos)>0 THEN RAISE EXCEPTION 'Conta não habilitada acessa dados'; END IF;
END $$;
ROLLBACK;
SELECT 'APROVADO' AS verificacao,'ADMIN lê views/lista/indicadores; conta não habilitada não lê dados; API não concede papéis nem executa escrita legada. Teste somente leitura.' AS resultado;