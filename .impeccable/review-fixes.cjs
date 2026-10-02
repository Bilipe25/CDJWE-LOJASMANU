const fs = require('node:fs');
function region(s, a, b, replacement) {
  const start = s.indexOf(a), end = s.indexOf(b, start);
  if (start < 0 || end < 0) throw new Error(a);
  return s.slice(0, start) + replacement + s.slice(end);
}
let s = fs.readFileSync('src/app/pedidos/page.tsx', 'utf8').replace(/\r\n/g, '\n');
s = region(s, '              {/* Informações Gerais */}', '              {/* Itens do Pedido */}', `              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{formatDate(pedidoCompleto.data)}</Typography>
              <Grid container spacing={2} sx={{ p: 2, bgcolor: 'background.default', borderRadius: '12px' }}>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">Cliente</Typography>
                  <Typography fontWeight={600}>{pedidoCompleto.cliente_nome || 'Não informado'}</Typography>
                  <Typography variant="body2">{pedidoCompleto.cliente_telefone || 'Telefone não informado'}</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">Endereço do pedido</Typography>
                  <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{formatarEndereco(pedidoCompleto.endereco) || 'Não informado'}</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">Atendimento e pagamento</Typography>
                  <Typography fontWeight={600}>{pedidoCompleto.tipo_atendimento_nome || '-'}</Typography>
                  <Typography variant="body2">{pedidoCompleto.forma_pagamento_nome || '-'}</Typography>
                </Grid>
              </Grid>

`);
s=s.replace('<Box sx={{ mt: 3, p: 2, bgcolor: \'background.default\', borderRadius: 2 }}>','<Box sx={{ mt: 3, p: 2, ml: \'auto\', width: { xs: \'100%\', sm: 320 }, bgcolor: \'background.default\', borderRadius: \'12px\' }}>');
s=s.replace('<Typography variant="h6" fontWeight="bold" color="primary">\n                    {formatCurrency(pedidoCompleto.total ?? 0)}', '<Typography sx={{ fontSize: 24, fontWeight: 700 }} color="primary">\n                    {formatCurrency(pedidoCompleto.total ?? 0)}');
fs.writeFileSync('src/app/pedidos/page.tsx',s);
s=fs.readFileSync('src/app/clientes/page.tsx','utf8').replace(/\r\n/g,'\n');
s=s.replace('                    <TableCell sx={{ display: \'none\' }}>Data</TableCell>\n                    <TableCell sx={{ display: \'none\' }}>Status</TableCell>\n','');
const start=s.indexOf('                  {pedidosCliente.pedidos.map');
const before=s.slice(0,start); let history=s.slice(start);
history=region(history,'                      <TableCell sx={{ display: \'none\' }}>','                      <TableCell align="right">',`                      <TableCell align="right">`);
history=history.replace('                      <TableCell align="right">                      <TableCell align="right">','                      <TableCell align="right">');
history=history.replace('                        />\n                      </TableCell>', `                        />
                        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>{formatDateBR(pedido.data)}</Typography>
                        <StatusBadge status={pedido.status} sx={{ mt: 0.5 }} />
                      </TableCell>`);
fs.writeFileSync('src/app/clientes/page.tsx',before+history);
