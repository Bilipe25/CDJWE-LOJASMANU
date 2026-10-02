'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Box,
  Card,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  TablePagination,
  Tooltip,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Divider,
  Alert,
  Autocomplete,
  Menu,
  ListItemIcon,
  ListItemText,
  AccordionDetails,
  useMediaQuery,
  useTheme,
  Checkbox,
  Collapse,
  FormControlLabel,
} from '@mui/material';
import {
  Search,
  Visibility,
  Print,
  ContentCopy,
  Cancel,
  CheckCircle,
  Receipt,
  FilterList,
  Person,
  Edit,
  Close,
  AttachMoney,
  Notes,
  Check,
  Delete,
  MoreVert,
  FileDownload,
  TableChart,
  PictureAsPdf,
} from '@mui/icons-material';
import AppLayout from '@/components/layout/AppLayout';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import PrintConfirmDialog from '@/components/common/PrintConfirmDialog';
import StatusBadge from '@/components/common/StatusBadge';
import LoadingSkeleton from '@/components/common/LoadingSkeleton';
import { trpc } from '@/lib/trpc/client';
import { OperationalHeader, OperationalSummary, operationalSurface, operationalTable } from '@/components/common/OperationalPage';
import type { PedidoListado as Pedido } from '@/server/routers/pedidos';
import { empresaParaDocumento, pedidoParaDocumento, buscarTodosFiltrados } from '@/lib/utils/documentos';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { validarFiltrosPedidos } from '@/lib/schemas/filtros-pedidos';
import { formatarEndereco } from '@/lib/utils/endereco';
import { usePedidosFiltros } from '@/hooks/usePedidosFiltros';

function PedidosPageContent() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { data: operador } = trpc.auth.me.useQuery();
  const podeExcluir = operador?.papel === 'ADMIN';

  // Hook customizado para gerenciar filtros com persistência
  const {
    filtros,
    pronto,
    atualizarFiltro,
    limparFiltros: limparFiltrosHook,
    getUrlComFiltros,
    temFiltrosAtivos,
    contarFiltrosAtivos
  } = usePedidosFiltros();

  // Destructuring dos filtros para facilitar o uso
  const {
    page,
    rowsPerPage,
    status,
    search,
    dataInicio,
    dataFim,
    tipoAtendimento,
    formaPagamento,
    clienteSelecionado,
    filtrosExpanded
  } = filtros;
  const [pedidoDetalhes, setPedidoDetalhes] = useState<Pedido | null>(null);
  const [dialogDetalhes, setDialogDetalhes] = useState(false);
  const [dialogEditar, setDialogEditar] = useState(false);
  const [searchCliente, setSearchCliente] = useState('');
  const [pedidoEditando, setPedidoEditando] = useState<any>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    severity?: 'warning' | 'error' | 'info' | 'success';
  }>({ open: false, title: '', message: '', onConfirm: () => { }, severity: 'warning' });
  const [printDialog, setPrintDialog] = useState<{
    open: boolean;
    pedido: Pedido | null;
  }>({ open: false, pedido: null });
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<any>(null);
  const [dialogExportar, setDialogExportar] = useState(false);
  const [escopoExportacao, setEscopoExportacao] = useState<'pagina' | 'todos'>('pagina');
  const [exportando, setExportando] = useState(false);
  const [progressoExportacao, setProgressoExportacao] = useState('');
  const exportacaoEmCurso = useRef(false);
  const buscaClienteDebounced = useDebouncedValue(searchCliente);
  const buscaDebounced = useDebouncedValue(search);
  const [colunasExportacao, setColunasExportacao] = useState([
    { id: 'numero', label: 'Número', selecionada: true },
    { id: 'data', label: 'Data', selecionada: true },
    { id: 'cliente', label: 'Cliente', selecionada: true },
    { id: 'tipo', label: 'Tipo', selecionada: true },
    { id: 'pagamento', label: 'Forma Pagamento', selecionada: true },
    { id: 'itens', label: 'Qtd. Itens', selecionada: false },
    { id: 'total', label: 'Total', selecionada: true },
    { id: 'status', label: 'Status', selecionada: true },
  ]);

  const searchParams = useSearchParams();
  const pedidoIdUrl = searchParams?.get('id');

  // Mostrar toast quando retornar da edição com filtros
  useEffect(() => {
    const voltouDeEdicao = searchParams.get('voltou_edicao') === 'true';
    if (voltouDeEdicao && temFiltrosAtivos) {
      toast.success('Filtros restaurados!', {
        duration: 2000,
        icon: <Search />,
      });
    }
  }, [searchParams, temFiltrosAtivos]);

  const filtrosConsulta = {
    search: buscaDebounced || undefined,
    status,
    dataInicio: dataInicio || undefined,
    dataFim: dataFim || undefined,
    tipoAtendimento: tipoAtendimento || undefined,
    formaPagamentoId: formaPagamento || undefined,
    clienteId: clienteSelecionado?.id,
  };
  const { data, isLoading, error: erroLista, isFetching: atualizandoLista, refetch: recarregarLista } = trpc.pedidos.list.useQuery({ ...filtrosConsulta, limit: rowsPerPage, offset: page * rowsPerPage }, { enabled: pronto });

  const { data: dadosEstatisticas, error: erroEstatisticas, refetch: recarregarEstatisticas } = trpc.pedidos.estatisticas.useQuery(filtrosConsulta, { enabled: pronto });

  useEffect(() => {
    if (data && page > Math.max(0, Math.ceil(data.total / rowsPerPage) - 1)) atualizarFiltro('page', Math.max(0, Math.ceil(data.total / rowsPerPage) - 1));
  }, [data, page, rowsPerPage, atualizarFiltro]);
  const { data: clienteDoFiltro } = trpc.clientes.getById.useQuery({ id: clienteSelecionado?.id || '' }, { enabled: pronto && !!clienteSelecionado?.id && !clienteSelecionado.nome });
  const nomeClienteFiltro = clienteSelecionado?.nome || clienteDoFiltro?.nome || 'Cliente selecionado';

  // Query para buscar pedido específico da URL
  const { data: pedidoUrl, isLoading: loadingPedidoUrl, error: erroPedidoUrl, refetch: recarregarPedidoUrl } = trpc.pedidos.getById.useQuery(
    { id: pedidoIdUrl || '' },
    { enabled: !!pedidoIdUrl }
  );

  // Abrir dialog automaticamente quando vier da URL
  useEffect(() => {
    if (pedidoUrl && pedidoIdUrl) {
      setPedidoDetalhes(pedidoUrl);
      setDialogDetalhes(true);
    }
  }, [pedidoUrl, pedidoIdUrl]);

  const { data: clientes } = trpc.clientes.list.useQuery({
    limit: 50,
    ativo: null,
    offset: 0,
    search: buscaClienteDebounced || undefined,
  });

  const { data: pedidoCompleto, isLoading: loadingDetalhes, error: erroDetalhes, refetch: recarregarDetalhes } = trpc.pedidos.getById.useQuery(
    { id: pedidoDetalhes?.id || '' },
    { enabled: !!pedidoDetalhes?.id }
  );

  const cancelarMutation = trpc.pedidos.cancelar.useMutation();
  const finalizarMutation = trpc.pedidos.finalizar.useMutation();
  const duplicarMutation = trpc.pedidos.duplicar.useMutation();
  const atualizarMutation = trpc.pedidos.update.useMutation();
  const deletarMutation = trpc.pedidos.delete.useMutation();

  const { data: tiposAtendimento } = trpc.dominios.tiposAtendimento.list.useQuery();
  const { data: formasPagamento } = trpc.dominios.formasPagamento.list.useQuery();
  const { data: configuracoes, error: erroEmpresa, isLoading: carregandoEmpresa } = trpc.configuracoes.get.useQuery();

  const pedidos = data?.pedidos || [];
  const total = data?.total || 0;


  const estatisticas = {
    totalPedidos: dadosEstatisticas?.total,
    pedidosPendentes: dadosEstatisticas?.pendentes,
    totalVendas: dadosEstatisticas?.valorTotal,
    finalizadosHoje: dadosEstatisticas?.finalizadosHoje,
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    atualizarFiltro('page', newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    atualizarFiltro('rowsPerPage', parseInt(event.target.value, 10));
    atualizarFiltro('page', 0);
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      // Parse manual para evitar conversão de timezone
      const [year, month, day] = dateString.split('T')[0].split('-');
      return `${day}/${month}/${year}`;
    } catch {
      return '-';
    }
  };



  // Função para atualizar a lista de pedidos sem reload
  const atualizarListaPedidos = async () => {
    await utils.invalidate();
  };

  // Função para obter cor do chip de tipo de atendimento
  const getTipoChipColor = (tipo: string | null) => {
    const tipoUpper = tipo?.toUpperCase() || '';

    const colorMap: Record<string, 'success' | 'primary' | 'warning' | 'error' | 'info' | 'default'> = {
      'ENTRADA': 'success',
      'SAIDA': 'error',
      'SAÍDA': 'error',
      'ORÇAMENTO': 'warning',
      'S/MOVIMENTO': 'default',
    };

    return colorMap[tipoUpper] || 'default';
  };

  const handleFecharDialogDetalhes = () => {
    setDialogDetalhes(false);
    setPedidoDetalhes(null);
    // Limpar parâmetro da URL
    if (pedidoIdUrl) {
      router.push('/pedidos');
    }
  };

  const handleImprimirPedido = async (pedido: Pedido | null, acao: 'print' | 'download' = 'print') => {
    if (!pedido) return;
    if (erroEmpresa || carregandoEmpresa) { toast.error('Aguarde os dados da empresa ou tente novamente antes de imprimir.'); return; }
    const toastId = toast.loading('Gerando documento...');

    try {
      const pedidoCompleto = await utils.pedidos.getById.fetch({ id: pedido.id });

      if (!pedidoCompleto) {
        throw new Error('Pedido não encontrado');
      }

      const dadosPedido = pedidoParaDocumento(pedidoCompleto);
      const dadosEmpresa = empresaParaDocumento(configuracoes);

      const { gerarPedidoPDF } = await import('@/lib/pdf/pedido-pdf');
      await gerarPedidoPDF(dadosPedido, dadosEmpresa, acao);
      toast.dismiss(toastId);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar o documento. Tente novamente.', { id: toastId });
    }
  };

  const handleVisualizarPedido = (pedido: Pedido | null) => {
    if (!pedido) return;
    setPedidoDetalhes(pedido);
    setDialogDetalhes(true);
  };

  const handleEditarPedido = (pedido: Pedido | null) => {
    if (!pedido) return;
    if (['CANCELADO','FINALIZADO'].includes(pedido.status || '')) { toast.error('Este pedido está encerrado e não pode ser editado.'); return; }
    // Redirecionar para PDV com o ID do pedido para edição
    // Salvar URL de retorno com filtros no sessionStorage
    const urlRetorno = getUrlComFiltros('/pedidos');
    sessionStorage.setItem('pedidos_url_retorno', urlRetorno);
    router.push(`/pdv?edit=${pedido.id}`);
  };

  const handleSalvarEdicao = async () => {
    if (!pedidoEditando || atualizarMutation.isPending) return;

    const toastId = toast.loading('Salvando alterações...');

    try {
      await atualizarMutation.mutateAsync({
        id: pedidoEditando.id,
        versao: pedidoEditando.versao,
        cliente_id: pedidoEditando.cliente_id || undefined,
        endereco_id: pedidoEditando.endereco_id || undefined,
        tipo_atendimento_id: pedidoEditando.tipo_atendimento_id || undefined,
        forma_pagamento_id: pedidoEditando.forma_pagamento_id || undefined,
        desconto_valor: pedidoEditando.desconto_valor ?? 0,
        observacao: pedidoEditando.observacao,
        status: pedidoEditando.status === 'CONFIRMADO' ? 'CONFIRMADO' : 'PENDENTE',
      });

      toast.success('Pedido atualizado com sucesso!', { id: toastId });
      setDialogEditar(false);
      setPedidoEditando(null);

      // Atualizar lista sem reload
      await atualizarListaPedidos();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar pedido. Tente novamente.', { id: toastId });
    }
  };

  const handleCancelarPedido = async (pedido: Pedido | null) => {
    if (!pedido) return;
    setConfirmDialog({
      open: true,
      title: 'Cancelar Pedido',
      message: `Deseja realmente cancelar o pedido #${pedido.numero}?\n\nO pedido ficará com status CANCELADO.`,
      severity: 'warning',
      onConfirm: async () => {
        const toastId = toast.loading('Cancelando pedido...');

        try {
          await cancelarMutation.mutateAsync({ id: pedido.id, versao: pedido.versao });
          setConfirmDialog(atual => ({ ...atual, open: false }));
          toast.success(`Pedido #${pedido.numero} cancelado com sucesso!`, { id: toastId });
          await atualizarListaPedidos();
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Erro ao cancelar pedido. Tente novamente.', { id: toastId });
        }
      },
    });
  };

  const handleFinalizarPedido = async (pedido: Pedido | null) => {
    if (!pedido) return;
    setConfirmDialog({
      open: true,
      title: 'Finalizar Pedido',
      message: `Deseja finalizar o pedido #${pedido.numero}?\n\nO pedido ficará com status FINALIZADO.`,
      severity: 'success',
      onConfirm: async () => {
        const toastId = toast.loading('Finalizando pedido...');

        try {
          await finalizarMutation.mutateAsync({ id: pedido.id, versao: pedido.versao });
          setConfirmDialog(atual => ({ ...atual, open: false }));
          toast.success(`Pedido #${pedido.numero} finalizado com sucesso!`, { id: toastId });
          await atualizarListaPedidos();
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Erro ao finalizar pedido. Tente novamente.', { id: toastId });
        }
      },
    });
  };

  const handleDuplicarPedido = async (pedido: Pedido | null) => {
    if (!pedido) return;
    const chave = crypto.randomUUID();
    setConfirmDialog({
      open: true,
      title: 'Duplicar Pedido',
      message: `Deseja duplicar o pedido #${pedido.numero}?\n\nUma cópia do pedido será criada com todos os itens.`,
      severity: 'info',
      onConfirm: async () => {
        const toastId = toast.loading('Duplicando pedido...');

        try {
          await duplicarMutation.mutateAsync({ id: pedido.id, versao: pedido.versao, chave_requisicao: chave });
          setConfirmDialog(atual => ({ ...atual, open: false }));
          toast.success('Pedido duplicado com sucesso!', { id: toastId });
          await atualizarListaPedidos();
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Erro ao duplicar pedido. Tente novamente.', { id: toastId });
        }
      },
    });
  };

  const handleExcluirPedido = async (pedido: Pedido | null) => {
    if (!pedido) return;
    setConfirmDialog({
      open: true,
      title: 'Excluir Pedido Permanentemente',
      message: `⚠️ ATENÇÃO: Deseja realmente EXCLUIR o pedido #${pedido.numero}?\n\n✗ Esta ação NÃO pode ser desfeita!\n✗ Todos os itens do pedido também serão excluídos.\n✗ Não será possível recuperar os dados.`,
      severity: 'error',
      onConfirm: async () => {
        const toastId = toast.loading('Excluindo pedido...');

        try {
          await deletarMutation.mutateAsync({ id: pedido.id, versao: pedido.versao });
          setConfirmDialog(atual => ({ ...atual, open: false }));
          toast.success(`Pedido #${pedido.numero} excluído com sucesso!`, { id: toastId });
          await atualizarListaPedidos();
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Erro ao excluir pedido. Tente novamente.', { id: toastId });
        }
      },
    });
  };

  const limparFiltros = () => {
    limparFiltrosHook();
  };

  const exportar = async (formato: 'pdf' | 'excel') => {
    if (erroEmpresa || carregandoEmpresa) { toast.error('Dados da empresa indisponíveis. Tente novamente antes de exportar.'); return; }
    if (search !== buscaDebounced || atualizandoLista || exportacaoEmCurso.current || erroLista || !data || !colunasExportacao.some(c => c.selecionada)) return;
    exportacaoEmCurso.current = true; setExportando(true); setProgressoExportacao('Preparando exportação…');
    // Congelar filtros, colunas e empresa antes de aguardar as consultas.
    const consulta = { ...filtrosConsulta }, colunas = colunasExportacao.map(c => ({ ...c }));
    const empresa = empresaParaDocumento(configuracoes);
    const filtrosTexto = [escopoExportacao === 'todos' ? 'Todos os pedidos filtrados' : 'Página atual'];
    if (search) filtrosTexto.push('Busca: ' + search);
    if (status) filtrosTexto.push('Status: ' + status);
    if (tipoAtendimento) filtrosTexto.push('Tipo: ' + tipoAtendimento);
    if (formaPagamento) filtrosTexto.push('Pagamento: ' + (formasPagamento?.find(f => f.id === formaPagamento)?.nome || formaPagamento));
    if (clienteSelecionado) filtrosTexto.push('Cliente: ' + nomeClienteFiltro);
    if (dataInicio || dataFim) filtrosTexto.push('Período: ' + (dataInicio ? formatDate(dataInicio) : 'Início') + ' até ' + (dataFim ? formatDate(dataFim) : 'Fim'));
    try {
      const registros = escopoExportacao === 'todos'
        ? await buscarTodosFiltrados((offset, limit) => utils.pedidos.list.fetch({ ...consulta, offset, limit }), (quantidade, total) => setProgressoExportacao(quantidade + ' de ' + total + ' pedidos carregados'))
        : [...pedidos];
      if (!registros.length) throw new Error('Nenhum pedido para exportar com estes filtros.');
      if (formato === 'pdf') {
        const { exportarPedidosParaPDF } = await import('@/lib/pdf/pedidos-export-pdf');
        await exportarPedidosParaPDF(registros, colunas, empresa, filtrosTexto);
      } else {
        const { exportarPedidosParaExcel } = await import('@/lib/excel/pedidos-export-excel');
        exportarPedidosParaExcel(registros, colunas, empresa, filtrosTexto);
      }
      toast.success('Documento exportado com sucesso!'); setDialogExportar(false);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Erro ao exportar. Tente novamente.'); }
    finally { exportacaoEmCurso.current = false; setExportando(false); setProgressoExportacao(''); }
  };

  const toggleColuna = (colunaId: string) => {
    setColunasExportacao(prev =>
      prev.map(col =>
        col.id === colunaId ? { ...col, selecionada: !col.selecionada } : col
      )
    );
  };

  const selecionarTodasColunas = () => {
    setColunasExportacao(prev => prev.map(col => ({ ...col, selecionada: true })));
  };

  const desmarcarTodasColunas = () => {
    setColunasExportacao(prev => prev.map(col => ({ ...col, selecionada: false })));
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, pedido: Pedido | null) => {
    if (!pedido) return;
    setMenuAnchor(event.currentTarget);
    setPedidoSelecionado(pedido);
  };

  const handleCloseMenu = () => {
    setMenuAnchor(null);
    setPedidoSelecionado(null);
  };

  const handleMenuAction = (action: () => void) => {
    handleCloseMenu();
    action();
  };

  return (
    <AppLayout>
      <OperationalHeader description="Consulte, confira e acompanhe os pedidos." actions={<>
        <Button variant="outlined" startIcon={<FileDownload />} onClick={() => setDialogExportar(true)}>Exportar</Button>
        <Button variant="contained" startIcon={<Receipt />} onClick={() => router.push('/pdv')}>Novo pedido</Button>
      </>} />
      {erroEstatisticas && <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" onClick={() => recarregarEstatisticas()}>Tentar novamente</Button>}>Indicadores indisponíveis.</Alert>}
      <OperationalSummary label="Indicadores da consulta" items={[
        { label: 'Pedidos na consulta', value: erroEstatisticas ? '—' : estatisticas.totalPedidos ?? '—' },
        { label: 'Pendentes', value: erroEstatisticas ? '—' : estatisticas.pedidosPendentes ?? '—' },
        { label: 'Vendas finalizadas na consulta', value: erroEstatisticas || estatisticas.totalVendas === undefined ? '—' : formatCurrency(estatisticas.totalVendas) },
        { label: 'Finalizados hoje na consulta', value: erroEstatisticas ? '—' : estatisticas.finalizadosHoje ?? '—' },
      ]} />
      <Card sx={{ ...operationalSurface, overflow: 'hidden', maxWidth: '100%' }}>
<Box sx={{ p: 2.5 }}><Grid container spacing={2} alignItems="center">              <Grid item xs={12} sm={6} md={6}>
                <TextField
                  fullWidth size="small"
                  label="Buscar pedido"
                  placeholder="Número, cliente..."
                  value={search}
                  onChange={(e) => {
                    atualizarFiltro('search', e.target.value);
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel id="pedidos-select-1">Status</InputLabel>
                    <Select labelId="pedidos-select-1"
                    value={status}
                    label="Status"
                    onChange={(e) => {
                      atualizarFiltro('status', validarFiltrosPedidos({ status: e.target.value }).status);
                    }}
                  >
                    <MenuItem value="">Todos</MenuItem>
                    <MenuItem value="PENDENTE">Pendente</MenuItem>
                    <MenuItem value="CONFIRMADO">Confirmado</MenuItem>


                  <MenuItem value="FINALIZADO">Finalizado</MenuItem>
                    <MenuItem value="CANCELADO">Cancelado</MenuItem>
</Select>
                </FormControl>
              </Grid>


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
        {/* Filtros Avançados */}
        <Collapse
          in={filtrosExpanded}
          sx={{
            boxShadow: 'none',
            '&:before': { display: 'none' },
            borderBottom: '1px solid',
            borderColor: 'divider'
          }}
        >
          <AccordionDetails id="pedidos-filtros-adicionais" sx={{ px: 2.5, pb: 2.5 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel id="pedidos-select-2">Tipo</InputLabel>
                    <Select labelId="pedidos-select-2"
                    value={tipoAtendimento}
                    label="Tipo"
                    onChange={(e) => {
                      atualizarFiltro('tipoAtendimento', validarFiltrosPedidos({ tipoAtendimento: e.target.value }).tipoAtendimento);
                    }}
                  >
                    <MenuItem value="">Todos</MenuItem>
                    <MenuItem value="ENTRADA">ENTRADA</MenuItem>
                    <MenuItem value="SAIDA">SAÍDA</MenuItem>
                    <MenuItem value="ORÇAMENTO">ORÇAMENTO</MenuItem>
                    <MenuItem value="S/MOVIMENTO">S/MOVIMENTO</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel id="pedidos-select-3">Forma Pgto.</InputLabel>
                    <Select labelId="pedidos-select-3"
                    value={formaPagamento}
                    label="Forma Pgto."
                    onChange={(e) => {
                      atualizarFiltro('formaPagamento', e.target.value);
                    }}
                    startAdornment={
                      <InputAdornment position="start">
                        <AttachMoney fontSize="small" />
                      </InputAdornment>
                    }
                  >
                    <MenuItem value="">Todas</MenuItem>
                    {formasPagamento?.map((forma) => (
                      <MenuItem key={forma.id} value={forma.id}>
                        {forma.nome}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  type="date"
                  label="Data Início"
                  value={dataInicio}
                  onChange={(e) => {
                    atualizarFiltro('dataInicio', e.target.value);
                  }}
                  InputLabelProps={{ shrink: true }}

                />
              </Grid>

              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  type="date"
                  label="Data Fim"
                  value={dataFim}
                  onChange={(e) => {
                    atualizarFiltro('dataFim', e.target.value);
                  }}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <Autocomplete
                  options={(clientes?.clientes || []).map(c => ({ id: c.id, nome: c.nome }))}
                  filterOptions={(options) => options}
                  getOptionLabel={(option) => option.nome || ''}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  value={clienteSelecionado ? { ...clienteSelecionado, nome: nomeClienteFiltro } : null}
                  onChange={(_, newValue) => {
                    atualizarFiltro('clienteSelecionado', newValue);
                  }}
                  onInputChange={(_, value) => setSearchCliente(value)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Cliente"
                      placeholder="Selecione um cliente"
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <InputAdornment position="start">
                            <Person fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Collapse>

        {erroPedidoUrl && <Alert severity="error" action={<Button color="inherit" onClick={() => recarregarPedidoUrl()}>Tentar novamente</Button>}>Não foi possível abrir o pedido solicitado.</Alert>}
        {/* Loading do pedido da URL */}
        {loadingPedidoUrl && pedidoIdUrl && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4, gap: 2 }}>
            <CircularProgress size={24} />
            <Typography>Carregando pedido #{pedidoIdUrl.substring(0, 8)}...</Typography>
          </Box>
        )}

        {/* Tabela */}
        {erroLista ? <Alert severity="error" action={<Button color="inherit" onClick={() => recarregarLista()}>Tentar novamente</Button>}>Não foi possível carregar os pedidos. Confira a conexão e tente novamente.</Alert> : isLoading ? (
          <Box sx={{ p: 2 }}><LoadingSkeleton type="table" rows={5} /></Box>
        ) : pedidos.length === 0 ? (
          <EmptyState
            icon={<Receipt />}
            title="Nenhum pedido encontrado"
            description={
              status
                ? 'Tente ajustar os filtros de busca'
                : 'Os pedidos aparecerão aqui quando forem criados'
            }
          />
        ) : (
          <>
            <TableContainer>
              <Table size="small" sx={operationalTable}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Número</TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Data</TableCell>
                    <TableCell>Cliente</TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Tipo</TableCell>
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Pagamento</TableCell>
                    <TableCell align="right" sx={{ display: { xs: 'none', xl: 'table-cell' } }}>Itens</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Status</TableCell>
                    <TableCell align="right">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pedidos.map((pedido) => (
                    <TableRow
                      key={pedido.id}
                      hover
                      onClick={() => handleVisualizarPedido(pedido)}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: 'action.hover',
                        }
                      }}
                    >
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                        <Chip
                          label={`#${pedido.numero}`}
                          size="small"
                          variant="outlined"
                          color="primary"
                          sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{formatDate(pedido.data)}</TableCell>
                      <TableCell>
                        <Box>
<Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'block', sm: 'none' } }}>#{pedido.numero} · {formatDate(pedido.data)}</Typography>
                          <Box sx={{ fontWeight: 600 }}>{pedido.cliente_nome || 'Cliente não informado'}</Box>
<Box sx={{ display: { xs: 'block', sm: 'none' }, my: 0.5 }}><StatusBadge status={pedido.status || 'Não informado'} /></Box>
                          {pedido.cliente_telefone && (
                            <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                              {pedido.cliente_telefone}
                            </Box>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        <Chip
                          label={pedido.tipo_atendimento_nome || 'Sem Tipo'}
                          size="small"
                          color={getTipoChipColor(pedido.tipo_atendimento_nome)}
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                        <Tooltip title={pedido.forma_pagamento_nome || 'Não informado'} arrow>
                          <Chip
                            label={pedido.forma_pagamento_nome || '-'}
                            size="small"
                            variant="outlined"
                            color="default"
                            icon={<AttachMoney />}
                            sx={{
                              maxWidth: '120px',
                              '& .MuiChip-label': {
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }
                            }}
                          />
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right" sx={{ display: { xs: 'none', xl: 'table-cell' } }}>
                        <Chip
                          label={`${pedido.total_itens || 0} itens`}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ fontWeight: 600, color: 'primary.main', fontSize: '1rem' }}>
                          {formatCurrency(pedido.total)}
                        </Box>
                      </TableCell>
                      <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                        <StatusBadge status={pedido.status || 'Não informado'} />
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                          <Box>
                            <Tooltip title="Visualizar">
                              <IconButton
                                size="small"
                                aria-label={'Abrir pedido #' + pedido.numero}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleVisualizarPedido(pedido);
                                }}
                                sx={{ color: 'primary.main' }}
                              >
                                <Visibility fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                          <Tooltip title="Mais ações">
                            <IconButton
                              size="small"
                              aria-label={'Mais ações do pedido #' + pedido.numero}
                              aria-haspopup="menu"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenMenu(e, pedido);
                              }}
                            >
                              <MoreVert fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
              labelRowsPerPage={isMobile ? "Por pág:" : "Linhas por página:"}
              labelDisplayedRows={({ from, to, count }) => isMobile ? `${from}-${to}/${count}` : `${from}-${to} de ${count}`}
              sx={{
                '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                },
                '.MuiTablePagination-select': {
                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                }
              }}
            />
          </>
        )}
      </Card>

      {/* Menu Dropdown de Ações */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleCloseMenu}
        PaperProps={{
          sx: {
            minWidth: 220,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          },
        }}
      >
        <MenuItem onClick={() => handleMenuAction(() => handleEditarPedido(pedidoSelecionado))} disabled={['CANCELADO','FINALIZADO'].includes(pedidoSelecionado?.status || '')}>
          <ListItemIcon>
            <Edit fontSize="small" color={pedidoSelecionado?.status === 'CANCELADO' ? 'disabled' : 'primary'} />
          </ListItemIcon>
          <ListItemText primary="Editar Pedido" />
        </MenuItem>

        <MenuItem onClick={() => handleMenuAction(() => setPrintDialog({ open: true, pedido: pedidoSelecionado }))}>
          <ListItemIcon>
            <Print fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Imprimir / PDF" />
        </MenuItem>

        <MenuItem onClick={() => handleMenuAction(() => handleDuplicarPedido(pedidoSelecionado))}>
          <ListItemIcon>
            <ContentCopy fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Duplicar Pedido" />
        </MenuItem>

        <Divider />

        {['PENDENTE','CONFIRMADO'].includes(pedidoSelecionado?.status) && (
          <>
            <MenuItem onClick={() => handleMenuAction(() => handleFinalizarPedido(pedidoSelecionado))}>
              <ListItemIcon>
                <CheckCircle fontSize="small" sx={{ color: 'success.main' }} />
              </ListItemIcon>
              <ListItemText primary="Finalizar Pedido" />
            </MenuItem>

            <MenuItem onClick={() => handleMenuAction(() => handleCancelarPedido(pedidoSelecionado))}>
              <ListItemIcon>
                <Cancel fontSize="small" sx={{ color: 'warning.main' }} />
              </ListItemIcon>
              <ListItemText primary="Cancelar Pedido" />
            </MenuItem>

            <Divider />
          </>
        )}

        {podeExcluir && <MenuItem onClick={() => handleMenuAction(() => handleExcluirPedido(pedidoSelecionado))} disabled={['CANCELADO','FINALIZADO'].includes(pedidoSelecionado?.status)}>
          <ListItemIcon>
            <Delete fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText
            primary="Excluir Pedido"
            primaryTypographyProps={{ sx: { color: 'error.main' } }}
          />
        </MenuItem>}
      </Menu>

      {/* Dialog de Detalhes do Pedido */}
      <Dialog
        open={dialogDetalhes}
        onClose={handleFecharDialogDetalhes}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        aria-labelledby="pedido-detalhes-titulo"
      >
        <DialogTitle id="pedido-detalhes-titulo" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Receipt color="primary" />
            <Typography component="span" sx={{ fontSize: 24, fontWeight: 700 }}>
              Pedido #{pedidoDetalhes?.numero}
            </Typography>
            {pedidoDetalhes && <StatusBadge status={pedidoDetalhes.status || 'Não informado'} />}
          </Box>
          <IconButton aria-label="Fechar detalhes do pedido" onClick={handleFecharDialogDetalhes}>
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          {erroDetalhes ? <Alert severity="error" action={<Button color="inherit" onClick={() => recarregarDetalhes()}>Tentar novamente</Button>}>Não foi possível carregar os detalhes do pedido.</Alert> : loadingDetalhes ? (
            <Box sx={{ pt: 2 }}>
              <LoadingSkeleton type="form" rows={3} />
              <Box sx={{ mt: 3 }}>
                <LoadingSkeleton type="table" rows={2} />
              </Box>
            </Box>
          ) : pedidoCompleto ? (
            <Box sx={{ pt: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{formatDate(pedidoCompleto.data)}</Typography>
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

              {/* Itens do Pedido */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>Itens do Pedido</Typography>
                <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Produto</TableCell>
                        <TableCell align="center">Qtd.</TableCell>
                        <TableCell align="right">Valor Unit.</TableCell>
                        <TableCell align="right">Desconto</TableCell>
                        <TableCell align="right">Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pedidoCompleto.itens?.map((item: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight={600}>
                                {item.produto_nome}
                              </Typography>
                              {item.produto_codigo && (
                                <Typography variant="caption" color="text.secondary">
                                  Cód: {item.produto_codigo}
                                </Typography>
                              )}
                              {item.cor_descricao && (
                                <Chip
                                  label={item.cor_descricao}
                                  size="small"
                                  variant="outlined"
                                  sx={{ ml: 1, height: 20 }}
                                />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell align="center">{item.quantidade ?? 0}</TableCell>
                          <TableCell align="right">{formatCurrency(item.valor_unitario ?? 0)}</TableCell>
                          <TableCell align="right">
                            {(item.desconto_valor ?? 0) > 0 ? formatCurrency(item.desconto_valor ?? 0) : '-'}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                            {formatCurrency(item.valor_total ?? 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              {/* Totais */}
              <Box sx={{ mt: 3, p: 2, ml: 'auto', width: { xs: '100%', sm: 320 }, bgcolor: 'background.default', borderRadius: '12px' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Subtotal:</Typography>
                  <Typography fontWeight="bold">{formatCurrency(pedidoCompleto.subtotal || 0)}</Typography>
                </Box>
                {(pedidoCompleto.desconto_valor ?? 0) > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography color="error">Desconto:</Typography>
                    <Typography color="error" fontWeight="bold">
                      - {formatCurrency(pedidoCompleto.desconto_valor ?? 0)}
                    </Typography>
                  </Box>
                )}
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6" fontWeight="bold">Total:</Typography>
                  <Typography sx={{ fontSize: 24, fontWeight: 700 }} color="primary">
                    {formatCurrency(pedidoCompleto.total ?? 0)}
                  </Typography>
                </Box>
              </Box>

              {/* Observações */}
              {pedidoCompleto.observacao && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Observações
                  </Typography>
                  <Typography>{pedidoCompleto.observacao}</Typography>
                </Box>
              )}
            </Box>
          ) : (
            <Alert severity="error">Erro ao carregar detalhes do pedido</Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2.5, borderTop: '1px solid', borderColor: 'divider', gap: 1, flexWrap: 'wrap' }}>
          <Button onClick={handleFecharDialogDetalhes} sx={{ mr: 'auto' }}>Fechar</Button>
          <Button aria-haspopup="menu" startIcon={<MoreVert />} disabled={!pedidoCompleto || !!erroDetalhes} onClick={e => handleOpenMenu(e, pedidoCompleto || pedidoDetalhes)}>Mais ações</Button>
          <Button variant="outlined" startIcon={<Print />} disabled={!pedidoCompleto || !!erroDetalhes} onClick={() => { setPrintDialog({ open: true, pedido: pedidoCompleto || pedidoDetalhes }); handleFecharDialogDetalhes(); }}>Imprimir</Button>
          {pedidoCompleto && !['CANCELADO', 'FINALIZADO'].includes(pedidoCompleto.status || '') && <Button variant="outlined" startIcon={<Edit />} onClick={() => { handleEditarPedido(pedidoCompleto); handleFecharDialogDetalhes(); }}>Editar</Button>}
          {pedidoCompleto && ['PENDENTE', 'CONFIRMADO'].includes(pedidoCompleto.status || '') && <Button variant="contained" startIcon={<CheckCircle />} disabled={finalizarMutation.isPending} onClick={() => { void handleFinalizarPedido(pedidoCompleto); handleFecharDialogDetalhes(); }}>Finalizar pedido</Button>}
        </DialogActions>
      </Dialog>

      {/* Dialog de Edição de Pedido */}      {/* Dialog de Edição de Pedido */}
      <Dialog
        open={dialogEditar}
        onClose={() => setDialogEditar(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Edit color="primary" />
            <Typography variant="h6" fontWeight="bold">
              Editar Pedido
            </Typography>
          </Box>
          <IconButton aria-label="Fechar edição do pedido" onClick={() => setDialogEditar(false)}>
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          {pedidoEditando && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                {/* Tipo de Atendimento */}
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel id="pedidos-select-4">Tipo de Atendimento</InputLabel>
                    <Select labelId="pedidos-select-4"
                      value={pedidoEditando.tipo_atendimento_id || ''}
                      label="Tipo de Atendimento"
                      onChange={(e) => setPedidoEditando({
                        ...pedidoEditando,
                        tipo_atendimento_id: e.target.value
                      })}
                    >
                      <MenuItem value="">Nenhum</MenuItem>
                      {tiposAtendimento?.map((tipo) => (
                        <MenuItem key={tipo.id} value={tipo.id}>
                          {tipo.nome}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Forma de Pagamento */}
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel id="pedidos-select-5">Forma de Pagamento</InputLabel>
                    <Select labelId="pedidos-select-5"
                      value={pedidoEditando.forma_pagamento_id || ''}
                      label="Forma de Pagamento"
                      onChange={(e) => setPedidoEditando({
                        ...pedidoEditando,
                        forma_pagamento_id: e.target.value
                      })}
                    >
                      <MenuItem value="">Nenhuma</MenuItem>
                      {formasPagamento?.map((forma) => (
                        <MenuItem key={forma.id} value={forma.id}>
                          {forma.nome}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Desconto */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Desconto (R$)"
                    type="number"
                    value={pedidoEditando.desconto_valor}
                    onChange={(e) => setPedidoEditando({
                      ...pedidoEditando,
                      desconto_valor: parseFloat(e.target.value) || 0
                    })}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <AttachMoney />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                {/* Status */}
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel id="pedidos-select-6">Status</InputLabel>
                    <Select labelId="pedidos-select-6"
                      value={pedidoEditando.status || 'PENDENTE'}
                      label="Status"
                      onChange={(e) => setPedidoEditando({
                        ...pedidoEditando,
                        status: e.target.value
                      })}
                    >
                      <MenuItem value="PENDENTE">Pendente</MenuItem>
                      <MenuItem value="CONFIRMADO">Confirmado</MenuItem>


                    </Select>
                  </FormControl>
                </Grid>

                {/* Observações */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Observações"
                    value={pedidoEditando.observacao}
                    onChange={(e) => setPedidoEditando({
                      ...pedidoEditando,
                      observacao: e.target.value
                    })}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Notes />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>

              <Alert severity="info" sx={{ mt: 2 }}>
                Para editar itens do pedido, use a página de PDV ou crie um novo pedido.
              </Alert>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => setDialogEditar(false)}
            variant="outlined"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSalvarEdicao}
            variant="contained"
            disabled={atualizarMutation.isPending}
            startIcon={atualizarMutation.isPending ? <CircularProgress size={20} /> : <Check />}
          >
            {atualizarMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Exportação Profissional */}
      <Dialog
        open={dialogExportar}
        onClose={() => { if (!exportando) setDialogExportar(false); }}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Box display="flex" alignItems="center" gap={1}>
            <FileDownload />
            Exportar Pedidos
          </Box>
          {isMobile && (
            <IconButton
              aria-label="Fechar exportação" disabled={exportando} onClick={() => setDialogExportar(false)}
              sx={{ color: 'white' }}
            >
              <Close />
            </IconButton>
          )}
        </DialogTitle>

        <DialogContent sx={{ mt: 2 }}>
          <TextField select fullWidth label="Pedidos a exportar" value={escopoExportacao} disabled={exportando} onChange={e => setEscopoExportacao(e.target.value as 'pagina' | 'todos')} sx={{ mb: 2 }}>
            <MenuItem value="pagina">Página atual ({pedidos.length})</MenuItem>
            <MenuItem value="todos">Todos os filtrados ({data?.total ?? 0})</MenuItem>
          </TextField>
          {exportando && <Alert role="status" aria-live="polite" sx={{ mb: 2 }}>{progressoExportacao}</Alert>}
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Selecione as colunas que deseja exportar:
          </Typography>

          <Box sx={{
            mb: 2,
            p: 2,
            bgcolor: 'grey.50',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'grey.200',
          }}>
            <Box display="flex" gap={1} mb={1.5}>
              <Button
                size="small"
                variant="outlined"
                onClick={selecionarTodasColunas}
                sx={{ flex: 1, fontSize: '0.75rem' }}
              >
                Selecionar Todas
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={desmarcarTodasColunas}
                sx={{ flex: 1, fontSize: '0.75rem' }}
              >
                Desmarcar Todas
              </Button>
            </Box>

            <Box display="flex" flexDirection="column" gap={0.5}>
              {colunasExportacao.map((coluna) => (
                <Box
                  key={coluna.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: 1,
                    borderRadius: 1,
                    bgcolor: coluna.selecionada ? 'action.selected' : 'white',
                    border: '1px solid',
                    borderColor: coluna.selecionada ? 'primary.light' : 'grey.200',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: coluna.selecionada ? 'action.hover' : 'grey.100',
                      transform: 'translateX(4px)',
                    },
                  }}

                >
                  <FormControlLabel label={coluna.label} control={<Checkbox checked={coluna.selecionada} disabled={exportando} onChange={() => toggleColuna(coluna.id)} size="small" />} />
                </Box>
              ))}
            </Box>
          </Box>

          {/* Resumo */}
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>{escopoExportacao === 'todos' ? data?.total ?? 0 : pedidos.length}</strong> pedidos serão exportados com{' '}
              <strong>{colunasExportacao.filter(c => c.selecionada).length}</strong> colunas.
            </Typography>
          </Alert>

          {/* Filtros aplicados */}
          {temFiltrosAtivos && (
            <Alert severity="warning" icon={<FilterList />} sx={{ mb: 0 }}>
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                Filtros Ativos:
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={0.5}>
                {status && <Chip label={`Status: ${status}`} size="small" />}
                {tipoAtendimento && <Chip label={`Tipo: ${tipoAtendimento}`} size="small" />}
                {formaPagamento && (
                  <Chip
                    label={`Pagamento: ${formasPagamento?.find((f) => f.id === formaPagamento)?.nome || formaPagamento}`}
                    size="small"
                  />
                )}
                {clienteSelecionado && <Chip label={`Cliente: ${nomeClienteFiltro}`} size="small" />}
                {(dataInicio || dataFim) && (
                  <Chip
                    label={`Período: ${dataInicio ? formatDate(dataInicio) : '...'} - ${dataFim ? formatDate(dataFim) : '...'}`}
                    size="small"
                  />
                )}
              </Box>
            </Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            disabled={exportando} onClick={() => setDialogExportar(false)}
            variant="outlined"
            color="inherit"
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            startIcon={<TableChart />}
            onClick={() => exportar('excel')}
            disabled={search !== buscaDebounced || atualizandoLista || exportando || !!erroLista || !data || !data.total || colunasExportacao.filter(c => c.selecionada).length === 0}

          >
            Excel
          </Button>
          <Button
            variant="contained"
            startIcon={<PictureAsPdf />}
            onClick={() => exportar('pdf')}
            disabled={search !== buscaDebounced || atualizandoLista || exportando || !!erroLista || !data || !data.total || colunasExportacao.filter(c => c.selecionada).length === 0}

          >
            PDF
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Confirmação Personalizado */}
      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
        loading={cancelarMutation.isPending || finalizarMutation.isPending || duplicarMutation.isPending || deletarMutation.isPending}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        severity={confirmDialog.severity}
        confirmText="Confirmar"
        cancelText="Cancelar"
      />

      {/* Dialog de Impressão */}
      <PrintConfirmDialog
        open={printDialog.open}
        onClose={() => setPrintDialog({ open: false, pedido: null })}
        onPrint={async () => {
          if (printDialog.pedido) {
            toast.success(`Abrindo janela de impressão...`);
            await handleImprimirPedido(printDialog.pedido, 'print');
          }
          setPrintDialog({ open: false, pedido: null });
        }}
        onDownload={async () => {
          if (printDialog.pedido) {
            toast.success(`Gerando PDF para download...`);
            await handleImprimirPedido(printDialog.pedido, 'download');
          }
          setPrintDialog({ open: false, pedido: null });
        }}
        title="Imprimir Pedido"
        subtitle={printDialog.pedido ? `Pedido #${printDialog.pedido.numero}` : ''}
      />
    </AppLayout>
  );
}

export default function PedidosPage() {
  return (
    <Suspense fallback={
      <AppLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
          <CircularProgress />
        </Box>
      </AppLayout>
    }>
      <PedidosPageContent />
    </Suspense>
  );
}
