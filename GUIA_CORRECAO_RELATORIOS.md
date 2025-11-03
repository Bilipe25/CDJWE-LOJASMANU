# 🔧 GUIA DE CORREÇÃO - Relatórios Vazios

## 🔴 Problema Identificado

Pelos logs do console, vi que:
1. **Dados retornando `undefined`** - A função SQL não existe no banco
2. **Erro 500 (Internal Server Error)** - Função `relatorio_vendas_anual` não encontrada
3. **"Nenhum dado encontrado"** - Pode não ter pedidos em 2025

---

## ✅ SOLUÇÃO - Passo a Passo

### **PASSO 1: Criar as Funções SQL no Supabase**

1. Abra o **Supabase Dashboard**
2. Vá em **SQL Editor** (ícone de código no menu lateral)
3. Clique em **"New Query"**
4. Cole TODO o conteúdo do arquivo `criar_todas_funcoes_relatorios.sql`
5. Clique em **"Run"** (ou pressione Ctrl+Enter)
6. Aguarde a mensagem de sucesso ✅

**Resultado esperado:**
```
Success. No rows returned
```

---

### **PASSO 2: Verificar se as Funções foram Criadas**

Execute esta query no SQL Editor:

```sql
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (routine_name LIKE '%relatorio%' OR routine_name LIKE '%top_produtos%')
ORDER BY routine_name;
```

**Deve retornar 3 funções:**
- `relatorio_vendas_anual`
- `relatorio_vendas_periodo`
- `top_produtos_vendidos`

---

### **PASSO 3: Verificar se há Pedidos em 2025**

Execute esta query:

```sql
SELECT 
    COUNT(*) as total_pedidos,
    MIN(data) as primeira_data,
    MAX(data) as ultima_data
FROM pedidos
WHERE EXTRACT(YEAR FROM data) = 2025
  AND status = 'FINALIZADO';
```

**Se retornar 0 pedidos:**
- Você não tem dados em 2025
- Execute o arquivo `inserir_dados_teste_2025.sql` para criar dados de teste
- OU crie pedidos manualmente no sistema

---

### **PASSO 4: Testar a Função Diretamente**

Execute:

```sql
SELECT * FROM relatorio_vendas_anual(2025);
```

**Deve retornar algo como:**

| forma_pagamento_nome | mes | total_vendas | total_despesas |
|---------------------|-----|--------------|----------------|
| Pix                 | 1   | 500.00       | 0              |
| Dinheiro            | 1   | 300.00       | 0              |
| DIZIMO              | 1   | 0            | 70.00          |
| ...                 | ... | ...          | ...            |

---

### **PASSO 5: Reiniciar o Servidor Next.js**

1. No terminal onde está rodando `npm run dev`
2. Pressione **Ctrl+C** para parar
3. Execute novamente: `npm run dev`
4. Aguarde o servidor iniciar

---

### **PASSO 6: Testar no Navegador**

1. Acesse a página de **Relatórios**
2. Clique na aba **"Relatório Anual"**
3. Verifique se os dados aparecem
4. Abra o console (F12) e veja os logs

**Console deve mostrar:**
```
🔍 Buscando relatório anual para o ano: 2025
✅ Dados retornados do relatório anual: [...]
📊 Total de registros: X
📊 Dados do relatório anual: [...]
```

---

## 📋 Checklist de Verificação

- [ ] Funções SQL criadas no Supabase
- [ ] Verificado que as 3 funções existem
- [ ] Há pedidos FINALIZADOS em 2025
- [ ] Existe cliente com nome "DIZIMO"
- [ ] Existe tipo de atendimento com tipo "SAIDA"
- [ ] A função `relatorio_vendas_anual(2025)` retorna dados
- [ ] Servidor Next.js reiniciado
- [ ] Página atualizada e testada

---

## 🆘 Se Ainda Não Funcionar

Execute no SQL Editor e me envie os resultados:

```sql
-- 1. Verificar pedidos
SELECT COUNT(*) as total FROM pedidos WHERE EXTRACT(YEAR FROM data) = 2025;

-- 2. Verificar cliente DIZIMO
SELECT * FROM clientes WHERE nome = 'DIZIMO';

-- 3. Verificar tipos de atendimento
SELECT * FROM tipos_atendimento WHERE ativo = true;

-- 4. Testar função
SELECT * FROM relatorio_vendas_anual(2025);
```

---

## 📝 Arquivos Criados

1. **criar_todas_funcoes_relatorios.sql** - Cria as 3 funções necessárias (EXECUTE ESTE!)
2. **inserir_dados_teste_2025.sql** - Insere dados de teste (opcional)
3. **teste_relatorio_anual.sql** - Queries para diagnóstico
4. **criar_funcao_relatorio_vendas_anual.sql** - Só a função anual (redundante)

---

## 💡 Dica

O problema principal é que **as funções SQL não existem no banco de dados**.

Depois de criar as funções com o arquivo `criar_todas_funcoes_relatorios.sql`, tudo deve funcionar!

