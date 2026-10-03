// Somente testes locais. Não é importado pela aplicação nem consulta o Supabase real.
const http = require('node:http');
const { criarBanco } = require('./banco-pdv.cjs');
const email='operador@example.invalid',senha='teste-local';
const json=(res,data,status=200)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));};
async function main() {
  const banco=await criarBanco();
  await banco.pg.exec(`
    ALTER TABLE tipos_atendimento ADD COLUMN ativo boolean DEFAULT true;
    ALTER TABLE formas_pagamento ADD COLUMN ativo boolean DEFAULT true;
    ALTER TABLE categorias ADD COLUMN ativo boolean DEFAULT true;
    ALTER TABLE cores ADD COLUMN ativo boolean DEFAULT true;
    ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;
    CREATE TABLE configuracoes_empresa(id uuid DEFAULT gen_random_uuid(),ativo boolean DEFAULT true,nome_empresa text,nome_sistema text,logradouro text,numero text,cidade text,estado text,telefone text,cor_primaria text,cor_secundaria text);
    INSERT INTO configuracoes_empresa(nome_empresa,nome_sistema,logradouro,numero,cidade,estado,cor_primaria,cor_secundaria) VALUES('Lojas Manu — teste local','PDV de teste','Rua da Empresa','10','Fortaleza','CE','#0369a1','#0369a1');
    INSERT INTO formas_pagamento(id,nome) VALUES('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','Dinheiro');
    UPDATE produtos SET nome='Produto de teste local';
  `);
  const cliente=await banco.supabase.rpc('pdv_salvar_cliente',{p_dados:{nome:'Cliente de teste local',telefone:'00000000000',endereco:{logradouro:'Rua das Flores',numero:'123',complemento:'Apto 2',bairro:'Centro',cidade:'Fortaleza',estado:'CE',cep:'60000-000',principal:true}}});
  const endereco=(await banco.pg.query('SELECT id FROM enderecos WHERE cliente_id=$1',[cliente.data.id])).rows[0];
  const pedido=await banco.supabase.rpc('pdv_mutar_pedido',{p_acao:'criar',p_chave:crypto.randomUUID(),p_dados:{data:'2026-09-28',cliente_id:cliente.data.id,endereco_id:endereco.id,tipo_atendimento_id:banco.atendimento,forma_pagamento_id:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',telefone_contato:'00000000000',observacao:'Pedido local para validar edição',desconto_valor:2,itens:[{produto_id:banco.produto,quantidade:2,valor_unitario:10,desconto_valor:1,ordem:0}]}});
  if(pedido.error)throw new Error(pedido.error.message);
  if (process.env.PDV_UX_FIXTURE === '1') {
    // Cenário opt-in para inspeção visual e paginação. Nenhum dado de produção.
    await banco.pg.exec(`
      UPDATE configuracoes_empresa SET nome_empresa='Lojas Manu · teste local';
      UPDATE produtos SET nome='Produto A — modelo padrão de demonstração',valor_base=89.90;
      INSERT INTO produtos(id,nome,codigo,unidade,valor_base) VALUES
        ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1','Produto B — variação azul','DEMO-02','UN',59.90),
        ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2','Produto C — kit de demonstração','DEMO-03','UN',19.90),
        ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3','Produto D — modelo compacto','DEMO-04','UN',39.90);
    `);
    const segundoEndereco = await banco.supabase.rpc('pdv_salvar_cliente', { p_id: cliente.data.id, p_dados: { enderecos: [
      { id: endereco.id, logradouro: 'Rua das Flores', numero: '123', complemento: 'Apto 2', bairro: 'Centro', cidade: 'Fortaleza', estado: 'CE', cep: '60000-000', principal: true, ativo: true },
      { logradouro: 'Avenida de demonstração', numero: '456', bairro: 'Aldeota', cidade: 'Fortaleza', estado: 'CE', cep: '60150-000', principal: false, ativo: true },
    ] } });
    if(segundoEndereco.error)throw new Error(segundoEndereco.error.message);
    for(let i=0;i<26;i++) {
      const criado=await banco.supabase.rpc('pdv_mutar_pedido', { p_acao:'criar', p_chave:crypto.randomUUID(), p_dados:{ data:'2026-10-01', cliente_id:cliente.data.id, endereco_id:endereco.id, tipo_atendimento_id:banco.atendimento, forma_pagamento_id:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', itens:[{produto_id:banco.produto,quantidade:1,valor_unitario:89.90,desconto_valor:0,ordem:0}] } });
      if(criado.error)throw new Error(criado.error.message);
      if(i%3===0) { const finalizado=await banco.supabase.rpc('pdv_mutar_pedido',{ p_acao:'finalizar',p_id:criado.data.id,p_versao:criado.data.versao }); if(finalizado.error)throw new Error(finalizado.error.message); }
    }
    for(const [nome,ativo] of [['Cliente B — demonstração',true],['Cliente C — cadastro inativo',false]]) {
      const criado=await banco.supabase.rpc('pdv_salvar_cliente',{ p_dados:{nome,ativo,telefone:'00000000000'} }); if(criado.error)throw new Error(criado.error.message);
    }
  }
  if (process.env.PDV_DASHBOARD_FIXTURE === '1') {
    // Demonstração isolada da evolução do dashboard; nunca carregada em produção.
    const { carregar } = require('./carregar.cjs');
    const { intervalosDashboard } = carregar('src/lib/schemas/dashboard.ts');
    const { deslocarDataCivil } = carregar('src/lib/schemas/financeiro.ts');
    const referencia = intervalosDashboard('mes');
    await banco.pg.exec("ALTER TABLE configuracoes_empresa ADD COLUMN logo_url text; UPDATE configuracoes_empresa SET nome_empresa='Lojas Manu · demonstração',nome_sistema='PDV Lojas Manu',logo_url='/icon-192x192.png'; DELETE FROM itens_pedido; DELETE FROM pedidos;");
    const produtos = [
      ['Sofá 3 lugares',2000,3],['Guarda-roupa 6 portas',2400,2],['Cama box casal',1200,3],['Mesa com 4 cadeiras',1200,2],['Painel para TV',825,2],
    ];
    let indice = 0;
    for (const [nome,valor,quantidade] of produtos) {
      const produtoId = crypto.randomUUID();
      await banco.pg.query('INSERT INTO produtos(id,nome,codigo,unidade,valor_base) VALUES($1,$2,$3,$4,$5)',[produtoId,nome,'DEMO-'+indice,'UN',valor]);
      for (let n=0;n<quantidade;n++) {
        const clienteId=crypto.randomUUID();
        const clienteNome=['Ana Oliveira','João Santos','Carla Lima','Pedro Souza','Maria Costa','Beatriz Silva'][indice%6]+' · demonstração';
        await banco.pg.query('INSERT INTO clientes(id,nome) VALUES($1,$2)',[clienteId,clienteNome]);
        const data=deslocarDataCivil(referencia.hoje,-Math.min(indice%3,Number(referencia.hoje.slice(8))-1));
        const pedidoId=crypto.randomUUID();
        await banco.pg.query("INSERT INTO pedidos(id,numero,data,status,total,subtotal,cliente_id,tipo_atendimento_id,forma_pagamento_id) VALUES($1,nextval('numero_pedido'),$2,'FINALIZADO',$3,$3,$4,$5,$6)",[pedidoId,data,valor,clienteId,banco.atendimento,'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee']);
        await banco.pg.query('INSERT INTO itens_pedido(pedido_id,produto_id,quantidade,valor_unitario,valor_total) VALUES($1,$2,1,$3,$3)',[pedidoId,produtoId,valor]);
        indice++;
      }
    }
    for(let n=0;n<10;n++) {
      await banco.pg.query("INSERT INTO pedidos(numero,data,status,total,subtotal,tipo_atendimento_id) VALUES(nextval('numero_pedido'),$1,'FINALIZADO',1640,1640,$2)",[referencia.anterior.dataInicio,banco.atendimento]);
    }
    for(let n=0;n<18;n++) {
      await banco.pg.query("INSERT INTO pedidos(numero,data,status,total,subtotal,tipo_atendimento_id,cliente_id) VALUES(nextval('numero_pedido'),$1,'PENDENTE',$2,$2,$3,$4)",[deslocarDataCivil(referencia.hoje,-(18-n)),990+n*100,banco.atendimento,cliente.data.id]);
    }
  }
  const user={id:banco.usuario,email,aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString()};
  const token=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:user.id,email,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated',aud:'authenticated'})).toString('base64url')+'.assinatura-somente-local';
  const session=()=>({access_token:token,refresh_token:'refresh-local',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user});
  let falha=false, falhaProdutos=false, semVendas=false;
  const server=http.createServer(async(req,res)=>{
    res.setHeader('Access-Control-Allow-Origin','http://127.0.0.1:3110');
    res.setHeader('Access-Control-Allow-Headers',req.headers['access-control-request-headers'] ?? 'authorization,apikey,content-type,x-client-info,x-supabase-api-version,prefer,range,accept');
    res.setHeader('Access-Control-Allow-Methods','GET,POST,HEAD,OPTIONS');
    res.setHeader('Access-Control-Expose-Headers','Content-Range');
    if(req.method==='OPTIONS'){res.statusCode=204;return res.end();}
    const url=new URL(req.url,'http://127.0.0.1:3311');
    let body={};try{const chunks=[];for await(const chunk of req)chunks.push(chunk);if(chunks.length)body=JSON.parse(Buffer.concat(chunks).toString());}catch{return json(res,{message:'Corpo inválido'},400);}
    if(url.pathname==='/__estado')return json(res,{clienteId:cliente.data.id,pedidoId:pedido.data.id,pedido:(await banco.pg.query('SELECT * FROM pedidos ORDER BY numero')).rows.map(p=>({id:p.id,numero:p.numero,total:p.total,desconto:p.desconto_valor,versao:p.versao})),falha});
    if(url.pathname==='/__falha' && req.method==='POST'){falha=!!body.ativo;return json(res,{falha});}
    if(url.pathname==='/__dashboard' && req.method==='POST'){falhaProdutos=!!body.falhaProdutos;semVendas=!!body.semVendas;return json(res,{falhaProdutos,semVendas});}
    if(url.pathname==='/auth/v1/token'){
      if((body.email===email && body.password===senha) || body.refresh_token==='refresh-local')return json(res,session());
      return json(res,{message:'Credenciais de teste inválidas',error_code:'invalid_credentials'},400);
    }
    if(url.pathname==='/auth/v1/logout')return json(res,{});
    if(req.headers.authorization!=='Bearer '+token)return json(res,{message:'JWT inválido',error_code:'bad_jwt'},401);
    if(url.pathname==='/auth/v1/user')return json(res,user);
    if(falha)return json(res,{message:'Falha de conexão simulada',code:'XX000'},503);
    try{
      if(url.pathname.startsWith('/rest/v1/rpc/')){
        if(semVendas && url.pathname.endsWith('/pdv_listar_pedidos') && body.p_filtros?.status==='FINALIZADO')return json(res,{pedidos:[],total:0});
        if (url.pathname.endsWith('/pdv_filtrar_pedidos')) {
          const consulta = banco.supabase.rpc('pdv_filtrar_pedidos', body).select('*', { count: 'exact' });
          for (const ordem of (url.searchParams.get('order') || '').split(',').filter(Boolean)) {
            const [coluna, direcao] = ordem.split('.'); consulta.order(coluna, { ascending: direcao !== 'desc' });
          }
          const offset = Number(url.searchParams.get('offset') || 0), limit = Number(url.searchParams.get('limit') || 1000);
          const resultado = await consulta.range(offset, offset + limit - 1);
          if (resultado.error) return json(res, resultado.error, 400);
          res.setHeader('Content-Range', `${offset}-${offset + resultado.data.length - 1}/${resultado.count}`);
          return json(res, resultado.data);
        }
        const resultado=await banco.supabase.rpc(url.pathname.split('/').pop(),body);
        return resultado.error?json(res,resultado.error,400):json(res,resultado.data);
      }
      const tabela=url.pathname.split('/').pop();
      if(falhaProdutos && tabela==='vw_itens_pedido_completos')return json(res,{message:'Falha simulada no ranking de produtos',code:'XX000'},503);
      if(tabela==='configuracoes_empresa')return json(res,(await banco.pg.query('SELECT * FROM configuracoes_empresa')).rows[0]);
      const q=banco.supabase.from(tabela).select('*',{head:req.method==='HEAD'});
      for(const [campo,filtro] of url.searchParams){
        if(['select','offset','limit','order'].includes(campo))continue;
        if(campo==='or'){q.or(filtro.replace(/^\(|\)$/g,''));continue;}
        if(campo.includes('.'))continue; // Relações de dashboard estão fora desta fixture.
        const [op,...rest]=filtro.split('.'),valor=rest.join('.');
        if(op==='eq')q.eq(campo,['true','false'].includes(valor)?valor==='true':valor);
        else if(op==='neq')q.neq(campo,valor);
        else if(op==='in')q.in(campo,valor.replace(/^\(|\)$/g,'').split(','));
        else if(op==='is')q.is(campo,valor==='null'?null:valor);
        else if(['ilike','gte','lte'].includes(op))q[op](campo,valor);
      }
      for(const ordem of (url.searchParams.get('order')??'').split(',').filter(Boolean)){const [col,dir]=ordem.split('.');q.order(col,{ascending:dir!=='desc'});}
      const offset=Number(url.searchParams.get('offset')??0),limit=Number(url.searchParams.get('limit')??1000);q.range(offset,offset+limit-1);
      const resultado=await q;if(resultado.error)return json(res,resultado.error,400);
      res.setHeader('Content-Range',`${offset}-${Math.max(offset,offset+(resultado.data?.length??0)-1)}/${resultado.count}`);
      const dados=req.headers.accept?.includes('vnd.pgrst.object')?resultado.data?.[0]??null:resultado.data;
      return json(res,dados);
    }catch(error){json(res,{message:error.message,code:'XX000'},500);}
  });
  server.listen(3311,'127.0.0.1',()=>console.log(JSON.stringify({servidor:'http://127.0.0.1:3311',clienteId:cliente.data.id,pedidoId:pedido.data.id,conta:'operador@example.invalid',senha:'teste-local'})));
  const encerrar=()=>server.close(async()=>{await banco.close();process.exit(0);});process.on('SIGINT',encerrar);process.on('SIGTERM',encerrar);
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
