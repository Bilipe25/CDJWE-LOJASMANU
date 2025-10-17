# 🛒 PDV Lojas Manu

Sistema de Ponto de Venda moderno e profissional para Lojas Manu, desenvolvido com Next.js 15 e Supabase.

## 🎯 Características

- ✅ **Sistema PDV Completo** - Gestão de vendas, produtos, clientes e pedidos
- ✅ **Banco de Dados Normalizado** - Schema profissional com relacionamentos e constraints
- ✅ **Offline First** - Funciona sem internet usando IndexedDB
- ✅ **PWA** - Instalável como aplicativo nativo
- ✅ **Tema Moderno** - Design azul sofisticado e responsivo
- ✅ **TypeScript** - Type-safe em todo o projeto
- ✅ **Relatórios** - PDF, Excel e gráficos interativos

## 🛠️ Stack Tecnológica

### **Framework & Core**
- Next.js 15 (App Router)
- TypeScript
- React 19

### **Backend & Database**
- Supabase (PostgreSQL)
- tRPC (Type-safe API)
- Row Level Security (RLS)

### **Estado & Cache**
- Zustand (Estado global)
- TanStack Query v5 (Server state)
- IndexedDB (Offline sync)

### **UI & Styling**
- Material-UI (MUI)
- Tailwind CSS
- Framer Motion (Animações)
- React Aria (Acessibilidade)

### **Formulários & Validação**
- React Hook Form
- Zod (Schema validation)

### **Relatórios**
- pdfmake (PDF)
- xlsx (Excel)
- Recharts (Gráficos)

### **PWA & Offline**
- next-pwa
- IndexedDB (idb)

## 📦 Instalação

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo `.env.local.example` para `.env.local`:

```bash
cp .env.local.example .env.local
```

Edite o arquivo `.env.local` e adicione suas credenciais do Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://fuqycopmtebzypcsuzpa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=seu_anon_key_aqui
```

**Para obter o ANON_KEY:**
1. Acesse: https://supabase.com/dashboard/project/fuqycopmtebzypcsuzpa/settings/api
2. Copie a chave "anon public"

### 3. Executar em Desenvolvimento

```bash
npm run dev
```

Acesse: http://localhost:3000

### 4. Build para Produção

```bash
npm run build
npm start
```

## 🗄️ Estrutura do Banco de Dados

### **Tabelas Principais**

#### **configuracoes_empresa**
- Configurações globais da empresa (nome, logo, cores, etc)
- Usado em todo o sistema para branding e relatórios

#### **clientes**
- Cadastro de clientes com CPF, telefone
- Relacionado com `enderecos`

#### **produtos**
- Cadastro de produtos com código, valor, categoria
- Relacionado com `categorias` e usado em `itens_pedido`

#### **pedidos**
- Pedidos de venda com cliente, forma de pagamento, totais
- Status: PENDENTE, CONFIRMADO, CANCELADO, FINALIZADO

#### **itens_pedido**
- Itens individuais de cada pedido
- Relacionado com `produtos` e `cores`

#### **Tabelas de Domínio**
- `categorias` - Categorias de produtos
- `cores` - Cores disponíveis
- `formas_pagamento` - Formas de pagamento
- `tipos_atendimento` - Tipos de movimento (ENTRADA, SAIDA, etc)
- `enderecos` - Endereços dos clientes

### **Views & Functions**

- `vw_pedidos_completos` - Pedidos com todos os dados relacionados
- `vw_itens_pedido_completos` - Itens com produto, cor, categoria
- `vw_clientes_completos` - Clientes com endereço e estatísticas
- `vw_produtos_completos` - Produtos com categoria
- `obter_proximo_numero_pedido()` - Gera número sequencial
- `duplicar_pedido()` - Duplica pedido existente
- `relatorio_vendas_periodo()` - Relatório de vendas
- `top_produtos_vendidos()` - Produtos mais vendidos

## 📁 Estrutura do Projeto

```
projetolojasmanu/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/trpc/          # API tRPC
│   │   ├── layout.tsx         # Layout principal
│   │   ├── page.tsx           # Página inicial
│   │   ├── providers.tsx      # Providers (React Query, Theme)
│   │   └── globals.css        # Estilos globais
│   ├── components/            # Componentes React
│   ├── hooks/                 # Custom hooks
│   │   └── useConfiguracoes.ts
│   ├── lib/                   # Bibliotecas e configs
│   │   ├── supabase/         # Cliente Supabase
│   │   ├── trpc/             # Configuração tRPC
│   │   └── offline/          # IndexedDB
│   ├── server/                # Backend tRPC
│   │   └── routers/          # Routers da API
│   │       ├── _app.ts       # App router principal
│   │       ├── produtos.ts
│   │       ├── clientes.ts
│   │       ├── pedidos.ts
│   │       ├── dominios.ts
│   │       ├── relatorios.ts
│   │       └── configuracoes.ts
│   ├── stores/               # Zustand stores
│   │   └── pdv-store.ts
│   └── types/                # TypeScript types
│       └── database.types.ts
├── public/                   # Assets públicos
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.mjs
```

## 🎨 Personalização

### **Configurações da Empresa**

Todas as configurações da empresa são armazenadas na tabela `configuracoes_empresa`. Para personalizar:

1. Acesse o Supabase Dashboard
2. Vá para a tabela `configuracoes_empresa`
3. Edite os campos:
   - `nome_empresa` - Nome da sua empresa
   - `cnpj` - CNPJ da empresa
   - `telefone` - Telefone de contato
   - `cor_primaria` - Cor principal (hex)
   - `cor_secundaria` - Cor secundária (hex)
   - `logo_url` - URL do logo
   - E outros campos de endereço, redes sociais, etc

O sistema automaticamente usará essas configurações em:
- Cabeçalho do sistema
- Relatórios PDF
- Exportações Excel
- Tema visual

### **Hook de Configurações**

Use o hook `useConfiguracoes()` em qualquer componente:

```typescript
import { useConfiguracoes } from '@/hooks/useConfiguracoes';

function MeuComponente() {
  const { nomeEmpresa, corPrimaria, telefone, logoUrl } = useConfiguracoes();
  
  return <div style={{ color: corPrimaria }}>{nomeEmpresa}</div>;
}
```

## 📊 Dados Importados

O sistema já possui dados migrados das suas planilhas Excel:
- ✅ 298 clientes
- ✅ 38 produtos
- ✅ 33 cores
- ✅ 1.382 pedidos históricos
- ✅ 1.440 itens de pedidos

Todos os dados foram **normalizados** e agora possuem:
- IDs únicos (UUID)
- Relacionamentos com Foreign Keys
- Índices para performance
- Constraints de integridade

## 🚀 Próximos Passos

1. **Instalar dependências**: `npm install`
2. **Configurar .env.local**: Adicionar SUPABASE_ANON_KEY
3. **Executar**: `npm run dev`
4. **Personalizar**: Editar `configuracoes_empresa` no Supabase
5. **Desenvolver páginas**: PDV, Clientes, Produtos, Relatórios

## 📝 Comandos Úteis

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Produção
npm start

# Lint
npm run lint

# Type check
npm run type-check
```

## 🔒 Segurança

- ✅ Row Level Security (RLS) habilitado
- ✅ Validação com Zod em todas as rotas
- ✅ Type-safety com TypeScript
- ✅ Foreign Keys e Constraints no banco
- ✅ Variáveis de ambiente para credenciais

## 📱 PWA

O sistema funciona offline e pode ser instalado:
- 📱 Android: "Adicionar à tela inicial"
- 🍎 iOS: "Adicionar à Tela de Início"
- 💻 Desktop: Ícone de instalação no navegador

## 🎨 Tema Azul Moderno

O tema utiliza a paleta **Sky Blue** (Tailwind) com:
- Cor primária: `#0ea5e9`
- Cor secundária: `#0284c7`
- Sombras suaves e modernas
- Bordas arredondadas
- Transições suaves
- Fonte Inter

## 📞 Suporte

Para dúvidas ou problemas, consulte:
- Documentação do Supabase: https://supabase.com/docs
- Documentação do Next.js: https://nextjs.org/docs
- Documentação do MUI: https://mui.com/

---

**Desenvolvido para Lojas Manu** 🛍️
