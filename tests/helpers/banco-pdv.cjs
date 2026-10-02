const { PGlite } = require('@electric-sql/pglite');
const fs = require('node:fs');
const path = require('node:path');
const usuario = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const produto = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const atendimento = '66666666-6666-4666-8666-666666666666';

async function criarBanco({ schemaProducao = false } = {}) {
  const pg = new PGlite();
  await pg.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE TABLE clientes(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),nome text NOT NULL,cpf text,telefone text,email text,ativo boolean DEFAULT true,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
    CREATE TABLE enderecos(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),cliente_id uuid REFERENCES clientes(id),logradouro text NOT NULL,numero text,complemento text,bairro text,cidade text,estado text,cep text,principal boolean DEFAULT true);
    CREATE TABLE tipos_atendimento(id uuid PRIMARY KEY,nome text,tipo text);
    CREATE TABLE formas_pagamento(id uuid PRIMARY KEY,nome text);
    CREATE TABLE categorias(id uuid PRIMARY KEY,nome text);
    CREATE TABLE cores(id uuid PRIMARY KEY,descricao text,codigo text,linha text);
    CREATE TABLE produtos(id uuid PRIMARY KEY,nome text,codigo text,unidade text,valor_base numeric,categoria_id uuid REFERENCES categorias(id));
    CREATE TABLE pedidos(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),numero bigint,data date NOT NULL,cliente_id uuid REFERENCES clientes(id),endereco_id uuid REFERENCES enderecos(id),tipo_atendimento_id uuid REFERENCES tipos_atendimento(id),forma_pagamento_id uuid REFERENCES formas_pagamento(id),telefone_contato text,desconto_valor numeric DEFAULT 0,subtotal numeric DEFAULT 0,total numeric DEFAULT 0,descricao text,observacao text,status text DEFAULT 'PENDENTE',created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now(),created_by uuid,updated_by uuid);
    CREATE TABLE itens_pedido(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),pedido_id uuid REFERENCES pedidos(id),produto_id uuid REFERENCES produtos(id),cor_id uuid REFERENCES cores(id),quantidade numeric,valor_unitario numeric,desconto_valor numeric,valor_total numeric,ordem integer,updated_at timestamptz DEFAULT now());
    CREATE SEQUENCE numero_pedido;
    CREATE FUNCTION obter_proximo_numero_pedido() RETURNS bigint LANGUAGE sql AS $$ SELECT nextval('numero_pedido') $$;
    CREATE FUNCTION duplicar_pedido(uuid) RETURNS uuid LANGUAGE sql AS $$ SELECT $1 $$;
    INSERT INTO auth.users VALUES ('${usuario}');
    INSERT INTO tipos_atendimento VALUES ('${atendimento}','Venda','ENTRADA');
    INSERT INTO produtos VALUES ('${produto}','Produto de teste','P1','UN',10,NULL);
  `);
  if (schemaProducao) {
    // Metadados/triggers conferidos no Supabase real em 01/10/2026.
    await pg.exec(`
      CREATE TABLE "tblClientes"(id bigint,cpf text);
      CREATE TABLE "tblPedidos"(id bigint);
      CREATE TABLE "tblItensPedidos"(id bigint);
      CREATE TABLE "tblProdutos"(id bigint);
      CREATE TABLE "tblCores"(id bigint);
      GRANT ALL ON "tblClientes","tblPedidos","tblItensPedidos","tblProdutos","tblCores" TO anon,authenticated;
      ALTER TABLE itens_pedido ALTER COLUMN quantidade TYPE numeric(10,3), ALTER COLUMN valor_unitario TYPE numeric(10,2), ALTER COLUMN desconto_valor TYPE numeric(10,2), ALTER COLUMN valor_total TYPE numeric(10,2);
      ALTER TABLE pedidos ALTER COLUMN subtotal TYPE numeric(10,2), ALTER COLUMN desconto_valor TYPE numeric(10,2), ALTER COLUMN total TYPE numeric(10,2);
      ALTER TABLE pedidos ADD CONSTRAINT pedidos_numero_key UNIQUE(numero);
      CREATE OR REPLACE FUNCTION obter_proximo_numero_pedido() RETURNS bigint LANGUAGE sql AS $$ SELECT coalesce(max(numero),0)+1 FROM pedidos $$;
      CREATE FUNCTION calcular_total_item() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.valor_total = (NEW.quantidade * NEW.valor_unitario) - coalesce(NEW.desconto_valor,0); RETURN NEW; END $$;
      CREATE TRIGGER calcular_total_item BEFORE INSERT OR UPDATE ON itens_pedido FOR EACH ROW EXECUTE FUNCTION calcular_total_item();
      CREATE FUNCTION atualizar_total_pedido() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        UPDATE pedidos SET subtotal=(SELECT coalesce(sum(valor_total),0) FROM itens_pedido WHERE pedido_id=coalesce(NEW.pedido_id,OLD.pedido_id)),
          total=(SELECT coalesce(sum(valor_total),0)-coalesce(pedidos.desconto_valor,0) FROM itens_pedido WHERE pedido_id=coalesce(NEW.pedido_id,OLD.pedido_id))
        WHERE id=coalesce(NEW.pedido_id,OLD.pedido_id);
        RETURN coalesce(NEW,OLD);
      END $$;
      CREATE TRIGGER atualizar_total_pedido AFTER INSERT OR UPDATE OR DELETE ON itens_pedido FOR EACH ROW EXECUTE FUNCTION atualizar_total_pedido();
    `);
  }
  await pg.exec(fs.readFileSync(path.join(__dirname,'../../supabase_views.sql'),'utf8'));
  await pg.exec(`CREATE VIEW vw_clientes_completos AS SELECT c.*,NULL::text AS endereco_principal FROM clientes c;`);
  if (schemaProducao) {
    await pg.exec(fs.readFileSync(path.join(__dirname,'../../ADD_CAMPOS_ENDERECO_MIGRATION.sql'),'utf8'));
    await pg.exec(fs.readFileSync(path.join(__dirname,'../../ADD_TELEFONE_CONTATO_MIGRATION.sql'),'utf8'));
  }
  const migration = fs.readFileSync(path.join(__dirname,'../../supabase/migrations/202610010001_p0_p1_integridade.sql'),'utf8');
  await pg.exec(migration);
  // Confere reaplicação sem recriar colunas/views/policies incompatíveis.
  await pg.exec(migration);
  await pg.exec('ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true');
  const migrationP2 = fs.readFileSync(path.join(__dirname,'../../supabase/migrations/202610010002_p2_cadastro_consultas.sql'),'utf8');
  await pg.exec(migrationP2); await pg.exec(migrationP2);
  await pg.query('INSERT INTO pdv_operadores VALUES ($1,$2,true)', [usuario,'ADMIN']);
  await pg.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[usuario]);

  const rpc = async (nome,args={}) => {
    if (!/^[a-z_]+$/.test(nome)) throw new Error('RPC inválida');
    const campos = Object.keys(args);
    if (campos.some(c=>!/^p_[a-z_]+$/.test(c))) throw new Error('Argumento inválido');
    try {
      const retorno=await pg.query(`SELECT public.${nome}(${campos.map((c,i)=>`${c} => $${i+1}`).join(',')}) AS data`,campos.map(c=>typeof args[c]==='object' && args[c]!==null && !Array.isArray(args[c]) ? JSON.stringify(args[c]) : args[c]));
      return { data: nome==='pdv_totais_clientes' ? (await pg.query('SELECT * FROM pdv_totais_clientes($1)',[args.p_ids])).rows : retorno.rows[0].data, error: null };
    } catch (error) { return { data: null,error:{message:error.message,code:error.code} }; }
  };
  const supabase = { rpc, from(tabela) {
    if (!/^[a-z_]+$/.test(tabela)) throw new Error('Tabela inválida');
    const filtros=[], valores=[], ordens=[]; let unico=false,head=false,inicio,limite;
    const adicionar=(col,op,valor)=>{ valores.push(valor); filtros.push(`${col} ${op} $${valores.length}`); return q; };
    const q={
      select(col,opcoes) { head=!!opcoes?.head; return q; },
      eq(c,v) { return adicionar(c,'=',v); }, neq(c,v) { return adicionar(c,'<>',v); },
      gte(c,v) { return adicionar(c,'>=',v); }, lte(c,v) { return adicionar(c,'<=',v); },
      ilike(c,v) { return adicionar(c,'ILIKE',v); },
      is(c,v) { filtros.push(`${c} IS ${v===null ? 'NULL' : v}`); return q; },
      in(c,vs) { filtros.push(`${c} IN (${vs.map(v=>{valores.push(v);return '$'+valores.length;}).join(',')})`);return q; },
      or(expressao) { filtros.push('('+expressao.split(',').map(part=>{ const [c,op,...rest]=part.split('.');const v=rest.join('.'); if(op==='is')return `${c} IS NULL`;valores.push(v);return `${c} ${ {eq:'=',neq:'<>',ilike:'ILIKE'}[op] } $${valores.length}`; }).join(' OR ')+')');return q; },
      order(c,opcoes) { ordens.push(c+(opcoes?.ascending===false?' DESC':' ASC'));return q; },
      range(a,b) { inicio=a;limite=b-a+1;return q; },
      single() { unico=true;return q; }, maybeSingle() { unico=true;return q; },
      async then(resolve,reject) {
        try {
          const base=`FROM public.${tabela}`+(filtros.length?' WHERE '+filtros.join(' AND '):'');
          const count=Number((await pg.query('SELECT count(*) AS total '+base,valores)).rows[0].total);
          const rows=(await pg.query('SELECT * '+base+(ordens.length?' ORDER BY '+ordens.join(','):'')+(limite!==undefined?` LIMIT ${limite} OFFSET ${inicio}`:''),valores)).rows.map(row => Object.fromEntries(Object.entries(row).map(([col,valor]) => [col,valor!==null && (['quantidade','valor_total','valor_unitario','desconto_valor','subtotal','total','valor_base','versao'].includes(col) || (col==='numero' && ['pedidos','vw_pedidos_completos'].includes(tabela))) ? Number(valor) : valor instanceof Date ? valor.toISOString().slice(0,10) : valor])));
          const error=unico && rows.length!==1 ? {message:'Registro não encontrado'} : null;
          return resolve({data:head?null:unico?rows[0]??null:rows,error,count});
        } catch(error) { return resolve({data:null,error:{message:error.message,code:error.code}}); }
      },
    }; return q;
  }};
  return { pg,supabase,usuario,produto,atendimento,close:()=>pg.close() };
}
module.exports = { criarBanco,usuario,produto,atendimento };
