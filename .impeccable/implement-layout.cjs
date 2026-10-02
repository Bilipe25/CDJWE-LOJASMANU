const fs = require('node:fs');
function edit(file, fn) { const s=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n'); fs.writeFileSync(file,fn(s)); }
function between(s,a,b,replacement) { const start=s.indexOf(a), end=s.indexOf(b,start); if(start<0||end<0)throw new Error(a); return s.slice(0,start)+replacement+s.slice(end); }
edit('src/app/pdv/page.tsx', s => {
  s=s.replace("import { gerarPedidoPDF } from '@/lib/pdf/pedido-pdf';", "import { OperationalHeader, operationalSurface, operationalTable } from '@/components/common/OperationalPage';");
  s=s.replace('    await gerarPedidoPDF(dadosPedido, dadosEmpresa, acao);', "    const { gerarPedidoPDF } = await import('@/lib/pdf/pedido-pdf');\n    await gerarPedidoPDF(dadosPedido, dadosEmpresa, acao);");
  s=between(s,'      <Breadcrumbs','      {modoEdicao &&', `      <OperationalHeader title="PDV" description={modoEdicao ? 'Confira as alterações antes de salvar.' : 'Monte a venda e confira os dados do pedido.'} actions={<>
        <Chip label={modoEdicao ? 'Editando pedido' : 'Rascunho local'} size="small" variant="outlined" />
        <Button startIcon={<Keyboard />} onClick={() => setDialogAtalhos(true)}>Atalhos</Button>
      </>} />
      {redeDisponivel === false && <Alert severity="warning" sx={{ mb: 2 }}>Sem conexão. O rascunho está salvo neste dispositivo; reconecte para enviar.</Alert>}
      {isMobile && <Box sx={{ display: 'flex', gap: 1, mb: 2 }}><Button variant={activeStep === 0 ? 'contained' : 'outlined'} onClick={() => setActiveStep(0)}>Itens</Button><Button variant={activeStep === 1 ? 'contained' : 'outlined'} onClick={() => { setActiveStep(1); setAccordionExpandido('cliente'); }}>Cliente e pagamento</Button></Box>}

`);
  s=s.replace('<Grid container spacing={3} sx={{ position: \'relative\' }}>','<Grid container spacing={2} sx={{ position: \'relative\', pb: { xs: 22, sm: 18, lg: 14 } }}>');
  s=s.replace('          lg={7}', '          lg={8}').replace('          lg={5}', '          lg={4}');
  s=s.replace("<Card sx={{ p: 2, height: '100%', minHeight: { md: '80vh' } }}>", "<Card sx={{ ...operationalSurface, p: { xs: 1.5, sm: 2.5 }, height: '100%', minHeight: { lg: 'calc(100dvh - 250px)' } }}>");
  s=s.replace("<Card sx={{ p: 3, position: { lg: 'sticky' }, top: 84 }}>", "<Card sx={{ ...operationalSurface, p: { xs: 1.5, sm: 2.5 }, '& .MuiAccordion-root': { boxShadow: 'none', bgcolor: 'transparent', '&:before': { display: 'none' }, borderBottom: '1px solid', borderColor: 'divider' }, '& .MuiAccordionSummary-root': { px: 0 }, '& .MuiAccordionDetails-root': { px: 0 } }}>");
  s=s.replace('<Receipt /> Resumo do Pedido','<Receipt /> Dados da venda');
  // Cliente e pagamento ficam descobertos no computador; mobile conserva etapas.
  s=s.replace("expanded={accordionExpandido === 'cliente'}", "expanded={!isMobile || accordionExpandido === 'cliente'}");
  s=s.replace("expanded={accordionExpandido === 'atendimento'}", "expanded={!isMobile || accordionExpandido === 'atendimento'}");
  s=s.replace("expanded={accordionExpandido === 'observacoes'}", "expanded={!isMobile || accordionExpandido === 'observacoes'}");
  s=s.replace("<Box sx={{ bgcolor: 'background.default', borderRadius: 2, p: 2, minHeight: 300 }}>", "<Box sx={{ mt: 2, minHeight: 240 }}>");
  s=s.replace('<Table size="small">', '<Table size="small" sx={operationalTable}>');
  // Edição de preço/desconto fica na janela de item em larguras de notebook.
  s=s.replaceAll("{ xs: 'none', sm: 'table-cell' }", "{ xs: 'none', xl: 'table-cell' }");
  s=s.replace('    <ShoppingCart sx={{ fontSize: 64, opacity: 0.3, mb: 2 }} />', '    <ShoppingCart sx={{ fontSize: 40, mb: 2 }} />');
  s=s.replace('<Typography>Nenhum item adicionado</Typography>', '<Typography fontWeight={600}>Comece buscando um produto</Typography><Typography variant="body2" sx={{ mt: 1 }}>Use o nome ou código, selecione a quantidade e adicione ao pedido.</Typography>');
  s=between(s,'            {/* Totais */}','          </Card>\n        </Grid>\n      </Grid>', '');
  s=s.replace('      {/* Dialog de Finalização */}', `      <Box component="section" aria-label="Resumo financeiro e ações do pedido" sx={{ position: 'fixed', bottom: 0, left: { xs: 0, md: 240 }, right: 0, zIndex: theme.zIndex.appBar + 1, bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider', px: { xs: 2, sm: 3 }, py: 1.5, pb: 'max(12px, env(safe-area-inset-bottom))', display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', boxShadow: '0 -4px 16px rgb(15 23 42 / 0.06)' }}>
        <Box sx={{ flex: 1, minWidth: 180 }}>
          <Typography variant="caption" color="text.secondary">{pedidoAtual.itens.length} itens · {pedidoAtual.itens.reduce((acc, item) => acc + item.quantidade, 0)} unidades</Typography>
          <Typography variant="body2" color="text.secondary">Subtotal {formatCurrency(pedidoAtual.subtotal)} · Desconto geral {formatCurrency(pedidoAtual.desconto_valor)}</Typography>
        </Box>
        <Box sx={{ minWidth: 130 }}><Typography variant="caption" fontWeight={600}>Total</Typography><Typography variant="h5" color="primary.main" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(pedidoAtual.total)}</Typography></Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', width: { xs: '100%', lg: 'auto' } }}>
          <Button variant="contained" startIcon={<Check />} onClick={handleFinalizarPedido} disabled={salvando || redeDisponivel === false || pedidoAtual.itens.length === 0}>{modoEdicao ? 'Salvar alterações' : 'Salvar pedido'}</Button>
          <Button variant="outlined" startIcon={<Print />} onClick={() => { void handleImprimirPedido('print').catch(() => toast.error('Não foi possível preparar a impressão. Tente novamente.')); }} disabled={pedidoAtual.itens.length === 0}>{modoEdicao ? 'Imprimir prévia' : 'Imprimir rascunho'}</Button>
          <Button color="error" onClick={() => { if (confirm('Descartar o rascunho deste pedido?')) { limparCarrinho(); limparCamposVenda(); } }} disabled={salvando || pedidoAtual.itens.length === 0}>Descartar</Button>
        </Box>
      </Box>

      {/* Dialog de Finalização */}`);
  s=s.replaceAll('Finalizar Pedido','Salvar pedido').replace('Confirmar Venda','Salvar pedido').replace('Resumo da Venda','Conferir pedido');
  s=s.replace('Pedido #${pedidoCriado.numero} criado com sucesso!', 'Pedido #${pedidoCriado.numero} salvo · Pendente');
  s=s.replace('            {/* Valor Total */}', '            {!modoEdicao && <Alert severity="info" sx={{ mb: 2 }}>O pedido será salvo como Pendente. Você poderá finalizá-lo em Pedidos.</Alert>}\n            {/* Valor Total */}');
  return s;
});
edit('src/app/pedidos/page.tsx', s => {
  s=s.replace("import { gerarPedidoPDF } from '@/lib/pdf/pedido-pdf';", "import { OperationalHeader, OperationalSummary, operationalSurface, operationalTable } from '@/components/common/OperationalPage';");
  s=s.replace('      await gerarPedidoPDF(dadosPedido, dadosEmpresa, acao);', "      const { gerarPedidoPDF } = await import('@/lib/pdf/pedido-pdf');\n      await gerarPedidoPDF(dadosPedido, dadosEmpresa, acao);");
  s=between(s,"      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>",'      <Card sx={{ overflow:', `      <OperationalHeader title="Pedidos" description="Consulte, confira e acompanhe os pedidos." actions={<>
        <Button variant="outlined" startIcon={<FileDownload />} onClick={() => setDialogExportar(true)}>Exportar</Button>
        <Button variant="contained" startIcon={<Receipt />} onClick={() => router.push('/pdv')}>Novo pedido</Button>
      </>} />
      {erroEstatisticas && <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" onClick={() => recarregarEstatisticas()}>Tentar novamente</Button>}>Indicadores indisponíveis.</Alert>}
      <OperationalSummary label="Indicadores da consulta" items={[
        { label: 'Pedidos na consulta', value: erroEstatisticas ? '—' : estatisticas.totalPedidos ?? '—' },
        { label: 'Pendentes', value: erroEstatisticas ? '—' : estatisticas.pedidosPendentes ?? '—' },
        { label: 'Valor da consulta', value: erroEstatisticas ? '—' : formatCurrency(estatisticas.valorTotal) },
        { label: 'Finalizados hoje na consulta', value: erroEstatisticas ? '—' : estatisticas.finalizadosHoje ?? '—' },
      ]} />
`);
  s=s.replace("<Card sx={{ overflow: 'hidden', maxWidth: '100%' }}>", "<Card sx={{ ...operationalSurface, overflow: 'hidden', maxWidth: '100%' }}>");
  // Busca e situação sempre disponíveis, filtros secundários progressivos.
  const searchStart=s.indexOf('              <Grid item xs={12} sm={6} md={3}>',s.indexOf('{/* Filtros Avançados */}'));
  const searchEnd=s.indexOf('              <Grid item xs={12} sm={6} md={2}>',s.indexOf('label="pedidos-select-2"',searchStart));
  // O marcador correto do terceiro campo fica após o select de status.
  const third=s.indexOf('              <Grid item xs={12} sm={6} md={2}>',s.indexOf('</Select>',searchStart));
  const primary=s.slice(searchStart,third).replace('md={3}','md={6}').replace('md={2}','md={3}').replaceAll('fullWidth','fullWidth size="small"');
  s=s.slice(0,searchStart)+s.slice(third);
  s=s.replace('        {/* Filtros Avançados */}', `<Box sx={{ p: 2.5 }}><Grid container spacing={2} alignItems="center">${primary}
    <Grid item xs={12} md={3}><Button fullWidth variant="outlined" startIcon={<FilterList />} aria-expanded={filtrosExpanded} aria-controls="pedidos-filtros-adicionais" onClick={() => atualizarFiltro('filtrosExpanded', !filtrosExpanded)}>Filtros adicionais {contarFiltrosAtivos > 0 ? '(' + contarFiltrosAtivos + ')' : ''}</Button></Grid>
    </Grid>
    {temFiltrosAtivos && <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2, alignItems: 'center' }}>
      {search && <Chip size="small" variant="outlined" label={'Busca: ' + search} onDelete={() => atualizarFiltro('search', '')} />}
      {status && <StatusBadge status={status} onDelete={() => atualizarFiltro('status', '')} />}
      {tipoAtendimento && <Chip size="small" label={'Tipo: ' + tipoAtendimento} onDelete={() => atualizarFiltro('tipoAtendimento', '')} />}
      {formaPagamento && <Chip size="small" label={'Pagamento: ' + (formasPagamento?.find(f => f.id === formaPagamento)?.nome || 'Carregando…')} onDelete={() => atualizarFiltro('formaPagamento', '')} />}
      {clienteSelecionado && <Chip size="small" label={'Cliente: ' + nomeClienteFiltro} onDelete={() => atualizarFiltro('clienteSelecionado', null)} />}
      {(dataInicio || dataFim) && <Chip size="small" label={(dataInicio ? formatDate(dataInicio) : 'Início livre') + ' a ' + (dataFim ? formatDate(dataFim) : 'Fim livre')} />}
      <Button size="small" startIcon={<Close />} onClick={limparFiltros}>Limpar filtros</Button>
    </Box>}
    </Box>
        {/* Filtros Avançados */}`);
  s=between(s,'          <AccordionSummary','          <AccordionDetails', '');
  // MUI controla expansão; botão externo evita controles interativos aninhados.
  s=s.replace('          <AccordionDetails sx={{ px: 3, pb: 3 }}>', '          <AccordionDetails id="pedidos-filtros-adicionais" sx={{ px: 2.5, pb: 2.5 }}>');
  s=s.replaceAll('<Table>', '<Table size="small" sx={operationalTable}>');
  s=s.replace("fontFamily: 'monospace', ", "fontVariantNumeric: 'tabular-nums', ");
  s=s.replace('                      component={motion.tr}\n                      initial={false}\n                      animate={{ opacity: 1, x: 0 }}\n                      transition={{ duration: 0.15, delay: Math.min(index, 4) * 0.02 }}\n','');
  s=s.replace('<Box sx={{ display: { xs: \'none\', sm: \'block\' } }}>\n                            <Tooltip title="Visualizar">', '<Box>\n                            <Tooltip title="Visualizar">');
  s=s.replace('variant="filled"\n                          sx={{\n                            fontWeight: 600,\n                            color: \'white\',\n                          }}', 'variant="outlined"\n                          sx={{ fontWeight: 600 }}');
  s=s.replace("<Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>\n            <CircularProgress />\n          </Box>", "<Box sx={{ p: 2 }}><LoadingSkeleton type=\"table\" rows={5} /></Box>");
  s=s.replace('<DialogActions sx={{ p: 3, justifyContent: \'space-between\' }}>', '<DialogActions sx={{ p: 2.5, justifyContent: \'space-between\', gap: 1, flexWrap: \'wrap\', borderTop: \'1px solid\', borderColor: \'divider\' }}>');
  s=s.replace("<Box sx={{ display: 'flex', gap: 1 }}>", "<Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>");
  return s;
});
