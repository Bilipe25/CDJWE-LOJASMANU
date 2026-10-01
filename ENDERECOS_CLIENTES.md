# Endereços de clientes

Clientes e o cadastro rápido do PDV usam `EnderecoFields` e o mesmo schema de
criação/edição. Número, complemento, bairro, cidade, UF e CEP são armazenados em
colunas separadas, junto ao logradouro. Campos opcionais vazios podem ser limpos
na edição. Um endereço parcialmente preenchido exige logradouro.

As telas e os PDFs usam `formatarEndereco`. Pedidos consultam o endereço pelo
`endereco_id` da venda; não substituem esse endereço pelo principal atual do
cliente. A edição aguarda carregar os endereços antes de restaurar a seleção.
Pedidos sem endereço mantêm essa ausência até o operador selecionar um.

## Banco de dados

Se as colunas completas ainda não existirem no Supabase, execute
`ADD_CAMPOS_ENDERECO_MIGRATION.sql` no SQL Editor. O script é idempotente e adiciona
os campos ausentes da view de pedidos ao final, preservando as demais colunas e
dependências. A aplicação consulta a tabela de endereços diretamente e não exige
a atualização da view para montar o endereço completo.

`supabase_views.sql` contém as definições para uma instalação inicial. Em bancos
existentes, use a migration acima para preservar o contrato das views.

A correção não recupera automaticamente campos descartados pelo schema antigo.
Cadastros antigos que perderam dados precisam ser completados em Clientes.
Endereços legados gravados em uma única linha continuam sendo exibidos como estão;
não se tenta separar automaticamente textos livres. Pedidos seguem referenciando
o cadastro de endereço, sem cópia histórica: alterar esse registro também altera
o endereço exibido em futuras reimpressões dos pedidos que o referenciam.

## Validação

```sh
npm run test:enderecos
npm run type-check
npm run build
```

Os testes executam os routers reais com banco em memória, sem acesso ao Supabase,
e cobrem preservação dos campos, limpeza de complemento, endereço secundário do
pedido, ausência de endereço, falhas de consulta e troca de cliente. A migração
deve ser validada no banco de destino antes de sua aplicação; os testes locais
não executam PostgreSQL.
