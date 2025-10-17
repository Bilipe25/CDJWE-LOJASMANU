# 🚀 Setup - PDV Lojas Manu

## 📋 Pré-requisitos

- Node.js 18+ instalado
- Conta no Supabase (já configurada)
- Git (opcional)

## ⚙️ Instalação Rápida

### 1️⃣ Instalar Dependências

```bash
cd c:\Users\Pedro\Desktop\projetolojasmanu
npm install
```

⏱️ Isso pode levar alguns minutos...

### 2️⃣ Configurar Variáveis de Ambiente

**Obter a ANON_KEY do Supabase:**

1. Acesse: https://supabase.com/dashboard/project/fuqycopmtebzypcsuzpa/settings/api
2. Copie a chave **"anon public"**

**Criar arquivo `.env.local`:**

```bash
# Na raiz do projeto, copie o exemplo
copy .env.local.example .env.local
```

**Edite `.env.local` e adicione sua chave:**

```env
NEXT_PUBLIC_SUPABASE_URL=https://fuqycopmtebzypcsuzpa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_aqui
```

### 3️⃣ Executar em Desenvolvimento

```bash
npm run dev
```

✅ Abra: http://localhost:3000

## 🎨 Personalizar Configurações da Empresa

### Opção 1: Via Supabase Dashboard

1. Acesse: https://supabase.com/dashboard/project/fuqycopmtebzypcsuzpa/editor
2. Abra a tabela **`configuracoes_empresa`**
3. Edite o único registro existente
4. Clique em **Save**

### Opção 2: Via SQL Editor

Acesse: https://supabase.com/dashboard/project/fuqycopmtebzypcsuzpa/sql

Execute:

```sql
UPDATE configuracoes_empresa
SET 
  nome_empresa = 'Sua Empresa',
  razao_social = 'Sua Empresa Ltda',
  cnpj = '00.000.000/0000-00',
  telefone = '(00) 0 0000-0000',
  email = 'contato@suaempresa.com',
  
  -- Endereço
  logradouro = 'Rua Exemplo',
  numero = '123',
  bairro = 'Centro',
  cidade = 'Sua Cidade',
  estado = 'SE',
  cep = '00000-000',
  
  -- Branding (cores em hexadecimal)
  cor_primaria = '#0ea5e9',
  cor_secundaria = '#0284c7',
  
  -- Nome do sistema
  nome_sistema = 'PDV Sua Empresa',
  
  -- Redes sociais
  site = 'https://www.suaempresa.com',
  instagram = '@suaempresa',
  facebook = 'suaempresa'
WHERE ativo = true;
```

### Campos da Tabela `configuracoes_empresa`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| **nome_empresa** | VARCHAR(200) | Nome fantasia da empresa |
| **razao_social** | VARCHAR(200) | Razão social (opcional) |
| **cnpj** | VARCHAR(18) | CNPJ formatado |
| **telefone** | VARCHAR(20) | Telefone principal |
| **email** | VARCHAR(100) | Email de contato |
| **logradouro** | TEXT | Rua/Avenida |
| **numero** | VARCHAR(20) | Número do endereço |
| **complemento** | VARCHAR(100) | Complemento (opcional) |
| **bairro** | VARCHAR(100) | Bairro |
| **cidade** | VARCHAR(100) | Cidade |
| **estado** | VARCHAR(2) | UF (ex: SE) |
| **cep** | VARCHAR(10) | CEP |
| **logo_url** | TEXT | URL do logo principal |
| **logo_pequeno_url** | TEXT | URL do logo pequeno |
| **cor_primaria** | VARCHAR(7) | Cor principal (#0ea5e9) |
| **cor_secundaria** | VARCHAR(7) | Cor secundária (#0284c7) |
| **nome_sistema** | VARCHAR(100) | Nome do sistema |
| **site** | VARCHAR(200) | Site da empresa |
| **instagram** | VARCHAR(100) | Instagram (@usuario) |
| **facebook** | VARCHAR(100) | Facebook (usuario) |
| **mostrar_logo_relatorio** | BOOLEAN | Exibir logo em relatórios |
| **rodape_relatorio** | TEXT | Texto do rodapé em relatórios |

## 🎨 Cores do Tema

### Tema Azul Moderno (Padrão)

```css
Primária:    #0ea5e9  /* Sky Blue 500 */
Secundária:  #0284c7  /* Sky Blue 600 */
Sucesso:     #10b981  /* Emerald 500 */
Erro:        #ef4444  /* Red 500 */
Aviso:       #f59e0b  /* Amber 500 */
Info:        #3b82f6  /* Blue 500 */
```

### Como Personalizar

**Opção 1:** Editar `configuracoes_empresa` no banco de dados

**Opção 2:** Criar um componente de configurações no frontend (próximo passo)

## 📂 Upload de Logo

### Via Supabase Storage (Recomendado)

1. Acesse: https://supabase.com/dashboard/project/fuqycopmtebzypcsuzpa/storage
2. Crie um bucket público chamado **`logos`**
3. Faça upload do seu logo
4. Copie a URL pública
5. Atualize `logo_url` na tabela `configuracoes_empresa`

Exemplo de URL:
```
https://fuqycopmtebzypcsuzpa.supabase.co/storage/v1/object/public/logos/logo.png
```

## 🔧 Comandos Úteis

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Executar build de produção
npm start

# Verificar erros de tipos
npm run type-check

# Lint
npm run lint
```

## 📊 Status do Banco de Dados

### ✅ Tabelas Criadas
- [x] `configuracoes_empresa` - Configurações globais
- [x] `clientes` - 298 registros migrados
- [x] `produtos` - 38 registros migrados
- [x] `cores` - 33 registros migrados
- [x] `categorias` - 14 categorias
- [x] `formas_pagamento` - 8 formas
- [x] `tipos_atendimento` - 4 tipos
- [x] `enderecos` - Vinculados aos clientes
- [x] `pedidos` - 1.382 pedidos históricos
- [x] `itens_pedido` - 1.440 itens

### ✅ Views Criadas
- [x] `vw_pedidos_completos`
- [x] `vw_itens_pedido_completos`
- [x] `vw_clientes_completos`
- [x] `vw_produtos_completos`

### ✅ Functions Criadas
- [x] `obter_proximo_numero_pedido()`
- [x] `duplicar_pedido()`
- [x] `relatorio_vendas_periodo()`
- [x] `top_produtos_vendidos()`
- [x] `converter_valor_monetario()`

## 🔐 Segurança

- ✅ Row Level Security (RLS) habilitado em todas as tabelas
- ✅ Políticas de acesso configuradas
- ✅ Foreign Keys e Constraints definidos
- ✅ Índices para otimização de queries

## 🚨 Troubleshooting

### Erro: "Cannot find module"

```bash
# Reinstalar dependências
rm -rf node_modules
npm install
```

### Erro: "Supabase error"

1. Verifique se a `NEXT_PUBLIC_SUPABASE_ANON_KEY` está correta
2. Verifique se o projeto Supabase está ativo
3. Verifique a conexão com internet

### Erro: "RLS policy"

As políticas RLS estão configuradas para permitir acesso público (para desenvolvimento).
Para produção, você deve implementar autenticação.

## 📱 PWA (Progressive Web App)

O sistema pode ser instalado como aplicativo:

- **Android**: Menu → "Adicionar à tela inicial"
- **iOS**: Compartilhar → "Adicionar à Tela de Início"
- **Desktop**: Ícone de instalação na barra de endereço

## 🎯 Próximos Passos

Agora que a base está configurada, você pode:

1. ✅ **Testar o sistema**: `npm run dev`
2. ✅ **Personalizar configurações**: Editar `configuracoes_empresa`
3. ⏭️ **Desenvolver páginas**: PDV, Clientes, Produtos, etc
4. ⏭️ **Adicionar autenticação**: Supabase Auth
5. ⏭️ **Deploy**: Vercel, Netlify, ou outro

## 📞 Links Úteis

- **Supabase Dashboard**: https://supabase.com/dashboard/project/fuqycopmtebzypcsuzpa
- **SQL Editor**: https://supabase.com/dashboard/project/fuqycopmtebzypcsuzpa/sql
- **Table Editor**: https://supabase.com/dashboard/project/fuqycopmtebzypcsuzpa/editor
- **API Docs**: https://supabase.com/dashboard/project/fuqycopmtebzypcsuzpa/api
- **Storage**: https://supabase.com/dashboard/project/fuqycopmtebzypcsuzpa/storage

---

**🎉 Configuração concluída! O sistema está pronto para uso.**
