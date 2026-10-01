// Auditoria isolada: banco em memória, sem operações no Supabase.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { initTRPC } = require('@trpc/server');
const root = path.resolve(__dirname, '../..');
const trpc = initTRPC.create();
const cache = new Map();
function carregar(relative) {
  const filename = path.join(root, relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} }; cache.set(filename, module);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const localRequire = (name) => {
    if (name === '@/lib/trpc/server') return { router: trpc.router, publicProcedure: trpc.procedure };
    if (name === 'zustand/middleware') return { persist: (initializer) => initializer };
    if (name.startsWith('@/')) return carregar(`src/${name.slice(2)}.ts`);
    return require(name);
  };
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`, { filename })(localRequire,module,module.exports);
  return module.exports;
}

function extrair(nome, relative, contexto) {
  const filename = path.join(root, relative);
  const source = ts.createSourceFile(filename, fs.readFileSync(filename,'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let initializer;
  function visitar(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === nome) initializer = node.initializer;
    ts.forEachChild(node, visitar);
  }
  visitar(source);
  if (!initializer) throw Error(`Função ausente: ${nome}`);
  const js = ts.transpileModule(`(${initializer.getText(source)})`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  return vm.runInNewContext(js, contexto);
}

function banco(tabelas = {}, falhas = {}, maxRows = Infinity) {
  return {
    tabelas, chamadas: [],
    rpc: async () => ({ data: 10, error: null }),
    from(tabela) {
      let filtros=[], operacao='select', payload, unico=false, ordem, faixa, limite;
      const db=this;
      const q={
        select() { return q; }, eq(k,v) { filtros.push(r=>r[k]===v); return q; },
        neq(k,v) { filtros.push(r=>r[k]!=null && r[k]!==v); return q; },
        in(k,v) { filtros.push(r=>v.includes(r[k])); return q; },
        not(k,op,v) { filtros.push(r=>r[k]!==v); return q; },
        is(k,v) { filtros.push(r=>r[k]===v); return q; },
        range(a,b) { faixa=[a,b]; return q; }, order(k,o) { ordem=[k,o]; return q; },
        limit(n) { limite=n; return q; }, or() { return q; },
        insert(p) {operacao='insert';payload=JSON.parse(JSON.stringify(p));return q;}, update(p){operacao='update';payload=JSON.parse(JSON.stringify(p));return q;},
        delete(){operacao='delete';return q;}, single(){unico=true;return q;},
        then(resolve,reject) {
          db.chamadas.push({tabela,operacao,payload});
          const falha=falhas[`${tabela}:${operacao}`];
          if(falha)return Promise.resolve({data:null,error:{message:falha}}).then(resolve,reject);
          const rows=tabelas[tabela]||=[];
          let out=rows.filter(r=>filtros.every(f=>f(r)));
          if(operacao==='insert'){out=(Array.isArray(payload)?payload:[payload]).map(r=>({id:C,...r}));rows.push(...out);}
          if(operacao==='update')out.forEach(r=>Object.assign(r,payload));
          if(operacao==='delete')tabelas[tabela]=rows.filter(r=>!out.includes(r));
          const count=out.length;
          if(ordem){const[k,o]=ordem;out=[...out].sort((a,b)=>(a[k]>b[k]?1:a[k]<b[k]?-1:0)*(o?.ascending===false?-1:1));}
          if(faixa)out=out.slice(faixa[0],faixa[1]+1);
          out=out.slice(0,limite??maxRows);
          return Promise.resolve({data:unico?out[0]??null:out,error:unico&&!out.length?{message:'Ausente'}:null,count}).then(resolve,reject);
        },
      };return q;
    },
  };
}
const C='11111111-1111-4111-8111-111111111111';
const P='22222222-2222-4222-8222-222222222222';
const I='33333333-3333-4333-8333-333333333333';
const A='44444444-4444-4444-8444-444444444444';
const {clientesRouter}=carregar('src/server/routers/clientes.ts');
const {pedidosRouter}=carregar('src/server/routers/pedidos.ts');
const {usePDVStore}=carregar('src/stores/pdv-store.ts');
const resultados=[];
function registrar(id, nome, evidencia) { resultados.push({id,nome,evidencia}); }
async function ignorarFalha(fn) {try{await fn();return null;}catch(error){return error.message;}}

(async()=>{
  let db=banco({}, {'enderecos:insert':'Falha simulada no endereço'});
  let erro=await ignorarFalha(()=>clientesRouter.createCaller({supabase:db}).create({nome:'Teste',endereco:{logradouro:'Rua Teste'}}));
  registrar('R01','Cliente persiste após erro no endereço',{erro,clientes:db.tabelas.clientes.length});

  db=banco({}, {'itens_pedido:insert':'Falha simulada nos itens'});
  erro=await ignorarFalha(()=>pedidosRouter.createCaller({supabase:db}).create({data:'2026-10-01',tipo_atendimento_id:A,itens:[{produto_id:I,quantidade:1,valor_unitario:10}]}));
  registrar('R02','Pedido persiste após erro nos itens',{erro,pedidos:db.tabelas.pedidos.length});

  db=banco({pedidos:[{id:P}],itens_pedido:[{id:I,pedido_id:P}]},{'pedidos:delete':'Falha simulada na exclusão do cabeçalho'});
  erro=await ignorarFalha(()=>pedidosRouter.createCaller({supabase:db}).delete({id:P}));
  registrar('R03','Exclusão falha depois de remover os itens',{erro,pedidos:db.tabelas.pedidos.length,itens:db.tabelas.itens_pedido.length});

  db=banco({pedidos:[{id:P}],itens_pedido:[{id:I,pedido_id:P}]},{'itens_pedido:insert':'Falha simulada na substituição dos itens'});
  const api=pedidosRouter.createCaller({supabase:db});
  const editar=extrair('handleConfirmarPedido','src/app/pdv/page.tsx',{
    clienteSelecionado:null,enderecoSelecionado:null,modoEdicao:true,pedidoOriginalId:P,pedidoParaEditar:{id:P,itens:[{id:I}]},
    pedidoAtual:{itens:[{produto_id:I,quantidade:1,valor_unitario:20}]},
    removerItemMutation:{mutateAsync:api.removeItem},adicionarItemMutation:{mutateAsync:api.addItem},
    atualizarPedidoMutation:{mutateAsync:api.update},toast:{loading:()=>1,error:m=>{erro=m;}},console:{error:()=>{}},
  });await editar();
  registrar('R04','Edição do PDV perde itens antigos em falha',{erro,itensRestantes:db.tabelas.itens_pedido.length});

  usePDVStore.getState().novoPedido();usePDVStore.getState().adicionarItem({produto_id:I,produto_nome:'Teste',quantidade:1,valor_unitario:10,desconto_valor:20});
  registrar('R05','Desconto acima do preço gera subtotal negativo',{item:usePDVStore.getState().pedidoAtual.itens[0].valor_total,subtotal:usePDVStore.getState().pedidoAtual.subtotal,total:usePDVStore.getState().pedidoAtual.total});

  const noop=()=>{};let itemAtalho;
  const contexto={produtoSelecionado:{id:I,nome:'Teste',valor_base:10},quantidade:1,valorUnitario:10,descontoItem:0,tipoDescontoItem:'valor',corSelecionada:null,
    adicionarItem:it=>{itemAtalho=it;},toast:{success:noop},setProdutoSelecionado:noop,setQuantidade:noop,setValorUnitario:noop,setDescontoItem:noop,setTipoDescontoItem:noop,setCorSelecionada:noop};
  contexto.handleAdicionarProduto=extrair('handleAdicionarProduto','src/app/pdv/page.tsx',contexto);
  const atalho=extrair('handleKeyPress','src/app/pdv/page.tsx',{...contexto,dialogFinalizar:false,dialogNovoCliente:false,dialogNovoProduto:false,dialogAtalhos:false});
  atalho({key:'Enter',preventDefault:noop});
  const precoDoHandler=itemAtalho.valor_unitario;
  extrair('handleAdicionarProduto','src/app/pdv/page.tsx',{...contexto,valorUnitario:20})();
  registrar('R06','Handler de teclado conserva preço do render anterior',{precoDoHandler,precoNoRenderPosterior:itemAtalho.valor_unitario,observacao:'A dependência valorUnitario não está no useEffect; comparação de closures, sem gravar venda.'});

  db=banco({clientes:[{id:C,email:'teste@example.invalid',telefone:'85999990000',cpf:'111.111.111-11'}],enderecos:[{id:A,cliente_id:C,logradouro:'Rua Teste',principal:true}]});
  await clientesRouter.createCaller({supabase:db}).update({id:C,email:undefined,telefone:undefined,cpf:undefined});
  registrar('R07','Campos opcionais enviados como undefined não são limpos',{email:db.tabelas.clientes[0].email,telefone:db.tabelas.clientes[0].telefone});
  await clientesRouter.createCaller({supabase:db}).update({id:C,endereco:undefined});
  registrar('R08','Limpar todos os campos de endereço omite a atualização',{enderecosRestantes:db.tabelas.enderecos.length});

  db=banco({vw_pedidos_completos:[{id:P,numero:100,tipo_atendimento_tipo:'ENTRADA',data:'2026-10-01'}]});
  const lista=await pedidosRouter.createCaller({supabase:db}).list({search:'999999'});
  registrar('R09','Busca de pedidos ignorada pelo contrato',{busca:'999999',retornados:lista.pedidos.map(p=>p.numero)});

  db=banco();const criar=pedidosRouter.createCaller({supabase:db}).create;
  const payload={data:'2026-10-01',tipo_atendimento_id:A,itens:[{produto_id:I,quantidade:1,valor_unitario:10}],total:10};
  await Promise.all([criar(payload),criar(payload)]);
  registrar('R10','Reenvio do mesmo payload cria dois pedidos',{pedidos:db.tabelas.pedidos.length});

  db=banco({pedidos:[{id:P,status:'CANCELADO'}]});await pedidosRouter.createCaller({supabase:db}).finalizar({id:P});
  registrar('R11','API permite finalizar pedido cancelado',{status:db.tabelas.pedidos[0].status});

  db=banco();await pedidosRouter.createCaller({supabase:db}).create({...payload,total:0.01,subtotal:0.01});
  registrar('R12','Servidor aceita total incompatível com os itens',{totalAceito:db.tabelas.pedidos[0].total,itens:10,observacao:'Sem triggers no banco em memória; recálculo no PostgreSQL real precisa ser verificado.'});

  let dadosImpressao;
  const imprimir=extrair('handleImprimirPedido','src/app/pdv/page.tsx',{
    clienteSelecionado:null,enderecoSelecionado:null,pedidoAtual:{data:'2026-10-01',itens:[],subtotal:100,desconto_valor:0,total:100},
    telefoneContato:'',tiposAtendimento:[],formasPagamento:[],observacoes:'',configuracoes:null,
    formatarEndereco:()=>'',gerarPedidoPDF:async dados=>{dadosImpressao=dados;},
  });await imprimir('download');
  registrar('R13','Impressão na edição lê número/data/desconto do store, sem hidratação do pedido',{numero:dadosImpressao.numero??null,desconto:dadosImpressao.desconto_valor,data:dadosImpressao.data});

  db=banco({vw_clientes_completos:[{id:C,nome:'A',ativo:true},{id:P,nome:'B',ativo:true}],enderecos:[{id:A,cliente_id:C,logradouro:'Rua A'},{id:I,cliente_id:C,logradouro:'Outra rua A'},{id:P,cliente_id:P,logradouro:'Rua B'}]}, {}, 2);
  const clientes=await clientesRouter.createCaller({supabase:db}).list({limit:2});
  registrar('R14','Endereços em lote ficam incompletos quando atingem o limite de retorno',{limiteSimulado:2,enderecoClienteB:clientes.clientes.find(c=>c.id===P).endereco_principal_completo,observacao:'Confirmar max_rows configurado no Supabase real.'});

  const valor=vm.runInNewContext("new Date('2026-10-01').toLocaleDateString('pt-BR')");
  registrar('R15','Data DATE convertida como UTC pode retroceder um dia no PDF',{timezone:process.env.TZ,dataEntrada:'2026-10-01',dataFormatada:valor});

  db=banco({},{});db.rpc=async()=>({data:null,error:{message:'Falha simulada na numeração'}});
  erro=await ignorarFalha(()=>pedidosRouter.createCaller({supabase:db}).create({...payload,itens:[]}));
  registrar('R16','Falha na RPC de numeração não impede insert pelo router',{erro,numero:db.tabelas.pedidos?.[0]?.numero,pedidos:db.tabelas.pedidos?.length});

  const pdfHead=fs.readFileSync(path.join(root,'src/lib/pdf/pedido-pdf.ts'),'utf8');
  registrar('R17','Confirmação de evidência estática da data do PDF',{expressaoUTC:pdfHead.includes('new Date(dateString).toLocaleDateString')});
  usePDVStore.getState().novoPedido();
  usePDVStore.getState().setPedidoAtual({desconto_valor:10});
  usePDVStore.getState().limparCarrinho();
  usePDVStore.getState().adicionarItem({produto_id:I,produto_nome:'Nova venda',quantidade:1,valor_unitario:50,desconto_valor:0});
  registrar('R18','Limpar/cancelar carrinho deixa desconto anterior na próxima venda',{desconto:usePDVStore.getState().pedidoAtual.desconto_valor,total:usePDVStore.getState().pedidoAtual.total});
  fs.writeFileSync(path.join(__dirname,'evidencias.json'),JSON.stringify(resultados,null,2)+'\n');
  console.log(JSON.stringify(resultados,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
