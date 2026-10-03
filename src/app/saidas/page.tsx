'use client';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Box, Card, TextField, InputAdornment, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, TablePagination, Tooltip, LinearProgress, Button, Typography, Alert, Collapse, MenuItem, Menu, ListItemIcon, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, Checkbox, FormControlLabel, CircularProgress } from '@mui/material';
import { Search, Visibility, Print, ContentCopy, Cancel, CheckCircle, FilterList, Edit, Close, Delete, MoreVert, Add, FileDownload, Refresh } from '@mui/icons-material';
import AppLayout from '@/components/layout/AppLayout';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import StatusBadge from '@/components/common/StatusBadge';
import { OperationalHeader, OperationalSummary, operationalSurface, operationalTable } from '@/components/common/OperationalPage';
import DestinatarioField from '@/components/financeiro/DestinatarioField';
import SaidaForm from '@/components/financeiro/SaidaForm';
import { trpc } from '@/lib/trpc/client';
import { useSaidasFiltros } from '@/hooks/useSaidasFiltros';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { OperacaoSaida, type FormularioSaida } from '@/lib/utils/operacao-saida';
import { hojeFinanceiro, dataCivilValida } from '@/lib/schemas/financeiro';
import { formatDateBR } from '@/lib/utils/dateUtils';
import { empresaParaDocumento, buscarTodosFiltrados } from '@/lib/utils/documentos';
import type { PedidoListado } from '@/server/routers/pedidos';
import type { ColunaSaida } from '@/lib/pdf/financeiro-pdf';
const moeda = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const formularioInicial = (): FormularioSaida => ({ cliente_id: '', destinatario_nome: '', forma_pagamento_id: '', valor: 0, data: hojeFinanceiro(), observacao: '', status: 'PENDENTE' });
const erroTexto = (erro: unknown) => erro instanceof Error ? erro.message : 'Não foi possível concluir a operação. Tente novamente.';
type Acao = 'finalizar' | 'cancelar' | 'duplicar' | 'excluir';
export default function SaidasPage() {
  const utils = trpc.useUtils();
  const { filtros, atualizarFiltro, limparFiltros, pronto, erroPeriodo, temFiltrosAtivos, contarFiltrosAtivos } = useSaidasFiltros();
  const search = useDebouncedValue(filtros.search);
  const filtrosConsulta = { tipoAtendimento: 'SAIDA', search: search || undefined, status: filtros.status || undefined, dataInicio: filtros.dataInicio || undefined, dataFim: filtros.dataFim || undefined, clienteId: filtros.clienteSelecionado?.id, formaPagamentoId: filtros.formaPagamento || undefined };
  const opcoesConsulta = { enabled: pronto && !erroPeriodo, refetchOnWindowFocus: true, refetchInterval: 60_000 };
  const lista = trpc.pedidos.list.useQuery({ ...filtrosConsulta, limit: filtros.rowsPerPage, offset: filtros.page * filtros.rowsPerPage, ordenarPor: 'data', direcao: 'desc' }, opcoesConsulta);
  const estatisticas = trpc.pedidos.saidasEstatisticas.useQuery(filtrosConsulta, opcoesConsulta);
  const empresa = trpc.configuracoes.get.useQuery();
  const pagamentos = trpc.dominios.formasPagamento.list.useQuery();
  const tipos = trpc.dominios.tiposAtendimento.list.useQuery();
  const operador = trpc.auth.me.useQuery();
  const criarCliente = trpc.clientes.create.useMutation(), criar = trpc.pedidos.create.useMutation(), editar = trpc.pedidos.update.useMutation();
  const finalizar = trpc.pedidos.finalizar.useMutation(), cancelar = trpc.pedidos.cancelar.useMutation(), duplicar = trpc.pedidos.duplicar.useMutation(), excluir = trpc.pedidos.delete.useMutation();
  const [detalheId, setDetalheId] = useState<string | null>(null);
  const detalhes = trpc.pedidos.getById.useQuery({ id: detalheId || '' }, { enabled: !!detalheId, refetchOnWindowFocus: true });
  const [menu, setMenu] = useState<{ anchor: HTMLElement; pedido: PedidoListado } | null>(null);
  const [confirmacao, setConfirmacao] = useState<{ acao: Acao; pedido: PedidoListado; chave: string } | null>(null);
  const [formulario, setFormulario] = useState<FormularioSaida | null>(null);
  const [editando, setEditando] = useState<PedidoListado | null>(null);
  const operacao = useRef(new OperacaoSaida());
  const trava = useRef(false);
  const [ocupado, setOcupado] = useState(false), [erroForm, setErroForm] = useState('');
  const [exportarAberto, setExportarAberto] = useState(false), [escopo, setEscopo] = useState<'todos' | 'pagina'>('todos');
  const [progresso, setProgresso] = useState('');
  const [colunas, setColunas] = useState<ColunaSaida[]>([
    { id: 'numero', label: 'Número', selecionada: true }, { id: 'data', label: 'Data', selecionada: true },
    { id: 'destinatario', label: 'Destinatário', selecionada: true }, { id: 'pagamento', label: 'Pagamento', selecionada: true },
    { id: 'valor', label: 'Valor', selecionada: true }, { id: 'status', label: 'Situação', selecionada: true }, { id: 'descricao', label: 'Descrição', selecionada: false },
  ]);
  const dados = lista.data?.pedidos ?? [], total = lista.data?.total ?? 0;
  const consultaPendente = filtros.search.trim() !== search.trim();
  const listaValida = pronto && !erroPeriodo && !consultaPendente && !lista.isFetching && !lista.isError && !!lista.data;
  useEffect(() => {
    if (lista.isFetching || !lista.data || erroPeriodo || consultaPendente) return;
    const ultima = Math.max(0, Math.ceil(lista.data.total / filtros.rowsPerPage) - 1);
    if (filtros.page > ultima) atualizarFiltro('page', ultima);
  }, [lista.data, lista.isFetching, filtros.page, filtros.rowsPerPage, atualizarFiltro, erroPeriodo, consultaPendente]);
  const atualizar = async () => { await Promise.all([utils.pedidos.invalidate(), utils.relatorios.invalidate()]); };
  const atualizarConsulta = () => { void lista.refetch(); void estatisticas.refetch(); if (detalheId) void detalhes.refetch(); };
  const abrirFormulario = (pedido?: PedidoListado) => {
    setEditando(pedido ?? null); setErroForm(''); operacao.current = new OperacaoSaida();
    setFormulario(pedido ? { cliente_id: pedido.cliente_id || '', destinatario_nome: pedido.cliente_nome || '', forma_pagamento_id: pedido.forma_pagamento_id || '', valor: pedido.total || 0, data: pedido.data || hojeFinanceiro(), observacao: pedido.observacao || '', status: pedido.status === 'CONFIRMADO' ? 'CONFIRMADO' : 'PENDENTE' } : formularioInicial());
    setMenu(null);
  };
  const salvar = async () => {
    if (!formulario || trava.current) return;
    if (!dataCivilValida(formulario.data)) { setErroForm('Informe uma data válida.'); return; }
    if (!Number.isFinite(formulario.valor) || formulario.valor <= 0 || formulario.valor > 99999999.99) { setErroForm('Informe um valor entre R$ 0,01 e R$ 99.999.999,99.'); return; }
    trava.current = true; setOcupado(true); setErroForm('');
    try {
      if (editando) {
        let cliente = formulario.cliente_id;
        if (!cliente && formulario.destinatario_nome.trim()) { const novo = await criarCliente.mutateAsync({ nome: formulario.destinatario_nome.trim() }); cliente = novo.id; setFormulario({ ...formulario, cliente_id: cliente }); }
        await editar.mutateAsync({ id: editando.id, versao: editando.versao, cliente_id: cliente || null, forma_pagamento_id: formulario.forma_pagamento_id || null, data: formulario.data, observacao: formulario.observacao || null, total: formulario.valor, subtotal: formulario.valor, desconto_valor: 0, status: formulario.status });
      } else {
        const tipo = tipos.data?.find(t => t.tipo === 'SAIDA');
        if (!tipo) throw new Error('Não foi possível carregar o tipo Saída. Atualize os dados e tente novamente.');
        await operacao.current.executar(formulario, async nome => (await criarCliente.mutateAsync({ nome })).id, async f => criar.mutateAsync({ chave_requisicao: f.chave_requisicao, cliente_id: f.cliente_id || null, tipo_atendimento_id: tipo.id, forma_pagamento_id: f.forma_pagamento_id || null, data: f.data, observacao: f.observacao || null, total: f.valor, subtotal: f.valor, status: f.status }));
      }
      setFormulario(null); toast.success(editando ? 'Despesa atualizada.' : 'Despesa registrada.'); await atualizar();
    } catch (erro) { setErroForm(erroTexto(erro)); }
    finally { trava.current = false; setOcupado(false); }
  };
  const pedirAcao = (acao: Acao, pedido: PedidoListado) => { setMenu(null); setConfirmacao({ acao, pedido, chave: crypto.randomUUID() }); };
  const executarAcao = async () => {
    if (!confirmacao || trava.current) return;
    trava.current = true; setOcupado(true);
    const { acao, pedido, chave } = confirmacao;
    try {
      const identidade = { id: pedido.id, versao: pedido.versao };
      if (acao === 'finalizar') await finalizar.mutateAsync(identidade);
      if (acao === 'cancelar') await cancelar.mutateAsync(identidade);
      if (acao === 'excluir') await excluir.mutateAsync(identidade);
      if (acao === 'duplicar') await duplicar.mutateAsync({ ...identidade, chave_requisicao: chave });
      setConfirmacao(null); if (acao === 'excluir') setDetalheId(null);
      toast.success({ finalizar: 'Despesa finalizada.', cancelar: 'Despesa cancelada.', excluir: 'Despesa excluída.', duplicar: 'Cópia criada como pendente.' }[acao]); await atualizar();
    } catch (erro) { toast.error(erroTexto(erro)); await atualizar(); }
    finally { trava.current = false; setOcupado(false); }
  };
  const documentoIndividual = async (pedido: PedidoListado, acao: 'print' | 'download') => {
    if (trava.current) return; trava.current = true; setOcupado(true); setMenu(null);
    try {
      if (!empresa.data || empresa.isError) throw new Error('Carregue as configurações da empresa antes de emitir o documento.');
      const completo = await utils.pedidos.getById.fetch({ id: pedido.id });
      const pdf = await import('@/lib/pdf/financeiro-pdf');
      await pdf.gerarDocumentoFinanceiro(pdf.criarDefinicaoSaida(completo, empresaParaDocumento(empresa.data)), `saida-${completo.numero}.pdf`, acao);
      toast.success(acao === 'print' ? 'Impressão preparada.' : 'PDF preparado para download.');
    } catch (erro) { toast.error(erroTexto(erro)); }
    finally { trava.current = false; setOcupado(false); }
  };
  const exportar = async (formato: 'pdf' | 'excel') => {
    if (trava.current || !listaValida) return; trava.current = true; setOcupado(true);
    try {
      if (!empresa.data || empresa.isError) throw new Error('Carregue as configurações da empresa antes de exportar.');
      const registros = escopo === 'pagina' ? dados : await buscarTodosFiltrados((offset, limit) => utils.pedidos.list.fetch({ ...filtrosConsulta, ordenarPor: 'data', direcao: 'desc', offset, limit }), (n, totalConsulta) => setProgresso(`Carregando ${n} de ${totalConsulta} registros…`));
      const criterios = [escopo === 'todos' ? 'Escopo: toda a consulta' : `Escopo: página ${filtros.page + 1}`, `Busca: ${search || 'não aplicada'}`, `Situação: ${filtros.status || 'todas'}`, `Período: ${formatDateBR(filtros.dataInicio) || '-'} a ${formatDateBR(filtros.dataFim) || '-'}`, `Destinatário: ${filtros.clienteSelecionado?.nome || (filtros.clienteSelecionado ? filtros.clienteSelecionado.id : 'todos')}`, `Pagamento: ${pagamentos.data?.find(p => p.id === filtros.formaPagamento)?.nome || 'todos'}`];
      const config = empresaParaDocumento(empresa.data);
      if (formato === 'pdf') await (await import('@/lib/pdf/saidas-export-pdf')).exportarSaidasParaPDF(registros, colunas, config, criterios);
      else (await import('@/lib/excel/saidas-export-excel')).exportarSaidasParaExcel(registros, colunas, config, criterios);
      setExportarAberto(false); toast.success(`${registros.length} registros exportados.`);
    } catch (erro) { toast.error(erroTexto(erro)); }
    finally { trava.current = false; setOcupado(false); setProgresso(''); }
  };
  const encerrado = (p: PedidoListado) => ['FINALIZADO', 'CANCELADO'].includes(p.status || '');
  const titulos: Record<Acao, string> = { finalizar: 'Finalizar despesa', cancelar: 'Cancelar despesa', duplicar: 'Duplicar despesa', excluir: 'Excluir despesa' };
  const prontoFormulario = !!tipos.data && !!pagamentos.data && !tipos.isError && !pagamentos.isError;
  const falhaConfiguracao = empresa.isError || pagamentos.isError || tipos.isError;
  return <AppLayout>
    <OperationalHeader description="Registre despesas e acompanhe os valores em aberto e finalizados." actions={<>
      <Button variant="outlined" startIcon={<Refresh />} disabled={ocupado || !!erroPeriodo || lista.isFetching} onClick={atualizarConsulta}>Atualizar</Button>
      <Button variant="outlined" startIcon={<FileDownload />} disabled={ocupado || !listaValida || !total || !empresa.data || empresa.isError} onClick={() => setExportarAberto(true)}>Exportar</Button>
      <Button variant="contained" startIcon={<Add />} disabled={ocupado} onClick={() => abrirFormulario()}>Nova despesa</Button>
    </>} />
    {falhaConfiguracao && <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" onClick={() => { void empresa.refetch(); void pagamentos.refetch(); void tipos.refetch(); }}>Tentar novamente</Button>}>Não foi possível carregar as configurações necessárias aos formulários e documentos.</Alert>}
    {estatisticas.isError ? <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" onClick={() => void estatisticas.refetch()}>Tentar novamente</Button>}>Os indicadores não puderam ser atualizados. Não use valores anteriores para conferir esta consulta.</Alert> : <OperationalSummary variant="cards" label="Indicadores da consulta" loading={estatisticas.isPending || !!erroPeriodo || consultaPendente} items={[
      { label: 'Despesas na consulta', value: estatisticas.data?.total ?? '—', help: 'Todos os registros que correspondem aos filtros, em todas as páginas.' },
      { label: 'Valor finalizado', value: moeda(estatisticas.data?.valorFinalizado ?? 0), help: 'Somente despesas finalizadas na consulta.' },
      { label: 'Valor em aberto', value: moeda(estatisticas.data?.valorPendente ?? 0), help: 'Despesas pendentes e confirmadas na consulta.' },
      { label: 'Valor cancelado', value: moeda(estatisticas.data?.valorCancelado ?? 0), help: 'Registros cancelados, separados das despesas finalizadas.' },
    ]} />}
    <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 2 }} aria-live="polite">{lista.isFetching || estatisticas.isFetching ? 'Atualizando consulta…' : lista.dataUpdatedAt ? `Consulta atualizada às ${new Date(Math.min(lista.dataUpdatedAt, estatisticas.dataUpdatedAt || lista.dataUpdatedAt)).toLocaleTimeString('pt-BR', { timeZone: 'America/Fortaleza', hour: '2-digit', minute: '2-digit' })}. Atualização automática a cada minuto.` : 'Carregando consulta…'}</Typography>
    <Card sx={operationalSurface}>
      <Box sx={{ p: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(240px, 1fr) 220px auto' }, gap: 1.5 }}>
        <TextField label="Buscar despesa" placeholder="Número ou destinatário" size="small" value={filtros.search} onChange={e => atualizarFiltro('search', e.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }, htmlInput: { maxLength: 200 } }} />
        <TextField select label="Situação" size="small" value={filtros.status} onChange={e => atualizarFiltro('status', e.target.value as typeof filtros.status)}>
          <MenuItem value="">Todas</MenuItem>{['PENDENTE', 'CONFIRMADO', 'FINALIZADO', 'CANCELADO'].map(s => <MenuItem key={s} value={s}>{s === 'PENDENTE' ? 'Pendente' : s === 'CONFIRMADO' ? 'Confirmado' : s === 'FINALIZADO' ? 'Finalizado' : 'Cancelado'}</MenuItem>)}
        </TextField>
        <Button startIcon={<FilterList />} variant="outlined" aria-expanded={filtros.filtrosExpanded} aria-controls="filtros-saidas" onClick={() => atualizarFiltro('filtrosExpanded', !filtros.filtrosExpanded)}>Filtros{contarFiltrosAtivos ? ` (${contarFiltrosAtivos})` : ''}</Button>
      </Box>
      <Collapse in={filtros.filtrosExpanded}><Box id="filtros-saidas" sx={{ px: 2, pb: 2, display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1.5fr 1fr' } }}>
        <TextField type="date" label="Data inicial" size="small" value={filtros.dataInicio} onChange={e => atualizarFiltro('dataInicio', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField type="date" label="Data final" size="small" error={!!erroPeriodo} helperText={erroPeriodo} value={filtros.dataFim} onChange={e => atualizarFiltro('dataFim', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <DestinatarioField criar={false} historico selecionado={filtros.clienteSelecionado} texto={filtros.clienteSelecionado?.nome || ''} onChange={p => atualizarFiltro('clienteSelecionado', p ? { id: p.id, nome: p.nome } : null)} />
        <TextField select label="Pagamento" size="small" value={filtros.formaPagamento} onChange={e => atualizarFiltro('formaPagamento', e.target.value)}><MenuItem value="">Todos</MenuItem>{pagamentos.data?.map(p => <MenuItem key={p.id} value={p.id}>{p.nome}</MenuItem>)}</TextField>
      </Box></Collapse>
      {temFiltrosAtivos && <Button size="small" sx={{ mx: 2, mb: 1 }} onClick={limparFiltros}>Limpar filtros</Button>}
      {erroPeriodo && !filtros.filtrosExpanded && <Alert severity="warning">{erroPeriodo}</Alert>}
      {(lista.isFetching || consultaPendente) && <LinearProgress aria-label="Atualizando despesas" />}
      {lista.isError ? <Alert severity="error" sx={{ m: 2 }} action={<Button color="inherit" onClick={() => void lista.refetch()}>Tentar novamente</Button>}>Não foi possível carregar as despesas. {lista.error.message}</Alert> : !pronto || lista.isPending ? <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} aria-label="Carregando despesas" /></Box> : !dados.length ? <Box sx={{ p: 4, textAlign: 'center' }}><Typography fontWeight={600}>Nenhuma despesa nesta consulta</Typography><Typography variant="body2" color="text.secondary">{temFiltrosAtivos ? 'Ajuste os filtros para encontrar outros registros.' : 'Registre uma despesa para começar.'}</Typography></Box> : <TableContainer>
        <Table sx={operationalTable} aria-label="Despesas financeiras da consulta"><TableHead><TableRow>{['Número', 'Data', 'Destinatário / descrição', 'Pagamento', 'Valor', 'Situação', 'Ações'].map(t => <TableCell key={t} align={t === 'Valor' ? 'right' : 'left'}>{t}</TableCell>)}</TableRow></TableHead><TableBody>
          {dados.map(p => <TableRow key={p.id} hover>
            <TableCell><Button size="small" onClick={() => setDetalheId(p.id)} aria-label={`Consultar despesa ${p.numero}`}>#{p.numero}</Button></TableCell>
            <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateBR(p.data)}</TableCell>
            <TableCell sx={{ minWidth: 220, maxWidth: 440 }}><Typography variant="body2" fontWeight={600} sx={{ overflowWrap: 'anywhere' }}>{p.cliente_nome || 'Não informado'}</Typography>{p.observacao && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.observacao}>{p.observacao}</Typography>}</TableCell>
            <TableCell>{p.forma_pagamento_nome || 'Não informado'}</TableCell><TableCell align="right" sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{moeda(p.total || 0)}</TableCell>
            <TableCell><StatusBadge status={p.status || ''} /></TableCell><TableCell sx={{ whiteSpace: 'nowrap' }}>
              <Tooltip title="Consultar despesa"><IconButton aria-label={`Consultar despesa ${p.numero}`} onClick={() => setDetalheId(p.id)}><Visibility fontSize="small" /></IconButton></Tooltip>
              <IconButton aria-label={`Ações da despesa ${p.numero}`} aria-haspopup="menu" disabled={ocupado} onClick={e => setMenu({ anchor: e.currentTarget, pedido: p })}><MoreVert fontSize="small" /></IconButton>
            </TableCell>
          </TableRow>)}
        </TableBody></Table>
      </TableContainer>}
      <TablePagination component="div" count={total} page={Math.min(filtros.page, Math.max(0, Math.ceil(total / filtros.rowsPerPage) - 1))} rowsPerPage={filtros.rowsPerPage} rowsPerPageOptions={[5, 10, 25, 50, 100]} onPageChange={(_, page) => atualizarFiltro('page', page)} onRowsPerPageChange={e => atualizarFiltro('rowsPerPage', Number(e.target.value))} labelRowsPerPage="Por página" labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`} />
    </Card>
    <Menu anchorEl={menu?.anchor} open={!!menu} onClose={() => setMenu(null)}>
      <MenuItem disabled={ocupado || !empresa.data || empresa.isError} onClick={() => menu && void documentoIndividual(menu.pedido, 'print')}><ListItemIcon><Print fontSize="small" /></ListItemIcon><ListItemText>Imprimir saída</ListItemText></MenuItem>
      <MenuItem disabled={ocupado || !empresa.data || empresa.isError} onClick={() => menu && void documentoIndividual(menu.pedido, 'download')}><ListItemIcon><FileDownload fontSize="small" /></ListItemIcon><ListItemText>Baixar PDF</ListItemText></MenuItem>
      {menu && !encerrado(menu.pedido) && <MenuItem onClick={() => abrirFormulario(menu.pedido)}><ListItemIcon><Edit fontSize="small" /></ListItemIcon><ListItemText>Editar</ListItemText></MenuItem>}
      {menu && !encerrado(menu.pedido) && <MenuItem onClick={() => pedirAcao('finalizar', menu.pedido)}><ListItemIcon><CheckCircle fontSize="small" /></ListItemIcon><ListItemText>Finalizar</ListItemText></MenuItem>}
      {menu && !encerrado(menu.pedido) && <MenuItem onClick={() => pedirAcao('cancelar', menu.pedido)}><ListItemIcon><Cancel fontSize="small" /></ListItemIcon><ListItemText>Cancelar despesa</ListItemText></MenuItem>}
      {menu && <MenuItem onClick={() => pedirAcao('duplicar', menu.pedido)}><ListItemIcon><ContentCopy fontSize="small" /></ListItemIcon><ListItemText>Duplicar como pendente</ListItemText></MenuItem>}
      {menu && operador.data?.papel === 'ADMIN' && !encerrado(menu.pedido) && <MenuItem sx={{ color: 'error.main' }} onClick={() => pedirAcao('excluir', menu.pedido)}><ListItemIcon><Delete color="error" fontSize="small" /></ListItemIcon><ListItemText>Excluir</ListItemText></MenuItem>}
    </Menu>
    <Dialog open={!!detalheId} onClose={() => setDetalheId(null)} fullWidth maxWidth="sm" aria-labelledby="titulo-detalhe-saida">
      <DialogTitle id="titulo-detalhe-saida" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>Despesa #{detalhes.data?.numero ?? '…'}<IconButton aria-label="Fechar detalhes da despesa" onClick={() => setDetalheId(null)}><Close /></IconButton></DialogTitle>
      <DialogContent dividers>
        {detalhes.isPending ? <CircularProgress aria-label="Carregando detalhes" /> : detalhes.isError ? <Alert severity="error" action={<Button color="inherit" onClick={() => void detalhes.refetch()}>Tentar novamente</Button>}>Não foi possível carregar os detalhes.</Alert> : detalhes.data && <Box sx={{ display: 'grid', gap: 2 }}>
          {detalhes.isFetching && <LinearProgress aria-label="Atualizando detalhes" />}<StatusBadge status={detalhes.data.status || ''} />
          <Box><Typography variant="caption" color="text.secondary">Destinatário</Typography><Typography sx={{ overflowWrap: 'anywhere' }}>{detalhes.data.cliente_nome || 'Não informado'}</Typography></Box>
          <Box><Typography variant="caption" color="text.secondary">Data · pagamento</Typography><Typography>{formatDateBR(detalhes.data.data)} · {detalhes.data.forma_pagamento_nome || 'Não informado'}</Typography></Box>
          <Box><Typography variant="caption" color="text.secondary">Descrição</Typography><Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{detalhes.data.observacao || 'Não informada'}</Typography></Box>
          <Typography variant="h5" fontWeight={700} sx={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{moeda(detalhes.data.total || 0)}</Typography>
        </Box>}
      </DialogContent><DialogActions sx={{ p: 2, flexWrap: 'wrap', gap: 1 }}>
        <Button onClick={() => setDetalheId(null)}>Fechar</Button>
        {detalhes.data && !detalhes.isError && <><Button startIcon={<Print />} disabled={ocupado || empresa.isError || !empresa.data} onClick={() => void documentoIndividual(detalhes.data, 'print')}>Imprimir</Button>{!encerrado(detalhes.data) && <Button variant="outlined" disabled={ocupado} onClick={() => abrirFormulario(detalhes.data)}>Editar</Button>}</>}
      </DialogActions>
    </Dialog>
    <Dialog open={!!formulario} onClose={ocupado ? undefined : () => setFormulario(null)} fullWidth maxWidth="sm" aria-labelledby="titulo-form-saida">
      <Box component="form" onSubmit={e => { e.preventDefault(); void salvar(); }}>
        <DialogTitle id="titulo-form-saida">{editando ? `Editar despesa #${editando.numero}` : 'Nova despesa'}</DialogTitle>
        <DialogContent>{formulario && <SaidaForm valor={formulario} onChange={setFormulario} pagamentos={editando?.forma_pagamento_id && !pagamentos.data?.some(p => p.id === editando.forma_pagamento_id) ? [...(pagamentos.data ?? []), { id: editando.forma_pagamento_id, nome: `${editando.forma_pagamento_nome || 'Pagamento anterior'} (inativo)` }] : pagamentos.data ?? []} disabled={ocupado} erro={erroForm} />}{!prontoFormulario && <Alert severity="warning" sx={{ mt: 2 }} action={<Button color="inherit" onClick={() => { void pagamentos.refetch(); void tipos.refetch(); }}>Atualizar</Button>}>Carregando os dados necessários ao registro.</Alert>}</DialogContent>
        <DialogActions sx={{ p: 2 }}><Button disabled={ocupado} onClick={() => setFormulario(null)}>Fechar</Button><Button type="submit" variant="contained" disabled={ocupado || !prontoFormulario}>{ocupado ? 'Salvando…' : editando ? 'Salvar alterações' : 'Registrar despesa'}</Button></DialogActions>
      </Box>
    </Dialog>
    <ConfirmDialog open={!!confirmacao} title={confirmacao ? titulos[confirmacao.acao] : ''} message={confirmacao ? `Despesa #${confirmacao.pedido.numero} · ${moeda(confirmacao.pedido.total || 0)}\n${confirmacao.acao === 'excluir' ? 'A exclusão é permanente e não pode ser desfeita.' : confirmacao.acao === 'duplicar' ? 'Será criado um novo registro pendente.' : confirmacao.acao === 'finalizar' ? 'O registro ficará finalizado e seus dados não poderão ser editados.' : 'O registro ficará cancelado e não comporá o valor finalizado.'}` : ''} severity={confirmacao?.acao === 'excluir' ? 'error' : 'warning'} confirmText={confirmacao ? titulos[confirmacao.acao] : 'Confirmar'} loading={ocupado} onClose={() => setConfirmacao(null)} onConfirm={executarAcao} />
    <Dialog open={exportarAberto} onClose={ocupado ? undefined : () => setExportarAberto(false)} fullWidth maxWidth="sm" aria-labelledby="titulo-export-saidas">
      <DialogTitle id="titulo-export-saidas">Exportar despesas</DialogTitle><DialogContent>
        <TextField select label="Escopo" fullWidth size="small" sx={{ mt: 1, mb: 2 }} value={escopo} disabled={ocupado} onChange={e => setEscopo(e.target.value as typeof escopo)}><MenuItem value="todos">Toda a consulta ({total} registros)</MenuItem><MenuItem value="pagina">Página atual ({dados.length} registros)</MenuItem></TextField>
        <Typography variant="body2" color="text.secondary">Os filtros atuais serão preservados. Escolha as colunas:</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>{colunas.map(c => <FormControlLabel key={c.id} label={c.label} control={<Checkbox checked={c.selecionada} disabled={ocupado} onChange={e => setColunas(v => v.map(col => col.id === c.id ? { ...col, selecionada: e.target.checked } : col))} />} />)}</Box>
        {progresso && <Typography role="status" variant="body2">{progresso}</Typography>}
      </DialogContent><DialogActions sx={{ p: 2 }}><Button disabled={ocupado} onClick={() => setExportarAberto(false)}>Fechar</Button><Button disabled={ocupado || !listaValida || !colunas.some(c => c.selecionada)} onClick={() => void exportar('excel')}>Excel</Button><Button variant="contained" disabled={ocupado || !listaValida || !colunas.some(c => c.selecionada)} onClick={() => void exportar('pdf')}>PDF</Button></DialogActions>
    </Dialog>
  </AppLayout>;
}
