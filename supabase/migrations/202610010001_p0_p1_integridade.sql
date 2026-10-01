-- Aplicar depois de ADD_CAMPOS_ENDERECO_MIGRATION.sql e ADD_TELEFONE_CONTATO_MIGRATION.sql.
-- Não cria contas nem concede acesso a usuários existentes automaticamente.
BEGIN;

ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS telefone_contato text;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS versao bigint NOT NULL DEFAULT 1;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS finalizado_em timestamptz;

DO $$ DECLARE definicao text; BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vw_pedidos_completos' AND column_name='versao') THEN
    SELECT pg_get_viewdef('public.vw_pedidos_completos'::regclass,true) INTO definicao;
    EXECUTE 'CREATE OR REPLACE VIEW public.vw_pedidos_completos AS SELECT v.*, p.versao FROM (' || rtrim(definicao,'; ') || ') v JOIN public.pedidos p ON p.id=v.id';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.pdv_operadores (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  papel text NOT NULL CHECK (papel IN ('ADMIN', 'OPERADOR')),
  ativo boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS public.pdv_requisicoes (
  user_id uuid NOT NULL REFERENCES auth.users(id),
  chave uuid NOT NULL,
  dados jsonb NOT NULL,
  resultado jsonb NOT NULL,
  PRIMARY KEY (user_id, chave)
);

CREATE OR REPLACE FUNCTION public.pdv_acesso(p_admin boolean DEFAULT false)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.pdv_operadores WHERE user_id = auth.uid() AND ativo
      AND (NOT p_admin OR papel = 'ADMIN')
  );
$$;
REVOKE ALL ON FUNCTION public.pdv_acesso(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pdv_acesso(boolean) TO authenticated;

ALTER TABLE public.pdv_operadores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pdv_operador_proprio ON public.pdv_operadores;
CREATE POLICY pdv_operador_proprio ON public.pdv_operadores FOR SELECT TO authenticated USING (user_id = auth.uid());
REVOKE ALL ON public.pdv_operadores FROM anon, authenticated;
GRANT SELECT ON public.pdv_operadores TO authenticated;
ALTER TABLE public.pdv_requisicoes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pdv_requisicoes FROM anon, authenticated;

-- Restrição adicional preserva políticas existentes mais estritas. Escritas nas
-- quatro entidades principais passam exclusivamente pelas funções abaixo.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['clientes','enderecos','pedidos','itens_pedido','produtos','categorias','cores','formas_pagamento','tipos_atendimento','configuracoes_empresa'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS pdv_acesso_obrigatorio ON public.%I', t);
    EXECUTE format('CREATE POLICY pdv_acesso_obrigatorio ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.pdv_acesso()) WITH CHECK (public.pdv_acesso())', t);
    EXECUTE format('DROP POLICY IF EXISTS pdv_leitura ON public.%I', t);
    EXECUTE format('CREATE POLICY pdv_leitura ON public.%I FOR SELECT TO authenticated USING (public.pdv_acesso())', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    IF t IN ('clientes','enderecos','pedidos','itens_pedido') THEN
      EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON public.%I FROM authenticated', t);
    ELSE
      EXECUTE format('DROP POLICY IF EXISTS pdv_escrita ON public.%I', t);
      EXECUTE format('CREATE POLICY pdv_escrita ON public.%I FOR ALL TO authenticated USING (public.pdv_acesso()) WITH CHECK (public.pdv_acesso())', t);
      EXECUTE format('GRANT INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    END IF;
  END LOOP;
  -- Tabelas de importação antigas também contêm CPF, endereço e dados de venda.
  -- Não são usadas pela aplicação; manutenção continua pelo proprietário/service_role.
  FOREACH t IN ARRAY ARRAY['tblClientes','tblPedidos','tblItensPedidos','tblProdutos','tblCores'] LOOP
    IF to_regclass(format('public.%I',t)) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated',t);
  END LOOP;
  -- Views existentes não devem usar as permissões do proprietário para contornar RLS.
  FOR t IN SELECT viewname FROM pg_views WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true)', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
  END LOOP;
END $$;

-- Fecha as RPCs legadas de escrita/relatório ao papel anônimo.
DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT p.oid::regprocedure AS assinatura, p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('duplicar_pedido','obter_proximo_numero_pedido','relatorio_vendas_anual','relatorio_vendas_periodo','top_produtos_vendidos') LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', f.assinatura);
    IF f.proname NOT IN ('duplicar_pedido','obter_proximo_numero_pedido') THEN
      EXECUTE format('ALTER FUNCTION %s SECURITY INVOKER',f.assinatura);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f.assinatura);
    END IF;
  END LOOP;
END $$;
-- A duplicação e numeração legadas deixam de ser caminhos diretos de escrita.
REVOKE EXECUTE ON FUNCTION public.duplicar_pedido(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.obter_proximo_numero_pedido() FROM authenticated;

CREATE OR REPLACE FUNCTION public.pdv_salvar_cliente(p_dados jsonb, p_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE c public.clientes; e uuid; a jsonb;
BEGIN
  IF NOT public.pdv_acesso() THEN RAISE EXCEPTION 'Conta sem acesso ao PDV' USING ERRCODE='42501'; END IF;
  IF p_id IS NULL THEN
    IF coalesce(btrim(p_dados->>'nome'), '') = '' THEN RAISE EXCEPTION 'Nome obrigatório'; END IF;
    INSERT INTO public.clientes(nome,cpf,telefone,email,ativo)
    VALUES (btrim(p_dados->>'nome'), p_dados->>'cpf',p_dados->>'telefone',p_dados->>'email',coalesce((p_dados->>'ativo')::boolean,true)) RETURNING * INTO c;
  ELSE
    SELECT * INTO c FROM public.clientes WHERE id=p_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Cliente não encontrado'; END IF;
    c := jsonb_populate_record(c, p_dados - ARRAY['id','endereco']);
    IF coalesce(btrim(c.nome),'') = '' THEN RAISE EXCEPTION 'Nome obrigatório'; END IF;
    UPDATE public.clientes SET nome=btrim(c.nome),cpf=c.cpf,telefone=c.telefone,email=c.email,ativo=c.ativo,updated_at=now() WHERE id=p_id RETURNING * INTO c;
  END IF;
  IF p_dados ? 'endereco' AND p_dados->'endereco' <> 'null'::jsonb THEN
    a := p_dados->'endereco';
    IF coalesce(btrim(a->>'logradouro'),'')='' THEN RAISE EXCEPTION 'Logradouro obrigatório'; END IF;
    SELECT id INTO e FROM public.enderecos WHERE cliente_id=c.id ORDER BY principal DESC NULLS LAST,id LIMIT 1 FOR UPDATE;
    IF e IS NULL THEN
      INSERT INTO public.enderecos(cliente_id,logradouro,numero,complemento,bairro,cidade,estado,cep,principal)
      VALUES(c.id,a->>'logradouro',a->>'numero',a->>'complemento',a->>'bairro',a->>'cidade',a->>'estado',a->>'cep',coalesce((a->>'principal')::boolean,true));
    ELSE
      UPDATE public.enderecos SET logradouro=a->>'logradouro',numero=a->>'numero',complemento=a->>'complemento',bairro=a->>'bairro',cidade=a->>'cidade',estado=a->>'estado',cep=a->>'cep',principal=coalesce((a->>'principal')::boolean,principal) WHERE id=e;
    END IF;
  END IF;
  RETURN to_jsonb(c);
END $$;

CREATE OR REPLACE FUNCTION public.pdv_mutar_pedido(
  p_acao text, p_dados jsonb DEFAULT '{}'::jsonb, p_id uuid DEFAULT NULL,
  p_chave uuid DEFAULT NULL, p_versao bigint DEFAULT NULL, p_item_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  p public.pedidos; original public.pedidos; i public.itens_pedido;
  entrada jsonb; lista jsonb; resposta jsonb; anterior public.pdv_requisicoes;
  soma numeric := 0; bruto numeric; desconto numeric; q numeric; preco numeric; tipo text;
  usuario uuid := auth.uid(); identidade jsonb := jsonb_build_object('acao',p_acao,'id',p_id,'dados',p_dados);
BEGIN
  IF NOT public.pdv_acesso(p_acao='excluir') THEN RAISE EXCEPTION 'Operação não autorizada' USING ERRCODE='42501'; END IF;
  IF p_acao NOT IN ('criar','editar','excluir','cancelar','finalizar','duplicar','adicionar_item','atualizar_item','remover_item') THEN RAISE EXCEPTION 'Operação inválida'; END IF;
  IF p_acao IN ('criar','duplicar') THEN
    IF p_chave IS NULL THEN RAISE EXCEPTION 'Chave de reenvio obrigatória'; END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended(usuario::text || p_chave::text,0));
    SELECT * INTO anterior FROM public.pdv_requisicoes WHERE user_id=usuario AND chave=p_chave;
    IF FOUND THEN
      IF anterior.dados <> identidade THEN RAISE EXCEPTION 'Esta requisição já foi utilizada com outros dados'; END IF;
      RETURN anterior.resultado;
    END IF;
  END IF;
  IF p_item_id IS NOT NULL THEN
    SELECT * INTO i FROM public.itens_pedido WHERE id=p_item_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Item não encontrado'; END IF;
    p_id := i.pedido_id;
  END IF;
  IF p_acao <> 'criar' THEN
    SELECT * INTO p FROM public.pedidos WHERE id=p_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
    IF p_versao IS NULL OR p.versao <> p_versao THEN RAISE EXCEPTION 'Pedido alterado por outro operador. Recarregue antes de salvar.' USING ERRCODE='40001'; END IF;
    IF p_acao <> 'duplicar' AND p.status IN ('CANCELADO','FINALIZADO') THEN RAISE EXCEPTION 'Pedido encerrado não pode ser alterado'; END IF;
  END IF;
  IF p_acao='excluir' THEN
    DELETE FROM public.itens_pedido WHERE pedido_id=p.id;
    DELETE FROM public.pedidos WHERE id=p.id;
    RETURN jsonb_build_object('success',true);
  END IF;
  IF p_acao IN ('cancelar','finalizar') THEN
    IF p.status NOT IN ('PENDENTE','CONFIRMADO') THEN RAISE EXCEPTION 'Transição de status inválida'; END IF;
    IF p_acao='finalizar' THEN
      SELECT ta.tipo INTO tipo FROM public.tipos_atendimento ta WHERE ta.id=p.tipo_atendimento_id;
      IF NOT EXISTS(SELECT 1 FROM public.itens_pedido WHERE pedido_id=p.id) THEN
        IF tipo IS DISTINCT FROM 'SAIDA' THEN RAISE EXCEPTION 'Adicione itens antes de finalizar'; END IF;
        soma := coalesce(p.subtotal,p.total,0);
      ELSE
        IF EXISTS(SELECT 1 FROM public.itens_pedido WHERE pedido_id=p.id AND
          (quantidade IS NULL OR quantidade < 0.001 OR quantidade::text IN ('NaN','Infinity','-Infinity') OR
           valor_unitario IS NULL OR valor_unitario < 0 OR valor_unitario::text IN ('NaN','Infinity','-Infinity') OR
           coalesce(desconto_valor,0) < 0 OR coalesce(desconto_valor,0) > round(quantidade*valor_unitario,2))) THEN
          RAISE EXCEPTION 'Pedido possui itens com valores inválidos';
        END IF;
        UPDATE public.itens_pedido SET valor_total=round(round(quantidade*valor_unitario,2)-coalesce(desconto_valor,0),2) WHERE pedido_id=p.id;
        SELECT sum(valor_total) INTO soma FROM public.itens_pedido WHERE pedido_id=p.id;
      END IF;
      desconto := coalesce(p.desconto_valor,0);
      IF soma < 0 OR soma::text IN ('NaN','Infinity','-Infinity') OR desconto < 0 OR desconto > soma THEN RAISE EXCEPTION 'Valores inválidos para finalizar o pedido'; END IF;
      p.subtotal := round(soma,2); p.total := round(soma-desconto,2);
    END IF;
    UPDATE public.pedidos SET status=CASE WHEN p_acao='cancelar' THEN 'CANCELADO' ELSE 'FINALIZADO' END,
      subtotal=p.subtotal,total=p.total,desconto_valor=p.desconto_valor,
      finalizado_em=CASE WHEN p_acao='finalizar' THEN now() ELSE NULL END,updated_at=now(),updated_by=usuario,versao=versao+1 WHERE id=p.id RETURNING * INTO p;
    RETURN to_jsonb(p);
  END IF;
  IF p_acao='duplicar' THEN
    original := p;
    SELECT coalesce(jsonb_agg(jsonb_build_object('produto_id',produto_id,'cor_id',cor_id,'quantidade',quantidade,'valor_unitario',valor_unitario,'desconto_valor',desconto_valor,'ordem',ordem) ORDER BY ordem),'[]') INTO lista FROM public.itens_pedido WHERE pedido_id=p.id;
    p.id := NULL; p.numero := NULL; p.data := (now() AT TIME ZONE 'America/Fortaleza')::date; p.status := 'PENDENTE'; p.finalizado_em := NULL;
  ELSIF p_acao='criar' THEN
    p := jsonb_populate_record(NULL::public.pedidos, p_dados - ARRAY['id','numero','itens','total','subtotal','versao','created_by','updated_by']);
    p.status := coalesce(p.status,'PENDENTE');
    IF p.status NOT IN ('PENDENTE','CONFIRMADO') THEN RAISE EXCEPTION 'Status inicial inválido'; END IF;
    lista := coalesce(p_dados->'itens','[]');
  ELSIF p_acao='editar' THEN
    IF p_dados ? 'status' AND p_dados->>'status' IS DISTINCT FROM p.status AND NOT(p.status='PENDENTE' AND p_dados->>'status'='CONFIRMADO') THEN RAISE EXCEPTION 'Use a operação de finalizar ou cancelar'; END IF;
    IF p_dados ? 'cliente_id' AND (p_dados->>'cliente_id')::uuid IS DISTINCT FROM p.cliente_id AND NOT p_dados ? 'endereco_id' THEN p.endereco_id := NULL; END IF;
    p := jsonb_populate_record(p,p_dados - ARRAY['id','numero','itens','total','subtotal','versao','created_by','updated_by']);
    lista := p_dados->'itens';
  END IF;
  IF p.status NOT IN ('PENDENTE','CONFIRMADO') OR p.status IS NULL THEN RAISE EXCEPTION 'Status inválido'; END IF;
  IF p.endereco_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.enderecos WHERE id=p.endereco_id AND cliente_id=p.cliente_id) THEN RAISE EXCEPTION 'Endereço não pertence ao cliente'; END IF;
  IF p_acao IN ('criar','duplicar') THEN
    -- Também protege instalações cuja RPC legada usa MAX(numero) + 1.
    PERFORM pg_advisory_xact_lock(hashtextextended('pdv:numeracao',0));
    p.numero := public.obter_proximo_numero_pedido();
    IF p.numero IS NULL THEN RAISE EXCEPTION 'Não foi possível gerar o número do pedido'; END IF;
    INSERT INTO public.pedidos(numero,data,cliente_id,endereco_id,tipo_atendimento_id,forma_pagamento_id,telefone_contato,desconto_valor,subtotal,total,descricao,observacao,status,created_by,updated_by)
    VALUES(p.numero,p.data,p.cliente_id,p.endereco_id,p.tipo_atendimento_id,p.forma_pagamento_id,p.telefone_contato,0,0,0,p.descricao,p.observacao,p.status,usuario,usuario) RETURNING id,versao INTO p.id,p.versao;
  END IF;
  IF p_acao='adicionar_item' THEN lista := jsonb_build_array(p_dados->'item'); END IF;
  IF p_acao='atualizar_item' THEN
    SELECT * INTO i FROM public.itens_pedido WHERE id=p_item_id FOR UPDATE;
    i := jsonb_populate_record(i,p_dados - ARRAY['id','pedido_id','valor_total']);
    lista := jsonb_build_array(to_jsonb(i));
  END IF;
  IF p_acao='remover_item' THEN DELETE FROM public.itens_pedido WHERE id=p_item_id AND pedido_id=p.id; END IF;
  IF lista IS NOT NULL THEN
    IF jsonb_typeof(lista) <> 'array' THEN RAISE EXCEPTION 'Lista de itens inválida'; END IF;
    -- Valida tudo antes de substituir. Qualquer falha posterior desfaz a transação.
    FOR entrada IN SELECT value FROM jsonb_array_elements(lista) LOOP
      q := (entrada->>'quantidade')::numeric; preco := (entrada->>'valor_unitario')::numeric; desconto := coalesce((entrada->>'desconto_valor')::numeric,0);
      bruto := round(q*preco,2);
      IF q IS NULL OR q < 0.001 OR preco IS NULL OR preco < 0 OR desconto < 0 OR desconto > bruto OR q::text IN ('NaN','Infinity','-Infinity') OR preco::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Quantidade, preço ou desconto do item inválido'; END IF;
      IF p_acao='atualizar_item' THEN
        UPDATE public.itens_pedido SET quantidade=q,valor_unitario=preco,desconto_valor=desconto,valor_total=round(bruto-desconto,2),cor_id=i.cor_id,updated_at=now() WHERE id=p_item_id RETURNING * INTO i;
      END IF;
    END LOOP;
    IF p_acao IN ('criar','duplicar','editar') THEN
      -- Evita desconto antigo maior que o subtotal temporário em triggers legados.
      UPDATE public.pedidos SET desconto_valor=0 WHERE id=p.id;
      DELETE FROM public.itens_pedido WHERE pedido_id=p.id;
    END IF;
    IF p_acao <> 'atualizar_item' THEN
      FOR entrada IN SELECT value FROM jsonb_array_elements(lista) LOOP
        INSERT INTO public.itens_pedido(pedido_id,produto_id,cor_id,quantidade,valor_unitario,desconto_valor,valor_total,ordem)
        VALUES(p.id,(entrada->>'produto_id')::uuid,(entrada->>'cor_id')::uuid,(entrada->>'quantidade')::numeric,(entrada->>'valor_unitario')::numeric,coalesce((entrada->>'desconto_valor')::numeric,0),round(round((entrada->>'quantidade')::numeric*(entrada->>'valor_unitario')::numeric,2)-coalesce((entrada->>'desconto_valor')::numeric,0),2),coalesce((entrada->>'ordem')::integer,0)) RETURNING * INTO i;
      END LOOP;
    END IF;
  END IF;
  SELECT coalesce(sum(round(round(quantidade*valor_unitario,2)-coalesce(desconto_valor,0),2)),0) INTO soma FROM public.itens_pedido WHERE pedido_id=p.id;
  SELECT ta.tipo INTO tipo FROM public.tipos_atendimento ta WHERE ta.id=p.tipo_atendimento_id;
  IF tipo='SAIDA' AND NOT EXISTS(SELECT 1 FROM public.itens_pedido WHERE pedido_id=p.id) THEN
    soma := coalesce((p_dados->>'subtotal')::numeric,(p_dados->>'total')::numeric,p.subtotal,0);
    IF soma < 0 THEN RAISE EXCEPTION 'Valor de saída inválido'; END IF;
  ELSIF NOT EXISTS(SELECT 1 FROM public.itens_pedido WHERE pedido_id=p.id) THEN
    RAISE EXCEPTION 'Adicione ao menos um item';
  END IF;
  desconto := coalesce(p.desconto_valor,0);
  IF desconto < 0 OR desconto > soma THEN RAISE EXCEPTION 'Desconto geral superior ao subtotal'; END IF;
  UPDATE public.pedidos SET data=p.data,cliente_id=p.cliente_id,endereco_id=p.endereco_id,tipo_atendimento_id=p.tipo_atendimento_id,forma_pagamento_id=p.forma_pagamento_id,telefone_contato=p.telefone_contato,descricao=p.descricao,observacao=p.observacao,status=p.status,desconto_valor=round(desconto,2),subtotal=round(soma,2),total=round(soma-desconto,2),updated_at=now(),updated_by=usuario,versao=CASE WHEN p_acao IN ('criar','duplicar') THEN versao ELSE versao+1 END WHERE id=p.id RETURNING * INTO p;
  resposta := CASE WHEN p_acao IN ('adicionar_item','atualizar_item') THEN to_jsonb(i) ELSE to_jsonb(p) END;
  IF p_acao IN ('criar','duplicar') THEN INSERT INTO public.pdv_requisicoes VALUES(usuario,p_chave,identidade,resposta); END IF;
  RETURN resposta;
END $$;

-- A lista e os indicadores compartilham filtros; a busca é literal, inclusive
-- apóstrofos, percentuais e números fora da faixa de um integer.
CREATE OR REPLACE FUNCTION public.pdv_filtrar_pedidos(p_filtros jsonb DEFAULT '{}')
RETURNS SETOF public.vw_pedidos_completos LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, pg_temp AS $$
  SELECT v.* FROM public.vw_pedidos_completos v WHERE public.pdv_acesso() AND
    (coalesce(p_filtros->>'status','')='' OR status=p_filtros->>'status') AND
    (coalesce(p_filtros->>'dataInicio','')='' OR data >= (p_filtros->>'dataInicio')::date) AND
    (coalesce(p_filtros->>'dataFim','')='' OR data <= (p_filtros->>'dataFim')::date) AND
    (coalesce(p_filtros->>'formaPagamentoId','')='' OR forma_pagamento_id=(p_filtros->>'formaPagamentoId')::uuid) AND
    (coalesce(p_filtros->>'clienteId','')='' OR cliente_id=(p_filtros->>'clienteId')::uuid) AND
    (CASE WHEN coalesce(p_filtros->>'tipoAtendimento','')='' THEN tipo_atendimento_tipo IS DISTINCT FROM 'SAIDA'
      WHEN p_filtros->>'tipoAtendimento'='SEM_TIPO' THEN tipo_atendimento_tipo IS NULL ELSE tipo_atendimento_tipo=p_filtros->>'tipoAtendimento' END) AND
    (btrim(coalesce(p_filtros->>'search',''))='' OR numero::text=btrim(p_filtros->>'search') OR
      strpos(lower(coalesce(cliente_nome,'')),lower(btrim(p_filtros->>'search'))) > 0);
$$;

CREATE OR REPLACE FUNCTION public.pdv_listar_pedidos(p_filtros jsonb DEFAULT '{}',p_limite integer DEFAULT 50,p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE resultado jsonb;
BEGIN
  IF NOT public.pdv_acesso() THEN RAISE EXCEPTION 'Conta sem acesso' USING ERRCODE='42501'; END IF;
  IF p_limite < 1 OR p_limite > 10000 OR p_offset < 0 THEN RAISE EXCEPTION 'Paginação inválida'; END IF;
  WITH filtrados AS MATERIALIZED (SELECT * FROM public.pdv_filtrar_pedidos(p_filtros)),
  pagina AS (SELECT * FROM filtrados ORDER BY data DESC,id DESC LIMIT p_limite OFFSET p_offset)
  SELECT jsonb_build_object('total',(SELECT count(*) FROM filtrados),'pedidos',
    coalesce((SELECT jsonb_agg(to_jsonb(pagina) ORDER BY data DESC,id DESC) FROM pagina),'[]'::jsonb)) INTO resultado;
  RETURN resultado;
END $$;

CREATE OR REPLACE FUNCTION public.pdv_estatisticas_pedidos(p_filtros jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE resultado jsonb;
BEGIN
  IF NOT public.pdv_acesso() THEN RAISE EXCEPTION 'Conta sem acesso' USING ERRCODE='42501'; END IF;
  SELECT jsonb_build_object(
    'total',count(*), 'pendentes',count(*) FILTER(WHERE status='PENDENTE'),
    'valorTotal',coalesce(sum(total) FILTER(WHERE status='FINALIZADO' AND tipo_atendimento_tipo='ENTRADA'),0),
    'finalizadas',count(*) FILTER(WHERE status='FINALIZADO'),
    'canceladas',count(*) FILTER(WHERE status='CANCELADO'),
    'finalizadosHoje',count(*) FILTER(WHERE status='FINALIZADO' AND (finalizado_em AT TIME ZONE 'America/Fortaleza')::date=(now() AT TIME ZONE 'America/Fortaleza')::date)
  ) INTO resultado FROM (
    SELECT v.*,p.finalizado_em FROM public.pdv_filtrar_pedidos(p_filtros) v JOIN public.pedidos p ON p.id=v.id
  ) v;
  RETURN resultado;
END $$;

CREATE OR REPLACE FUNCTION public.pdv_estatisticas_clientes()
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = public, pg_temp AS $$
  SELECT jsonb_build_object('total',(SELECT count(*) FROM public.clientes),'ativos',(SELECT count(*) FROM public.clientes WHERE ativo),
    'totalPedidos',count(*),'valorTotalCompras',coalesce(sum(p.total),0))
  FROM public.pedidos p JOIN public.tipos_atendimento ta ON ta.id=p.tipo_atendimento_id
  WHERE public.pdv_acesso() AND p.cliente_id IS NOT NULL AND p.status='FINALIZADO' AND ta.tipo='ENTRADA';
$$;

CREATE OR REPLACE FUNCTION public.pdv_totais_clientes(p_ids uuid[])
RETURNS TABLE(cliente_id uuid,total_pedidos bigint,valor_total_compras numeric)
LANGUAGE sql SECURITY INVOKER SET search_path = public, pg_temp AS $$
  SELECT p.cliente_id,count(*),coalesce(sum(p.total),0)
  FROM public.pedidos p JOIN public.tipos_atendimento ta ON ta.id=p.tipo_atendimento_id
  WHERE public.pdv_acesso() AND p.cliente_id=ANY(p_ids) AND p.status='FINALIZADO' AND ta.tipo='ENTRADA'
  GROUP BY p.cliente_id;
$$;

REVOKE ALL ON FUNCTION public.pdv_salvar_cliente(jsonb,uuid), public.pdv_mutar_pedido(text,jsonb,uuid,uuid,bigint,uuid), public.pdv_estatisticas_pedidos(jsonb), public.pdv_estatisticas_clientes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pdv_salvar_cliente(jsonb,uuid), public.pdv_mutar_pedido(text,jsonb,uuid,uuid,bigint,uuid), public.pdv_estatisticas_pedidos(jsonb), public.pdv_estatisticas_clientes() TO authenticated;
REVOKE ALL ON FUNCTION public.pdv_totais_clientes(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pdv_totais_clientes(uuid[]) TO authenticated;
REVOKE ALL ON FUNCTION public.pdv_filtrar_pedidos(jsonb),public.pdv_listar_pedidos(jsonb,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pdv_filtrar_pedidos(jsonb),public.pdv_listar_pedidos(jsonb,integer,integer) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
