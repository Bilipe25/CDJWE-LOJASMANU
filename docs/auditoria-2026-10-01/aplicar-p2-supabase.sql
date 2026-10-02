-- Aplicar após 202610010001. Mantém contratos antigos e não concede novos operadores.
BEGIN;
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

ALTER TABLE public.enderecos ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS endereco_snapshot jsonb;

CREATE OR REPLACE FUNCTION public.pdv_snapshot_metadata() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
  IF (to_jsonb(NEW)-ARRAY['endereco_snapshot','updated_at'])=(to_jsonb(OLD)-ARRAY['endereco_snapshot','updated_at']) THEN NEW.updated_at:=OLD.updated_at; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS zz_pdv_snapshot_metadata ON public.pedidos;
CREATE TRIGGER zz_pdv_snapshot_metadata BEFORE UPDATE ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.pdv_snapshot_metadata();
-- Legado: registra o endereço conhecido nesta migração, sem inventar o endereço original da venda.
UPDATE public.pedidos p SET endereco_snapshot=to_jsonb(e) FROM public.enderecos e WHERE p.endereco_id=e.id AND p.endereco_snapshot IS NULL;
CREATE OR REPLACE FUNCTION public.pdv_snapshot_endereco() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF TG_OP='INSERT' OR NEW.endereco_id IS DISTINCT FROM OLD.endereco_id THEN
    IF NEW.endereco_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.enderecos WHERE id=NEW.endereco_id AND cliente_id=NEW.cliente_id AND ativo) THEN
      RAISE EXCEPTION 'Selecione um endereço ativo deste cliente';
    END IF;
    NEW.endereco_snapshot := (SELECT to_jsonb(e) FROM public.enderecos e WHERE e.id=NEW.endereco_id AND e.cliente_id=NEW.cliente_id);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS pdv_snapshot_endereco ON public.pedidos;
CREATE TRIGGER pdv_snapshot_endereco BEFORE INSERT OR UPDATE OF endereco_id ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.pdv_snapshot_endereco();
-- Resolver múltiplos principais de forma determinística, mantendo todos os registros.
WITH repetidos AS (SELECT id,row_number() OVER(PARTITION BY cliente_id ORDER BY id) AS posicao FROM public.enderecos WHERE principal AND ativo)
UPDATE public.enderecos e SET principal=false FROM repetidos r WHERE e.id=r.id AND r.posicao>1;
CREATE UNIQUE INDEX IF NOT EXISTS enderecos_principal_ativo_unico ON public.enderecos(cliente_id) WHERE principal AND ativo;
CREATE INDEX IF NOT EXISTS enderecos_cliente_ativo ON public.enderecos(cliente_id,ativo,principal);
CREATE INDEX IF NOT EXISTS pedidos_cliente_status ON public.pedidos(cliente_id,status,tipo_atendimento_id);

CREATE OR REPLACE FUNCTION public.pdv_salvar_cliente(p_dados jsonb,p_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE c public.clientes; a jsonb; e uuid; ids uuid[]:=ARRAY[]::uuid[]; lista jsonb; cpf_normal text;
BEGIN
  IF NOT public.pdv_acesso() THEN RAISE EXCEPTION 'Conta sem acesso ao PDV' USING ERRCODE='42501'; END IF;
  IF p_id IS NOT NULL THEN SELECT * INTO c FROM public.clientes WHERE id=p_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Cliente não encontrado'; END IF; END IF;
  IF p_dados ? 'cpf' THEN
    cpf_normal:=nullif(regexp_replace(coalesce(p_dados->>'cpf',''),'[^0-9]','','g'),'');
    IF cpf_normal IS NOT NULL THEN
      PERFORM pg_advisory_xact_lock(hashtextextended('pdv:cpf:'||cpf_normal,0));
      IF EXISTS(SELECT 1 FROM public.clientes WHERE regexp_replace(coalesce(cpf,''),'[^0-9]','','g')=cpf_normal AND id IS DISTINCT FROM p_id) THEN
        RAISE EXCEPTION 'Este CPF já está cadastrado. Localize o cliente existente, inclusive nos inativos.' USING ERRCODE='23505';
      END IF;
    END IF;
    p_dados:=jsonb_set(p_dados,'{cpf}',coalesce(to_jsonb(cpf_normal),'null'::jsonb));
  END IF;
  IF p_dados ? 'telefone' THEN p_dados:=jsonb_set(p_dados,'{telefone}',coalesce(to_jsonb(nullif(regexp_replace(coalesce(p_dados->>'telefone',''),'[^0-9]','','g'),'')),'null'::jsonb)); END IF;
  IF p_id IS NULL THEN
    IF coalesce(btrim(p_dados->>'nome'),'')='' THEN RAISE EXCEPTION 'Nome obrigatório'; END IF;
    INSERT INTO public.clientes(nome,cpf,telefone,email,ativo) VALUES(btrim(p_dados->>'nome'),p_dados->>'cpf',p_dados->>'telefone',p_dados->>'email',coalesce((p_dados->>'ativo')::boolean,true)) RETURNING * INTO c;
  ELSE
    c:=jsonb_populate_record(c,p_dados-ARRAY['id','endereco','enderecos']);
    IF coalesce(btrim(c.nome),'')='' THEN RAISE EXCEPTION 'Nome obrigatório'; END IF;
    UPDATE public.clientes SET nome=btrim(c.nome),cpf=c.cpf,telefone=c.telefone,email=c.email,ativo=c.ativo,updated_at=now() WHERE id=p_id RETURNING * INTO c;
  END IF;
  IF p_dados ? 'enderecos' THEN
    lista:=p_dados->'enderecos';
    IF jsonb_typeof(lista)<>'array' OR jsonb_array_length(lista)>50 THEN RAISE EXCEPTION 'Lista de endereços inválida'; END IF;
    IF (SELECT count(*) FROM jsonb_array_elements(lista) AS entrada(value) WHERE coalesce((entrada.value->>'principal')::boolean,true) AND coalesce((entrada.value->>'ativo')::boolean,true))>1 THEN RAISE EXCEPTION 'Escolha apenas um endereço principal'; END IF;
    UPDATE public.enderecos SET principal=false WHERE cliente_id=c.id;
  ELSIF p_dados ? 'endereco' THEN
    SELECT id INTO e FROM public.enderecos WHERE cliente_id=c.id AND ativo ORDER BY principal DESC NULLS LAST,id LIMIT 1 FOR UPDATE;
    IF p_dados->'endereco'='null'::jsonb THEN
      UPDATE public.enderecos SET ativo=false,principal=false WHERE id=e;
      RETURN to_jsonb(c);
    END IF;
    lista:=jsonb_build_array((p_dados->'endereco')||CASE WHEN e IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('id',e) END);
  ELSE RETURN to_jsonb(c); END IF;
  FOR a IN SELECT value FROM jsonb_array_elements(lista) LOOP
    IF coalesce(btrim(a->>'logradouro'),'')='' THEN RAISE EXCEPTION 'Logradouro obrigatório'; END IF;
    e:=nullif(a->>'id','')::uuid;
    IF e IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.enderecos WHERE id=e AND cliente_id=c.id) THEN RAISE EXCEPTION 'Endereço não pertence ao cliente'; END IF;
    IF coalesce((a->>'principal')::boolean,true) AND coalesce((a->>'ativo')::boolean,true) THEN UPDATE public.enderecos SET principal=false WHERE cliente_id=c.id AND id IS DISTINCT FROM e; END IF;
    IF e IS NULL THEN
      INSERT INTO public.enderecos(cliente_id,logradouro,numero,complemento,bairro,cidade,estado,cep,principal,ativo)
      VALUES(c.id,btrim(a->>'logradouro'),a->>'numero',a->>'complemento',a->>'bairro',a->>'cidade',a->>'estado',a->>'cep',coalesce((a->>'principal')::boolean,true),coalesce((a->>'ativo')::boolean,true)) RETURNING id INTO e;
    ELSE
      UPDATE public.enderecos SET logradouro=btrim(a->>'logradouro'),numero=a->>'numero',complemento=a->>'complemento',bairro=a->>'bairro',cidade=a->>'cidade',estado=a->>'estado',cep=a->>'cep',principal=coalesce((a->>'principal')::boolean,true),ativo=coalesce((a->>'ativo')::boolean,true) WHERE id=e;
    END IF;
    IF e=ANY(ids) THEN RAISE EXCEPTION 'Endereço repetido na lista'; END IF;
    ids:=array_append(ids,e);
  END LOOP;
  IF p_dados ? 'enderecos' THEN UPDATE public.enderecos SET ativo=false,principal=false WHERE cliente_id=c.id AND NOT(id=ANY(ids)); END IF;
  RETURN to_jsonb(c);
END $$;

CREATE OR REPLACE FUNCTION public.pdv_listar_clientes(p_busca text DEFAULT '',p_ativo boolean DEFAULT true,p_limite integer DEFAULT 50,p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE resultado jsonb; busca text:=lower(btrim(coalesce(p_busca,''))); digitos text:=regexp_replace(busca,'[^0-9]','','g');
BEGIN
  IF NOT public.pdv_acesso() THEN RAISE EXCEPTION 'Conta sem acesso' USING ERRCODE='42501'; END IF;
  IF p_limite<1 OR p_limite>1000 OR p_offset<0 THEN RAISE EXCEPTION 'Paginação inválida'; END IF;
  IF length(digitos) IN (12,13) AND left(digitos,2)='55' THEN digitos:=substr(digitos,3); END IF;
  WITH filtrados AS MATERIALIZED (SELECT c.* FROM public.clientes c WHERE (p_ativo IS NULL OR c.ativo=p_ativo) AND
    (busca='' OR strpos(lower(c.nome),busca)>0 OR (digitos<>'' AND busca !~ '[[:alpha:]]' AND (strpos(regexp_replace(coalesce(c.cpf,''),'[^0-9]','','g'),digitos)>0 OR strpos(regexp_replace(coalesce(c.telefone,''),'[^0-9]','','g'),digitos)>0)))),
  pagina AS (SELECT * FROM filtrados ORDER BY nome,id LIMIT p_limite OFFSET p_offset),
  completos AS (SELECT to_jsonb(c)||jsonb_build_object('endereco_principal',e.logradouro,'endereco_principal_completo',concat_ws(', ',nullif(e.logradouro,''),nullif(e.numero,''),nullif(e.complemento,''),nullif(e.bairro,''),nullif(e.cidade,''),nullif(e.estado,''),CASE WHEN coalesce(e.cep,'')<>'' THEN 'CEP: '||e.cep END),
    'total_pedidos',t.total_pedidos,'valor_total_compras',t.valor_total,'total_enderecos',(SELECT count(*) FROM public.enderecos WHERE cliente_id=c.id AND ativo)) AS dados,c.nome,c.id FROM pagina c
    LEFT JOIN LATERAL(SELECT * FROM public.enderecos WHERE cliente_id=c.id AND ativo ORDER BY principal DESC NULLS LAST,id LIMIT 1) e ON true
    LEFT JOIN LATERAL(SELECT count(*) AS total_pedidos,coalesce(sum(p.total),0) AS valor_total FROM public.pedidos p JOIN public.tipos_atendimento ta ON ta.id=p.tipo_atendimento_id WHERE p.cliente_id=c.id AND p.status='FINALIZADO' AND ta.tipo='ENTRADA') t ON true)
  SELECT jsonb_build_object('total',(SELECT count(*) FROM filtrados),'clientes',coalesce((SELECT jsonb_agg(dados ORDER BY nome,id) FROM completos),'[]'::jsonb)) INTO resultado;
  RETURN resultado;
END $$;
CREATE OR REPLACE FUNCTION public.pdv_listar_produtos(p_busca text DEFAULT '',p_categoria uuid DEFAULT NULL,p_limite integer DEFAULT 50,p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE resultado jsonb; busca text:=lower(btrim(coalesce(p_busca,'')));
BEGIN
  IF NOT public.pdv_acesso() THEN RAISE EXCEPTION 'Conta sem acesso' USING ERRCODE='42501'; END IF;
  IF p_limite<1 OR p_limite>100 OR p_offset<0 THEN RAISE EXCEPTION 'Paginação inválida'; END IF;
  WITH filtrados AS MATERIALIZED(SELECT * FROM public.produtos WHERE ativo AND (p_categoria IS NULL OR categoria_id=p_categoria) AND (busca='' OR strpos(lower(nome),busca)>0 OR strpos(lower(coalesce(codigo,'')),busca)>0)),
  pagina AS(SELECT * FROM filtrados ORDER BY (busca<>'' AND lower(coalesce(codigo,''))=busca) DESC,nome,id LIMIT p_limite OFFSET p_offset)
  SELECT jsonb_build_object('total',(SELECT count(*) FROM filtrados),'produtos',coalesce((SELECT jsonb_agg(to_jsonb(pagina)) FROM pagina),'[]'::jsonb)) INTO resultado;
  RETURN resultado;
END $$;
REVOKE ALL ON FUNCTION public.pdv_listar_clientes(text,boolean,integer,integer),public.pdv_listar_produtos(text,uuid,integer,integer),public.pdv_snapshot_endereco(),public.pdv_snapshot_metadata() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pdv_listar_clientes(text,boolean,integer,integer),public.pdv_listar_produtos(text,uuid,integer,integer) TO authenticated;
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
    -- A cópia é uma nova venda: endereço desativado exige nova escolha no PDV.
    IF p.endereco_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.enderecos WHERE id=p.endereco_id AND ativo) THEN p.endereco_id:=NULL; END IF;
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

NOTIFY pgrst,'reload schema';
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

COMMIT;
