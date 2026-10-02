const fs=require('node:fs');
function edit(file,fn){fs.writeFileSync(file,fn(fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n')));}
function region(s,a,b,value){const i=s.indexOf(a),j=s.indexOf(b,i);if(i<0||j<0)throw Error(a);return s.slice(0,i)+value+s.slice(j);}
edit('src/app/pedidos/page.tsx', s=>{
  s=region(s, '        <DialogActions sx={{ p: 2.5, justifyContent:', '      {/* Dialog de Edição de Pedido */}', `        <DialogActions sx={{ p: 2.5, borderTop: '1px solid', borderColor: 'divider', gap: 1, flexWrap: 'wrap' }}>
          <Button onClick={handleFecharDialogDetalhes} sx={{ mr: 'auto' }}>Fechar</Button>
          <Button aria-haspopup="menu" startIcon={<MoreVert />} disabled={!pedidoCompleto || !!erroDetalhes} onClick={e => handleOpenMenu(e, pedidoCompleto || pedidoDetalhes)}>Mais ações</Button>
          <Button variant="outlined" startIcon={<Print />} disabled={!pedidoCompleto || !!erroDetalhes} onClick={() => { setPrintDialog({ open: true, pedido: pedidoCompleto || pedidoDetalhes }); handleFecharDialogDetalhes(); }}>Imprimir</Button>
          {pedidoCompleto && !['CANCELADO', 'FINALIZADO'].includes(pedidoCompleto.status || '') && <Button variant="outlined" startIcon={<Edit />} onClick={() => { handleEditarPedido(pedidoCompleto); handleFecharDialogDetalhes(); }}>Editar</Button>}
          {pedidoCompleto && ['PENDENTE', 'CONFIRMADO'].includes(pedidoCompleto.status || '') && <Button variant="contained" startIcon={<CheckCircle />} disabled={finalizarMutation.isPending} onClick={() => { void handleFinalizarPedido(pedidoCompleto); handleFecharDialogDetalhes(); }}>Finalizar pedido</Button>}
        </DialogActions>
      </Dialog>

      {/* Dialog de Edição de Pedido */}`);
  s=s.replace('        fullScreen={isMobile}\n      >\n        <DialogTitle', '        fullScreen={isMobile}\n        aria-labelledby="pedido-detalhes-titulo"\n      >\n        <DialogTitle id="pedido-detalhes-titulo"');
  s=s.replace('<Card variant="outlined" sx={{ p: 2 }}>','<Box sx={{ p: 2, bgcolor: \'background.default\', borderRadius: 2 }}>').replace('                  </Card>','                  </Box>');
  s=s.replace('<TableContainer component={Card} variant="outlined">', '<TableContainer sx={{ border: \'1px solid\', borderColor: \'divider\', borderRadius: 2 }}>');
  // Só resta conteúdo plano na consulta; evitar aninhamento de superfícies.
  s=s.replace('<Card variant="outlined" sx={{ mt: 3, p: 2 }}>', '<Box sx={{ mt: 3, p: 2, bgcolor: \'background.default\', borderRadius: 2 }}>').replace('              </Card>', '              </Box>');
  s=s.replace('<Card variant="outlined" sx={{ mt: 2, p: 2 }}>', '<Box sx={{ mt: 2, p: 2, bgcolor: \'background.default\', borderRadius: 2 }}>');
  return s;
});
edit('src/app/pdv/page.tsx', s=>{
  s=s.replace('  MenuItem,','  MenuItem,\n  Menu,').replace('  Keyboard,','  Keyboard,\n  MoreVert,');
  s=s.replace("  const [dialogAtalhos, setDialogAtalhos] = useState(false);", "  const [dialogAtalhos, setDialogAtalhos] = useState(false);\n  const [itemMenu, setItemMenu] = useState<{ anchor: HTMLElement; index: number } | null>(null);");
  s=region(s,'                                <Tooltip title="Duplicar">', '                              </Box>\n                            </TableCell>', `                                <IconButton aria-label={'Mais ações do item ' + item.produto_nome} aria-haspopup="menu" onClick={e => setItemMenu({ anchor: e.currentTarget, index })}><MoreVert fontSize="small" /></IconButton>
`);
  s=s.replace('      {/* Dialog de Finalização */}', `      <Menu anchorEl={itemMenu?.anchor} open={!!itemMenu} onClose={() => setItemMenu(null)}>
        <MenuItem onClick={() => { if (itemMenu) handleDuplicarLinha(itemMenu.index); setItemMenu(null); }}><ContentCopy fontSize="small" sx={{ mr: 1 }} />Duplicar item</MenuItem>
        <MenuItem sx={{ color: 'error.main' }} onClick={() => { if (itemMenu) removerItem(itemMenu.index); setItemMenu(null); }}><Delete fontSize="small" sx={{ mr: 1 }} />Remover item</MenuItem>
      </Menu>
      {/* Dialog de Finalização */}`);
  s=s.replace('              <Card\n                component={motion.div}', '              <Box\n                component={motion.div}');
  s=s.replace("              </Card>\n            )}\n\n            {/* Lista de Itens */}", "              </Box>\n            )}\n\n            {/* Lista de Itens */}");
  s=s.replace("                sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: 'primary.main', color: 'white', mb: 3 }}", "                sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: 'primary.main', color: 'primary.contrastText', mb: 2, borderRadius: 2 }}");
  s=s.replaceAll('tiposAtendimento?.find((t: any)', 'tiposAtendimento?.find((t)').replaceAll('formasPagamento?.find((f: any)', 'formasPagamento?.find((f)');
  s=s.replace('    const { gerarPedidoPDF } = await import', "    try {\n    const { gerarPedidoPDF } = await import").replace('    await gerarPedidoPDF(dadosPedido, dadosEmpresa, acao);','    await gerarPedidoPDF(dadosPedido, dadosEmpresa, acao);\n    } catch { toast.error(\'Não foi possível preparar a impressão. Tente novamente.\'); }');
  s=s.replace('      <Dialog open={dialogFinalizar}', '      <Dialog aria-labelledby="pdv-conferir-titulo" open={dialogFinalizar}').replace('<DialogTitle sx={{ bgcolor: \'primary.main\', color: \'white\' }}>','<DialogTitle id="pdv-conferir-titulo" sx={{ bgcolor: \'primary.main\', color: \'primary.contrastText\' }}>');
  s=s.replace("<Typography variant=\"caption\" color=\"text.secondary\">\n                                    Cód: {item.produto_codigo}\n                                  </Typography>", "<Typography variant=\"caption\" color=\"text.secondary\">Cód: {item.produto_codigo}</Typography>");
  s=s.replace("                              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>", "                              <Typography variant=\"caption\" color=\"text.secondary\" sx={{ display: { xs: 'block', xl: 'none' } }}>{formatCurrency(item.valor_unitario)} por unidade{item.desconto_valor > 0 ? ' · Desconto ' + formatCurrency(item.desconto_valor) : ''}</Typography>\n                              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>");
  return s;
});
// Remove somente imports/referências que ficaram sem uso após trocar os blocos.
const removals={
  'src/app/clientes/page.tsx':['Avatar','Breadcrumbs','Link','Delete','TrendingUp','CheckCircle','History','NavigateNext'],
  'src/app/pdv/page.tsx':['Breadcrumbs','Link','Clear'],
  'src/app/pedidos/page.tsx':['Accordion','AccordionSummary','Breadcrumbs','Link','NavigateNext','TrendingUp','Timer','ExpandMore'],
};
for(const [file,names] of Object.entries(removals))edit(file,s=>{
  for(const name of names)s=s.replace('  '+name+',\n','');
  s=s.replace("import { motion } from 'framer-motion';\n",'');
  s=s.replace('clientes.map((cliente, index)', 'clientes.map((cliente)').replace('pedidos.map((pedido, index)','pedidos.map((pedido)');
  return s;
});
