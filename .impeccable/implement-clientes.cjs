const fs=require('node:fs');
let s=fs.readFileSync('src/app/clientes/page.tsx','utf8').replace(/\r\n/g,'\n');
function replaceRegion(a,b,value){const i=s.indexOf(a),j=s.indexOf(b,i);if(i<0||j<0)throw Error(a);s=s.slice(0,i)+value+s.slice(j);}
s=s.replace('  MenuItem,','  MenuItem,\n  Menu,');
s=s.replace('  OpenInNew,','  OpenInNew,\n  MoreVert,\n  Close,');
s=s.replace("import { motion } from 'framer-motion';", "import { OperationalHeader, OperationalSummary, operationalSurface, operationalTable } from '@/components/common/OperationalPage';\nimport { usePDVStore } from '@/stores/pdv-store';\nimport { formatarEndereco } from '@/lib/utils/endereco';");
s=s.replace("  const [dialogHistorico, setDialogHistorico] = useState(false);\n",'');
s=s.replace("  const [clienteHistorico, setClienteHistorico] = useState<Cliente | null>(null);", "  const [clienteMenu, setClienteMenu] = useState<Cliente | null>(null);\n  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);\n  const [abrindoVenda, setAbrindoVenda] = useState(false);");
s=s.replace("clienteId: clienteHistorico?.id || ''", "clienteId: clienteDetalhes?.id || ''").replace("!!clienteHistorico?.id && dialogHistorico", "!!clienteDetalhes?.id && dialogDetalhes");
s=s.replace('  const clientes = data?.clientes || [];', `  const { data: clienteFicha, isLoading: loadingFicha, error: erroFicha, refetch: recarregarFicha } = trpc.clientes.getById.useQuery(
    { id: clienteDetalhes?.id || '' }, { enabled: !!clienteDetalhes?.id && dialogDetalhes }
  );
  const clientes = data?.clientes || [];`);
s=s.replace('    setClienteDetalhes(cliente);', '    setPaginaHistorico(0);\n    setClienteDetalhes(cliente);');
replaceRegion('  const handleHistoricoPedidos', '  const handleVerPedido', '  const handleHistoricoPedidos = (cliente: Cliente) => handleVisualizarCliente(cliente);\n\n');
s=s.replace('  return (\n    <AppLayout>', `  const handleNovaVenda = async (cliente: Cliente) => {
    if (abrindoVenda || !cliente.ativo) return;
    setAbrindoVenda(true);
    try {
      const cadastro = await utils.clientes.getById.fetch({ id: cliente.id }, { staleTime: 0 });
      if (!cadastro.ativo) { toast.error('Este cliente está inativo. Reative o cadastro para iniciar uma venda.'); return; }
      const iniciar = () => {
        usePDVStore.getState().novoPedido();
        usePDVStore.getState().setPedidoAtual({ cliente: { id: cadastro.id, nome: cadastro.nome, telefone: cadastro.telefone, cpf: cadastro.cpf }, cliente_id: cadastro.id, cliente_nome: cadastro.nome, telefone_contato: cadastro.telefone || undefined });
        router.push('/pdv');
      };
      const rascunho = usePDVStore.getState().pedidoAtual;
      if (rascunho.itens.length || rascunho.cliente_id || rascunho.tipo_atendimento_id || rascunho.forma_pagamento_id || rascunho.observacao?.trim() || rascunho.telefone_contato?.trim() || rascunho.id) {
        setConfirmDialog({ open: true, title: 'Iniciar uma nova venda?', message: 'Há um pedido em montagem no PDV. Iniciar esta venda descarta esse rascunho. Para continuar o pedido existente, cancele e abra o PDV.', onConfirm: () => { iniciar(); setConfirmDialog(c => ({ ...c, open: false })); } });
      } else iniciar();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Não foi possível verificar o cliente. Tente novamente.'); }
    finally { setAbrindoVenda(false); }
  };
  return (
    <AppLayout>`);
replaceRegion("      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>", '      <Card>\n        {/* Barra de Pesquisa */}', `      <OperationalHeader title="Clientes" description="Encontre o cadastro e retome o atendimento." actions={<Button variant="contained" startIcon={<Add />} onClick={handleNovoCliente}>Novo cliente</Button>} />
      {erroEstatisticas && <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" onClick={() => recarregarEstatisticas()}>Tentar novamente</Button>}>Indicadores indisponíveis.</Alert>}
      <OperationalSummary label="Indicadores gerais de clientes" items={[
        { label: 'Cadastros', value: erroEstatisticas ? '—' : stats?.total ?? '—' },
        { label: 'Ativos', value: erroEstatisticas ? '—' : stats?.ativos ?? '—' },
        { label: 'Pedidos', value: erroEstatisticas ? '—' : stats?.totalPedidos ?? '—' },
        { label: 'Compras finalizadas', value: erroEstatisticas || !stats ? '—' : formatCurrency(stats.valorTotalCompras) },
      ]} />
`);
s=s.replace('      <Card>\n        {/* Barra de Pesquisa */}', '      <Card sx={operationalSurface}>\n        {/* Barra de Pesquisa */}');
replaceRegion('        <Box sx={{ p: { xs: 2, sm: 3 }, borderBottom:', '        {/* Tabela */}', `        <Box sx={{ p: 2.5, display: 'flex', gap: 2, flexWrap: 'wrap', borderBottom: '1px solid', borderColor: 'divider' }}>
          <TextField size="small" label="Buscar cliente" placeholder="Nome, CPF, telefone ou e-mail" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} sx={{ flex: 1, minWidth: { xs: '100%', sm: 240 } }} InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} />
          <TextField size="small" select label="Situação" sx={{ width: { xs: '100%', sm: 180 } }} value={filtroAtivo} onChange={e => { setFiltroAtivo(e.target.value as typeof filtroAtivo); setPage(0); }}><MenuItem value="ativos">Ativos</MenuItem><MenuItem value="inativos">Inativos</MenuItem><MenuItem value="todos">Todos</MenuItem></TextField>
        </Box>
`);
s=s.replaceAll('<Table>', '<Table size="small" sx={operationalTable}>');
s=s.replace('                      component={motion.tr}\n                      initial={false}\n                      animate={{ opacity: 1, x: 0 }}\n                      transition={{ duration: 0.15, delay: Math.min(index, 4) * 0.02 }}\n','');
s=s.replace("                          transform: 'scale(1.01)',\n",'');
s=s.replace("                          <Avatar sx={{ bgcolor: 'primary.main' }}>\n                            {cliente.nome?.charAt(0).toUpperCase()}\n                          </Avatar>\n",'');
s=s.replace('{cliente.total_pedidos || 0} pedidos', "{cliente.telefone || 'Telefone não informado'} · {cliente.total_pedidos || 0} pedidos");
replaceRegion('                        <Tooltip title="Histórico de Pedidos">', '                      </TableCell>\n                    </TableRow>', `                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <Tooltip title="Abrir ficha"><IconButton aria-label={'Abrir ficha de ' + cliente.nome} onClick={e => { e.stopPropagation(); handleVisualizarCliente(cliente); }}><Visibility fontSize="small" /></IconButton></Tooltip>
                          <Tooltip title="Editar cliente"><IconButton aria-label={'Editar ' + cliente.nome} onClick={e => { e.stopPropagation(); void handleEditarCliente(cliente); }} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}><Edit fontSize="small" /></IconButton></Tooltip>
                          <IconButton aria-label={'Mais ações de ' + cliente.nome} aria-haspopup="menu" onClick={e => { e.stopPropagation(); setClienteMenu(cliente); setMenuAnchor(e.currentTarget); }}><MoreVert fontSize="small" /></IconButton>
                        </Box>
`);
const historicoStart=s.indexOf('          {loadingPedidos ?');
const historicoEnd=s.indexOf('        </DialogContent>',historicoStart);
const historicoBody=s.slice(historicoStart,historicoEnd).replace("sx={{ fontFamily: 'monospace', fontWeight: 600 }}", "sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}").replace('                            size="small"\n                            color="primary"', '                            size="small"\n                            aria-label={\'Abrir pedido #\' + pedido.numero}\n                            color="primary"');
replaceRegion('      {/* Dialog Detalhes do Cliente */}', '      {/* Confirm Dialog */}', `      <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => { setMenuAnchor(null); if (clienteMenu) handleHistoricoPedidos(clienteMenu); }}>Abrir ficha e histórico</MenuItem>
        <MenuItem onClick={() => { setMenuAnchor(null); if (clienteMenu) void handleEditarCliente(clienteMenu); }}>Editar cliente</MenuItem>
        <MenuItem onClick={() => { setMenuAnchor(null); if (clienteMenu) { if (clienteMenu.ativo) handleDeletarCliente(clienteMenu); else handleReativar(clienteMenu); } }} sx={{ color: clienteMenu?.ativo ? 'error.main' : 'primary.main' }}>{clienteMenu?.ativo ? 'Desativar cliente' : 'Reativar cliente'}</MenuItem>
      </Menu>
      {/* Ficha do cliente: contato, endereços e histórico na mesma consulta. */}
      <Dialog open={dialogDetalhes} onClose={() => setDialogDetalhes(false)} maxWidth="lg" fullWidth fullScreen={isMobile} aria-labelledby="cliente-ficha-titulo">
        <DialogTitle id="cliente-ficha-titulo" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Person color="primary" /><Box sx={{ flex: 1, minWidth: 0 }}>{clienteDetalhes?.nome}<Typography variant="body2" color="text.secondary">Ficha do cliente</Typography></Box>
          <StatusBadge status={clienteFicha ? clienteFicha.ativo ? 'ATIVO' : 'INATIVO' : clienteDetalhes?.ativo ? 'ATIVO' : 'INATIVO'} />
          <IconButton aria-label="Fechar ficha do cliente" onClick={() => setDialogDetalhes(false)}><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: '24px !important' }}>
          {clienteDetalhes && <>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 3 }}>
              <Box><Typography variant="caption" color="text.secondary">Telefone</Typography><Typography>{clienteFicha?.telefone || clienteDetalhes.telefone || 'Não informado'}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">E-mail</Typography><Typography sx={{ overflowWrap: 'anywhere' }}>{clienteFicha?.email || clienteDetalhes.email || 'Não informado'}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">CPF</Typography><Typography>{clienteFicha?.cpf || clienteDetalhes.cpf || 'Não informado'}</Typography></Box>
            </Box>
            <Grid container spacing={3}>
              <Grid item xs={12} md={5}>
                <Typography component="h3" variant="h6" sx={{ mb: 2 }}>Endereços</Typography>
                {loadingFicha ? <LoadingSkeleton type="form" rows={2} /> : erroFicha ? <Alert severity="error" action={<Button onClick={() => recarregarFicha()}>Tentar novamente</Button>}>Não foi possível carregar os endereços.</Alert> : clienteFicha?.enderecos.length ? clienteFicha.enderecos.map(endereco => <Box key={endereco.id} sx={{ p: 2, mb: 1.5, bgcolor: 'background.default', borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}><LocationOn fontSize="small" color="primary" />{endereco.principal && endereco.ativo && <Chip size="small" label="Principal" color="primary" variant="outlined" />}{!endereco.ativo && <Chip size="small" label="Inativo" />}</Box>
                  <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{formatarEndereco(endereco)}</Typography>
                </Box>) : <Typography color="text.secondary" variant="body2">Nenhum endereço cadastrado.</Typography>}
                <Button startIcon={<Edit />} onClick={() => { setDialogDetalhes(false); void handleEditarCliente(clienteDetalhes); }}>Editar endereços</Button>
              </Grid>
              <Grid item xs={12} md={7}>
                <Typography component="h3" variant="h6">Histórico de pedidos</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>{clienteDetalhes.total_pedidos || 0} pedidos · Compras finalizadas: {formatCurrency(clienteDetalhes.valor_total_compras)}</Typography>
                ${historicoBody}
                <TablePagination component="div" count={pedidosCliente?.total ?? 0} page={paginaHistorico} rowsPerPage={25} rowsPerPageOptions={[25]} onPageChange={(_, p) => setPaginaHistorico(p)} labelRowsPerPage="Por página" />
              </Grid>
            </Grid>
          </>}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1, flexWrap: 'wrap', borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={() => setDialogDetalhes(false)} sx={{ mr: 'auto' }}>Fechar</Button>
          <Button variant="outlined" startIcon={<Edit />} onClick={() => { setDialogDetalhes(false); if (clienteDetalhes) void handleEditarCliente(clienteDetalhes); }}>Editar cliente</Button>
          <Button variant="contained" startIcon={<ShoppingCart />} disabled={abrindoVenda || loadingFicha || !!erroFicha || !clienteFicha?.ativo} onClick={() => { if (clienteDetalhes) void handleNovaVenda(clienteDetalhes); }}>{abrindoVenda ? 'Verificando…' : 'Nova venda'}</Button>
        </DialogActions>
      </Dialog>

`);
s=s.replace("confirmText={confirmDialog.title === 'Reativar cliente' ? 'Reativar' : 'Desativar'}", "confirmText={confirmDialog.title === 'Iniciar uma nova venda?' ? 'Descartar e iniciar' : confirmDialog.title === 'Reativar cliente' ? 'Reativar' : 'Desativar'}");
fs.writeFileSync('src/app/clientes/page.tsx',s);
