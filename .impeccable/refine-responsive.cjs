const fs=require('node:fs');
function edit(p,fn){fs.writeFileSync(p,fn(fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n')));}
edit('src/app/pdv/page.tsx',s=>{
  // Conferência do endereço sempre legível, independentemente do Select MUI.
  s=s.replace('                              label="Endereço de Entrega"', `                              label="Endereço de Entrega"
                              renderValue={() => enderecoSelecionado ? enderecoSelecionado.principal ? 'Endereço principal' : 'Outro endereço selecionado' : 'Sem endereço'}`);
  s=s.replace('                          </FormControl>\n                        </Grid>\n                      )}', `                          </FormControl>
                          {enderecoSelecionado && <Typography variant="body2" sx={{ mt: 1.5, overflowWrap: 'anywhere' }}>{formatarEndereco(enderecoSelecionado)}</Typography>}
                        </Grid>
                      )}`);
  const addStart=s.indexOf('              <Grid item xs={12}>\n                <Button\n                  fullWidth\n                  variant="contained"');
  const addEnd=s.indexOf('              </Grid>',addStart)+'              </Grid>'.length;
  const add=s.slice(addStart,addEnd).replace('xs={12}', 'xs={4} md={3}').replace("{isMobile ? 'Adicionar' : 'Adicionar ao Pedido'}", "Adicionar");
  if(addStart<0)throw Error('add');s=s.slice(0,addStart)+s.slice(addEnd);
  const novoStart=s.indexOf('              <Grid item xs={12} sm={6} md={2}>');
  const novoEnd=s.indexOf('              </Grid>',novoStart)+'              </Grid>'.length;
  const novo=s.slice(novoStart,novoEnd);if(novoStart<0)throw Error('novo');s=s.slice(0,novoStart)+add+s.slice(novoEnd);
  const buttonStart=novo.indexOf('                <Button'),buttonEnd=novo.indexOf('                </Button>')+'                </Button>'.length;
  const novoButton=novo.slice(buttonStart,buttonEnd).replace('                  fullWidth\n','').replace('variant="outlined"','variant="text"').replace('fontSize: { xs: \'0.813rem\', sm: \'0.875rem\' }','fontSize: \'0.875rem\'');
  s=s.replace('              {modoEdicao && (',novoButton+'\n              {modoEdicao && (');
  s=s.replace('<Grid item xs={12} md={10}>','<Grid item xs={8} md={9}>');
  s=s.replace('                          <TableCell align="right" sx={{ display: { xs: \'none\', xl: \'table-cell\' } }}>Desconto</TableCell>', '<TableCell align="right" sx={{ display: \'none\' }}>Desconto</TableCell>');
  s=s.replace('                            <TableCell align="right" sx={{ display: { xs: \'none\', xl: \'table-cell\' } }}>\n                              <TextField', '<TableCell align="right" sx={{ display: \'none\' }}>\n                              <TextField');
  s=s.replace('                                  aria-label="Diminuir quantidade"','                                  sx={{ display: { xs: \'none\', sm: \'inline-flex\' } }}\n                                  aria-label="Diminuir quantidade"').replace('                                  aria-label="Aumentar quantidade"', '                                  sx={{ display: { xs: \'none\', sm: \'inline-flex\' } }}\n                                  aria-label="Aumentar quantidade"');
  s=s.replaceAll('catch (error) {\n      toast.error(\'Erro ao cadastrar', 'catch {\n      toast.error(\'Erro ao cadastrar');
  return s;
});
edit('src/app/pedidos/page.tsx',s=>{
  s=s.replace('<TableCell>Número</TableCell>', '<TableCell sx={{ display: { xs: \'none\', sm: \'table-cell\' } }}>Número</TableCell>');
  s=s.replace('                      <TableCell>\n                        <Chip\n                          label={`#${pedido.numero}`}', '                      <TableCell sx={{ display: { xs: \'none\', sm: \'table-cell\' } }}>\n                        <Chip\n                          label={`#${pedido.numero}`}');
  s=s.replace('<TableCell align="center">Status</TableCell>','<TableCell align="center" sx={{ display: { xs: \'none\', sm: \'table-cell\' } }}>Status</TableCell>');
  s=s.replace('                      <TableCell align="center">\n                        <StatusBadge', '                      <TableCell align="center" sx={{ display: { xs: \'none\', sm: \'table-cell\' } }}>\n                        <StatusBadge');
  s=s.replace('                          <Box sx={{ fontWeight: 600 }}>{pedido.cliente_nome', '<Typography variant="caption" color="text.secondary" sx={{ display: { xs: \'block\', sm: \'none\' } }}>#{pedido.numero} · {formatDate(pedido.data)}</Typography>\n                          <Box sx={{ fontWeight: 600 }}>{pedido.cliente_nome');
  s=s.replace('                          {pedido.cliente_telefone && (', '<Box sx={{ display: { xs: \'block\', sm: \'none\' }, my: 0.5 }}><StatusBadge status={pedido.status || \'Não informado\'} /></Box>\n                          {pedido.cliente_telefone && (');
  return s;
});
