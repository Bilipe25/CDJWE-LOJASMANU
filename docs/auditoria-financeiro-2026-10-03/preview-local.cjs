// Harness isolado: componentes reais, respostas fictícias; não conecta ao Supabase.
const fs = require('node:fs'); const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const destino = path.resolve(process.argv[2] || path.join(root, 'tmp/financeiro-preview'));
const posix = p => p.replaceAll('\\', '/');
const arquivo = (nome, conteudo) => { const alvo = path.join(destino, nome); fs.mkdirSync(path.dirname(alvo), { recursive: true }); fs.writeFileSync(alvo, conteudo); };
arquivo('package.json', JSON.stringify({ name: 'financeiro-preview-local', private: true, version: '0.0.0' }));
arquivo('tsconfig.json', JSON.stringify({ compilerOptions: { jsx: 'react-jsx', target: 'ES2020', module: 'esnext', moduleResolution: 'bundler', esModuleInterop: true, skipLibCheck: true, paths: { '@/*': [posix(path.join(root, 'src/*'))] } }, include: ['**/*.tsx', '**/*.ts'] }));
arquivo('next.config.mjs', `import path from 'node:path'; export default { distDir: '.next', experimental: { externalDir: true }, webpack(config) { config.resolve.modules.push(${JSON.stringify(posix(path.join(root, 'node_modules')))}); config.resolve.alias['@/contexts/AuthContext'] = path.resolve('./auth.tsx'); config.resolve.alias['@/lib/supabase/client'] = path.resolve('./supabase.ts'); config.resolve.alias['@'] = ${JSON.stringify(posix(path.join(root, 'src')))}; return config; } };`);
arquivo('auth.tsx', `'use client'; export function AuthProvider({children}) { return children; } export function useAuth() { return { isAuthenticated:true, username:'operador@exemplo.invalid', isLoading:false, authError:null, retryAuth(){}, logout: async()=>{}, login:async()=>true }; }`);
arquivo('supabase.ts', `export const supabase = { auth: { getSession:async()=>({data:{session:null}}) } }; export function createClient(){return supabase;}`);
arquivo('app/layout.tsx', `import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter'; import { Providers } from ${JSON.stringify(posix(path.join(root, 'src/app/providers')))}; import ${JSON.stringify(posix(path.join(root, 'src/app/globals.css')))}; export default function Layout({children}) { return <html lang="pt-BR"><body><AppRouterCacheProvider><Providers>{children}</Providers></AppRouterCacheProvider></body></html>; }`);
for (const rota of ['saidas', 'relatorios']) arquivo(`app/${rota}/page.tsx`, `export {default} from ${JSON.stringify(posix(path.join(root, `src/app/${rota}/page`)))};`);
arquivo('app/api/trpc/[trpc]/route.ts', `
const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', pix = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', tipo = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const clientes = [{id, nome:'Fornecedor de demonstração', ativo:true},{id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',nome:'Fornecedor histórico (fictício)',ativo:false}];
let pedidos = [
 {id:'11111111-1111-4111-8111-111111111111',numero:1204,data:'2026-10-03',cliente_id:id,cliente_nome:clientes[0].nome,forma_pagamento_id:pix,forma_pagamento_nome:'PIX',tipo_atendimento_nome:'Saída',tipo_atendimento:'SAIDA',total:450,status:'PENDENTE',observacao:'Compra de materiais para a loja — dados fictícios',versao:1},
 {id:'22222222-2222-4222-8222-222222222222',numero:1203,data:'2026-10-02',cliente_id:null,cliente_nome:null,forma_pagamento_id:pix,forma_pagamento_nome:'PIX',tipo_atendimento_nome:'Saída',tipo_atendimento:'SAIDA',total:1200,status:'FINALIZADO',observacao:'Aluguel — exemplo fictício',versao:1},
 {id:'33333333-3333-4333-8333-333333333333',numero:1202,data:'2026-10-01',cliente_id:id,cliente_nome:clientes[0].nome,forma_pagamento_id:null,forma_pagamento_nome:null,tipo_atendimento_nome:'Saída',tipo_atendimento:'SAIDA',total:89.9,status:'CONFIRMADO',observacao:'Entrega — exemplo fictício',versao:1},
];
const definicao = f => pedidos.filter(p => (!f.search || (p.numero+' '+(p.cliente_nome||'')+' '+p.observacao).toLowerCase().includes(f.search.toLowerCase())) && (!f.status||p.status===f.status) && (!f.clienteId||p.cliente_id===f.clienteId) && (!f.formaPagamentoId||p.forma_pagamento_id===f.formaPagamentoId) && (!f.dataInicio||p.data>=f.dataInicio) && (!f.dataFim||p.data<=f.dataFim));
const produtos = [{produto_id:'a',produto_nome:'Camisa de demonstração',categoria_nome:'Vestuário',unidade:'UN',quantidade_vendida:5,total_vendas:3,valor_total:900},{produto_id:'b',produto_nome:'Kit, "Especial"',categoria_nome:'Acessórios',unidade:'UN',quantidade_vendida:3,total_vendas:2,valor_total:400},{produto_id:'c',produto_nome:'Tecido estampado',categoria_nome:'Tecidos',unidade:'M',quantidade_vendida:1.125,total_vendas:1,valor_total:50}];
async function resolver(nome, f={}) {
 if(nome==='auth.me')return {papel:'ADMIN',id};
 if(nome==='configuracoes.get')return {nome_empresa:'Lojas Manu',nome_sistema:'Demonstração local • dados fictícios',logradouro:'Rua de demonstração',numero:'100',bairro:'Centro',cidade:'Fortaleza',estado:'CE',cep:'60000000',telefone:'(85) 00000-0000',ativo:true};
 if(nome==='dominios.formasPagamento.list')return [{id:pix,nome:'PIX',ativo:true}];
 if(nome==='dominios.tiposAtendimento.list')return [{id:tipo,nome:'Saída',tipo:'SAIDA',ativo:true}];
 if(nome==='clientes.list'){const lista=clientes.filter(c=>(f.ativo===null||c.ativo===true)&&(!f.search||c.nome.toLowerCase().includes(f.search.toLowerCase())));return {clientes:lista,total:lista.length};}
 if(nome==='clientes.getById')return clientes.find(c=>c.id===f.id);
 if(nome==='clientes.create'){const cliente={id:crypto.randomUUID(),nome:f.nome,ativo:true};clientes.push(cliente);return cliente;}
 if(nome==='pedidos.list'){const lista=definicao(f);return {pedidos:lista.slice(f.offset||0,(f.offset||0)+(f.limit||10)),total:lista.length};}
 if(nome==='pedidos.saidasEstatisticas'){const lista=definicao(f),valor=status=>lista.filter(p=>status.includes(p.status)).reduce((s,p)=>s+p.total,0);return {total:lista.length,valorFinalizado:valor(['FINALIZADO']),valorPendente:valor(['PENDENTE','CONFIRMADO']),valorCancelado:valor(['CANCELADO'])};}
 if(nome==='pedidos.getById')return {...pedidos.find(p=>p.id===f.id),itens:[]};
 if(nome==='pedidos.create'){const repetido=pedidos.find(p=>p.chave_requisicao===f.chave_requisicao);if(repetido)return repetido; const p={...f,id:crypto.randomUUID(),numero:1300+pedidos.length,cliente_nome:clientes.find(c=>c.id===f.cliente_id)?.nome||null,forma_pagamento_nome:f.forma_pagamento_id?'PIX':null,tipo_atendimento_nome:'Saída',versao:1};pedidos.unshift(p);return p;}
 if(nome==='pedidos.update'){const p=pedidos.find(p=>p.id===f.id);Object.assign(p,f,{versao:p.versao+1,cliente_nome:clientes.find(c=>c.id===f.cliente_id)?.nome||null,forma_pagamento_nome:f.forma_pagamento_id?'PIX':null});return p;}
 if(nome==='pedidos.finalizar'||nome==='pedidos.cancelar'){const p=pedidos.find(p=>p.id===f.id);p.status=nome.endsWith('finalizar')?'FINALIZADO':'CANCELADO';p.versao++;return p;}
 if(nome==='pedidos.delete'){pedidos=pedidos.filter(p=>p.id!==f.id);return {success:true};}
 if(nome==='relatorios.financeiroPeriodo')return {dataInicio:f.dataInicio,dataFim:f.dataFim,dias:[{data:f.dataInicio,total_pedidos:2,total_itens:3,valor_total:450},{data:f.dataFim,total_pedidos:3,total_itens:6.125,valor_total:900}],produtos,categorias:[{nome:'Vestuário',valor:900},{nome:'Acessórios',valor:400},{nome:'Tecidos',valor:50}],resumo:{totalVendas:1350,totalPedidos:5,totalUnidades:9.125,ticketMedio:270,valorSemItens:0}};
 if(nome==='relatorios.relatorioAnual'){const meses=Array.from({length:12},(_,i)=>({mes:i+1,vendas:i===9?1350:0,despesas:i===9?539.9:0,saldo:i===9?810.1:0}));return {ano:f.ano,linhas:[{natureza:'Venda',pagamento:'PIX',valores:meses.map(m=>m.vendas),total:1350},{natureza:'Despesa',pagamento:'PIX',valores:meses.map(m=>m.despesas),total:539.9}],meses,vendas:1350,despesas:539.9,saldo:810.1};}
 throw new Error('Procedimento não implementado no harness: '+nome);
}
async function tratar(request, contexto){const {trpc}=await contexto.params;const nomes=trpc.split(',');const url=new URL(request.url);const input=request.method==='POST'?await request.json():JSON.parse(url.searchParams.get('input')||'{}');const batch=url.searchParams.get('batch')==='1';const resultados=await Promise.all(nomes.map(async(nome,i)=>{try{return {result:{data:{json:await resolver(nome,(batch?input[i]:input)?.json)}}};}catch(erro){return {error:{json:{message:erro.message,code:-32603,data:{code:'INTERNAL_SERVER_ERROR',httpStatus:500,path:nome}}}};}}));return Response.json(batch?resultados:resultados[0]);}
export const GET=tratar;export const POST=tratar;
`);
fs.mkdirSync(path.join(destino, 'public'), { recursive: true });
for (const nome of ['icon-192x192.png', 'icon-512x512.png']) fs.copyFileSync(path.join(root, 'public', nome), path.join(destino, 'public', nome));
console.log('Harness criado em '+destino+'; use next dev --webpack -p 3043 nessa pasta.');
