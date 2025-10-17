# 🔧 Correção do Erro: telefone_contato

## ❌ Erro Atual
```
Could not find the 'telefone_contato' column of 'pedidos' in the schema cache
```

## ✅ Solução

A coluna `telefone_contato` precisa ser adicionada à tabela `pedidos` no banco de dados.

### **Passo 1: Acessar Supabase**
1. Acesse seu projeto no [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá em **SQL Editor** (ícone de banco de dados no menu lateral)

### **Passo 2: Executar a Migração**
1. Clique em **+ New query**
2. Copie e cole o SQL abaixo:

```sql
-- Adicionar coluna telefone_contato na tabela pedidos
ALTER TABLE pedidos 
ADD COLUMN IF NOT EXISTS telefone_contato VARCHAR(20);

-- Adicionar comentário na coluna
COMMENT ON COLUMN pedidos.telefone_contato IS 'Telefone de contato para o pedido';
```

3. Clique em **Run** (ou pressione `Ctrl+Enter`)

### **Passo 3: Verificar**
Execute este SQL para confirmar:

```sql
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'pedidos' AND column_name = 'telefone_contato';
```

Deve retornar:
| column_name | data_type | character_maximum_length |
|-------------|-----------|--------------------------|
| telefone_contato | character varying | 20 |

### **Passo 4: Testar**
1. Volte para sua aplicação
2. Recarregue a página (F5)
3. Tente criar um pedido novamente
4. ✅ O erro deve ter sido corrigido!

---

## 📋 Alternativa: Script já Pronto

Você também pode executar o arquivo `ADD_TELEFONE_CONTATO_MIGRATION.sql` que foi criado na raiz do projeto.

---

## ⚠️ Observação

Esta migração:
- ✅ É segura (não deleta dados)
- ✅ Usa `IF NOT EXISTS` (pode executar múltiplas vezes)
- ✅ Adiciona a coluna sem afetar dados existentes
- ✅ Permite valores NULL (para pedidos antigos)

---

## 🎯 O que essa coluna faz?

A coluna `telefone_contato` armazena o telefone de contato específico para aquele pedido, que pode ser diferente do telefone cadastrado no cliente.

**Uso no PDV:**
- Cliente pode informar telefone alternativo
- Útil para entregas
- Aparece no PDF do pedido
