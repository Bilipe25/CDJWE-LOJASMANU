# Endereços de clientes

Clientes e o cadastro rápido do PDV compartilham campos e validação de identidade
em `ClienteDadosFields` e `clienteSchema`. Os endereços usam `EnderecoFields` e
`enderecoSchema`. Número, complemento, bairro, cidade, UF e CEP são armazenados
em colunas separadas, junto ao logradouro. Campos opcionais vazios podem ser
limpos na edição. Um endereço parcialmente preenchido exige logradouro.

Em Clientes, a lista permite adicionar, editar, desativar e reativar endereços,
além de escolher o principal. Um índice parcial garante no máximo um principal
ativo por cliente. A gravação de cliente e endereços ocorre na mesma transação;
retirar um endereço existente o desativa, preservando seus vínculos históricos.

As telas e os PDFs usam `formatarEndereco`. Pedidos consultam o endereço pelo
`endereco_id` da venda e sua cópia histórica em `pedidos.endereco_snapshot`;
não substituem esse endereço pelo principal atual do cliente. A edição aguarda
carregar os endereços antes de restaurar a seleção. Um endereço desativado pode
ser mantido no pedido antigo; para uma venda nova é necessário um endereço ativo.
Pedidos sem endereço mantêm essa ausência até o operador selecionar um.

## Banco de dados

Se as colunas completas ainda não existirem no Supabase, execute
`ADD_CAMPOS_ENDERECO_MIGRATION.sql` no SQL Editor. O script é idempotente e adiciona
os campos ausentes da view de pedidos ao final, preservando as demais colunas e
dependências. A aplicação consulta a tabela de endereços diretamente e não exige
a atualização da view para montar o endereço completo.

As migrações `supabase/migrations/202610010001_p0_p1_integridade.sql` e
`supabase/migrations/202610010002_p2_cadastro_consultas.sql`, nessa ordem,
adicionam as regras transacionais, acesso protegido, situação dos endereços e
cópia histórica. A P2 foi aplicada e verificada no projeto lojasmanu em 01/10/2026.
Consulte `docs/auditoria-2026-10-01/correcoes-p2.md` para evidências e limites.

`supabase_views.sql` contém as definições para uma instalação inicial. Em bancos
existentes, use as migrações para preservar o contrato das views.

A correção não recupera automaticamente campos descartados pelo schema antigo.
Cadastros antigos que perderam dados precisam ser completados em Clientes.
Endereços legados gravados em uma única linha continuam sendo exibidos como estão;
não se tenta separar automaticamente textos livres. Na migração P2, os pedidos
antigos recebem uma cópia do endereço conhecido naquele momento. Isso não
recupera o endereço original de uma venda cujo cadastro já foi alterado antes da
migração. Depois da cópia, mudanças no cadastro não alteram a reimpressão.
Trocar explicitamente o endereço do pedido atualiza sua cópia; remover limpa-a.

## Validação

```sh
npm run test:enderecos
npm run test:p2
npm run type-check
npm run build
```

Os testes executam routers e migrações com PGlite (PostgreSQL em memória), sem
acesso ao Supabase de produção. Cobrem transações, preservação e limpeza de
campos, múltiplos endereços, principal único, cópia histórica com campos nulos,
troca e ausência de endereço, desativação, consulta paginada e reaplicação da
migração sem alterar versão ou data de atualização dos pedidos.
