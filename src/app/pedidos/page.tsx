'use client';

import { useState, useEffect, Suspense } from 'react';
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useMediaQuery,
  useTheme,
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
  CalendarToday,
  Person,
  Edit,
  Close,
  Download,
  AttachMoney,
  Notes,
  Check,
  Delete,
  TrendingUp,
  Schedule,
  ShoppingBag,
  Timer,
  MoreVert,
  ExpandMore,
} from '@mui/icons-material';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import PrintConfirmDialog from '@/components/common/PrintConfirmDialog';
import { trpc } from '@/lib/trpc/client';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { gerarPedidoPDF } from '@/lib/pdf/pedido-pdf';
import { useQueryClient } from '@tanstack/react-query';

function PedidosPageContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [page, setPage] = useState(0);
  const [filtrosExpanded, setFiltrosExpanded] = useState(!isMobile);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [tipoAtendimento, setTipoAtendimento] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);
  const [pedidoDetalhes, setPedidoDetalhes] = useState<any>(null);
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
  }>({ open: false, title: '', message: '', onConfirm: () => {}, severity: 'warning' });
  const [printDialog, setPrintDialog] = useState<{
    open: boolean;
    pedido: any;
  }>({ open: false, pedido: null });
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<any>(null);

  const searchParams = useSearchParams();
  const pedidoIdUrl = searchParams?.get('id');

  const { data, isLoading } = trpc.pedidos.list.useQuery({
    limit: rowsPerPage,
    offset: page * rowsPerPage,
    status: status as any,
    dataInicio: dataInicio || undefined,
    dataFim: dataFim || undefined,
    tipoAtendimento: tipoAtendimento || undefined,
    clienteId: clienteSelecionado?.id,
  });

  // Query para total geral de vendas (sem filtros) - usar limite alto
  const { data: dadosGerais } = trpc.pedidos.list.useQuery(
    {
      limit: 10000,
      offset: 0,
    },
    {
      staleTime: 5 * 60 * 1000, // Cache de 5 minutos
    }
  );
  
  // Query para buscar pedido específico da URL
  const { data: pedidoUrl, isLoading: loadingPedidoUrl } = trpc.pedidos.getById.useQuery(
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
    limit: 100,
    offset: 0,
    search: searchCliente || undefined,
  });
  
  const { data: pedidoCompleto, isLoading: loadingDetalhes } = trpc.pedidos.getById.useQuery(
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
  const { data: configuracoes } = trpc.configuracoes.get.useQuery();

  const pedidos = data?.pedidos || [];
  const total = data?.total || 0;
  const pedidosGerais = dadosGerais?.pedidos || [];
  const totalGeral = dadosGerais?.total || 0;

  type Pedido = typeof pedidos[number];

  // Calcular estatísticas usando os dados corretos
  const estatisticas = {
    totalPedidos: total, // Total de pedidos filtrados
    pedidosPendentes: pedidos.filter((p: any) => p.status === 'PENDENTE').length,
    // Total de vendas: soma de TODOS os pedidos (dados gerais)
    totalVendas: pedidosGerais.length > 0 
      ? pedidosGerais.reduce((acc: number, p: any) => acc + (p.total || 0), 0)
      : pedidos.reduce((acc: number, p: any) => acc + (p.total || 0), 0), // Fallback para filtrados
    // Pedidos finalizados hoje de TODOS os pedidos
    finalizadosHoje: (pedidosGerais.length > 0 ? pedidosGerais : pedidos).filter((p: any) => {
      if (!p.data) return false;
      const hoje = new Date().toISOString().split('T')[0];
      const dataPedido = p.data.split('T')[0];
      return dataPedido === hoje && p.status === 'FINALIZADO';
    }).length,
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
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

  const getStatusChip = (status: string | null) => {
    const statusConfig = {
      PENDENTE: { label: 'Pendente', color: 'warning' as const },
      CONFIRMADO: { label: 'Confirmado', color: 'info' as const },
      FINALIZADO: { label: 'Finalizado', color: 'success' as const },
      CANCELADO: { label: 'Cancelado', color: 'error' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      label: status || 'Desconhecido',
      color: 'default' as const,
    };

    return <Chip label={config.label} color={config.color} size="small" sx={{ fontWeight: 600 }} />;
  };

  // Função para atualizar a lista de pedidos sem reload
  const atualizarListaPedidos = async () => {
    await utils.pedidos.list.invalidate();
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
  
  const handleImprimirPedido = async (pedido: any, acao: 'print' | 'download' = 'print') => {
    // Montar endereço completo do cliente
    const enderecoCompleto = pedido.endereco ? [
      pedido.endereco.logradouro,
      pedido.endereco.numero,
      pedido.endereco.complemento,
      pedido.endereco.bairro,
      pedido.endereco.cidade,
      pedido.endereco.estado,
      pedido.endereco.cep ? `CEP: ${pedido.endereco.cep}` : '',
    ].filter(Boolean).join(', ') : '';

    const dadosPedido = {
      numero: pedido.numero,
      data: pedido.data,
      cliente_nome: pedido.cliente?.nome,
      cliente_telefone: pedido.telefone_contato || pedido.cliente?.telefone,
      endereco: enderecoCompleto,
      tipo_atendimento: pedido.tipo_atendimento?.nome,
      forma_pagamento: pedido.forma_pagamento?.nome,
      observacoes: pedido.observacoes,
      itens: pedido.itens || [],
      subtotal: pedido.subtotal || 0,
      desconto_valor: pedido.desconto_valor || 0,
      total: pedido.total || 0,
    };
    
    // Montar endereço completo da empresa
    const enderecoEmpresa = [
      (configuracoes as any)?.logradouro,
      (configuracoes as any)?.numero,
      (configuracoes as any)?.bairro,
      (configuracoes as any)?.cidade,
      (configuracoes as any)?.estado,
      (configuracoes as any)?.cep ? `CEP: ${(configuracoes as any)?.cep}` : '',
    ].filter(Boolean).join(', ');

    const dadosEmpresa = {
      nome_empresa: (configuracoes as any)?.nome_empresa,
      razao_social: (configuracoes as any)?.razao_social,
      cnpj: (configuracoes as any)?.cnpj,
      telefone: (configuracoes as any)?.telefone,
      endereco: enderecoEmpresa || (configuracoes as any)?.endereco,
      logo_url: (configuracoes as any)?.logo_url,
      instagram: (configuracoes as any)?.instagram,
      site: (configuracoes as any)?.site,
    };
    
    await gerarPedidoPDF(dadosPedido, dadosEmpresa, acao);
  };
  
  const handleVisualizarPedido = (pedido: any) => {
    setPedidoDetalhes(pedido);
    setDialogDetalhes(true);
  };
  
  const handleEditarPedido = (pedido: any) => {
    // Redirecionar para PDV com o ID do pedido para edição
    router.push(`/pdv?edit=${pedido.id}`);
  };
  
  const handleSalvarEdicao = async () => {
    if (!pedidoEditando) return;
    
    const toastId = toast.loading('Salvando alterações...');
    
    try {
      await atualizarMutation.mutateAsync({
        id: pedidoEditando.id,
        cliente_id: pedidoEditando.cliente_id || undefined,
        endereco_id: pedidoEditando.endereco_id || undefined,
        tipo_atendimento_id: pedidoEditando.tipo_atendimento_id || undefined,
        forma_pagamento_id: pedidoEditando.forma_pagamento_id || undefined,
        desconto_valor: pedidoEditando.desconto_valor,
        observacao: pedidoEditando.observacao,
        status: pedidoEditando.status,
      });
      
      toast.success('Pedido atualizado com sucesso!', { id: toastId });
      setDialogEditar(false);
      setPedidoEditando(null);
      
      // Atualizar lista sem reload
      await atualizarListaPedidos();
    } catch (error) {
      toast.error('Erro ao atualizar pedido. Tente novamente.', { id: toastId });
    }
  };
  
  const handleCancelarPedido = async (pedido: any) => {
    setConfirmDialog({
      open: true,
      title: 'Cancelar Pedido',
      message: `Deseja realmente cancelar o pedido #${pedido.numero}?\n\nO pedido ficará com status CANCELADO.`,
      severity: 'warning',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, open: false });
        const toastId = toast.loading('Cancelando pedido...');
        
        try {
          await cancelarMutation.mutateAsync({ id: pedido.id });
          toast.success(`Pedido #${pedido.numero} cancelado com sucesso!`, { id: toastId });
          await atualizarListaPedidos();
        } catch (error) {
          toast.error('Erro ao cancelar pedido. Tente novamente.', { id: toastId });
        }
      },
    });
  };
  
  const handleFinalizarPedido = async (pedido: any) => {
    setConfirmDialog({
      open: true,
      title: 'Finalizar Pedido',
      message: `Deseja finalizar o pedido #${pedido.numero}?\n\nO pedido ficará com status FINALIZADO.`,
      severity: 'success',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, open: false });
        const toastId = toast.loading('Finalizando pedido...');
        
        try {
          await finalizarMutation.mutateAsync({ id: pedido.id });
          toast.success(`Pedido #${pedido.numero} finalizado com sucesso!`, { id: toastId });
          await atualizarListaPedidos();
        } catch (error) {
          toast.error('Erro ao finalizar pedido. Tente novamente.', { id: toastId });
        }
      },
    });
  };
  
  const handleDuplicarPedido = async (pedido: any) => {
    setConfirmDialog({
      open: true,
      title: 'Duplicar Pedido',
      message: `Deseja duplicar o pedido #${pedido.numero}?\n\nUma cópia do pedido será criada com todos os itens.`,
      severity: 'info',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, open: false });
        const toastId = toast.loading('Duplicando pedido...');
        
        try {
          await duplicarMutation.mutateAsync({ id: pedido.id });
          toast.success('Pedido duplicado com sucesso!', { id: toastId });
          await atualizarListaPedidos();
        } catch (error) {
          toast.error('Erro ao duplicar pedido. Tente novamente.', { id: toastId });
        }
      },
    });
  };
  
  const handleExcluirPedido = async (pedido: any) => {
    setConfirmDialog({
      open: true,
      title: 'Excluir Pedido Permanentemente',
      message: `⚠️ ATENÇÃO: Deseja realmente EXCLUIR o pedido #${pedido.numero}?\n\n✗ Esta ação NÃO pode ser desfeita!\n✗ Todos os itens do pedido também serão excluídos.\n✗ Não será possível recuperar os dados.`,
      severity: 'error',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, open: false });
        const toastId = toast.loading('Excluindo pedido...');
        
        try {
          await deletarMutation.mutateAsync({ id: pedido.id });
          toast.success(`Pedido #${pedido.numero} excluído com sucesso!`, { id: toastId });
          await atualizarListaPedidos();
        } catch (error) {
          toast.error('Erro ao excluir pedido. Tente novamente.', { id: toastId });
        }
      },
    });
  };
  
  const limparFiltros = () => {
    setStatus('');
    setSearch('');
    setDataInicio('');
    setDataFim('');
    setTipoAtendimento('');
    setClienteSelecionado(null);
    setPage(0);
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, pedido: any) => {
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
      <PageHeader
        title="Pedidos"
        subtitle={`${total} pedidos registrados`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Pedidos' },
        ]}
      />

      {/* Cards de Estatísticas */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0 }}
          >
            <Card
              sx={{
                p: { xs: 2, sm: 3 },
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1.5, sm: 2 },
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: -50,
                  right: -50,
                  width: 150,
                  height: 150,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)',
                },
              }}
            >
              <Box
                sx={{
                  p: { xs: 1.5, sm: 2 },
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Receipt sx={{ fontSize: { xs: 28, sm: 32 } }} />
              </Box>
              <Box sx={{ flex: 1, zIndex: 1 }}>
                <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
                  {estatisticas.totalPedidos}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Total de Pedidos
                </Typography>
              </Box>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={6} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card
              sx={{
                p: { xs: 2, sm: 3 },
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1.5, sm: 2 },
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: -50,
                  right: -50,
                  width: 150,
                  height: 150,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)',
                },
              }}
            >
              <Box
                sx={{
                  p: { xs: 1.5, sm: 2 },
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShoppingBag sx={{ fontSize: { xs: 28, sm: 32 } }} />
              </Box>
              <Box sx={{ flex: 1, zIndex: 1 }}>
                <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
                  {estatisticas.totalPedidos}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Total de Pedidos
                </Typography>
              </Box>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={6} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card
              sx={{
                p: { xs: 2, sm: 3 },
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1.5, sm: 2 },
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: -50,
                  right: -50,
                  width: 150,
                  height: 150,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)',
                },
              }}
            >
              <Box
                sx={{
                  p: { xs: 1.5, sm: 2 },
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <TrendingUp sx={{ fontSize: { xs: 28, sm: 32 } }} />
              </Box>
              <Box sx={{ flex: 1, zIndex: 1 }}>
                <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
                  {formatCurrency(estatisticas.totalVendas)}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Total em Vendas
                </Typography>
              </Box>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={6} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <Card
              sx={{
                p: { xs: 2, sm: 3 },
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1.5, sm: 2 },
                background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: -50,
                  right: -50,
                  width: 150,
                  height: 150,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)',
                },
              }}
            >
              <Box
                sx={{
                  p: { xs: 1.5, sm: 2 },
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle sx={{ fontSize: { xs: 28, sm: 32 } }} />
              </Box>
              <Box sx={{ flex: 1, zIndex: 1 }}>
                <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
                  {estatisticas.finalizadosHoje}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Finalizados Hoje
                </Typography>
              </Box>
            </Card>
          </motion.div>
        </Grid>
      </Grid>

      <Card sx={{ overflow: 'hidden', maxWidth: '100%' }}>
        {/* Filtros Avançados */}
        <Accordion 
          expanded={filtrosExpanded} 
          onChange={() => setFiltrosExpanded(!filtrosExpanded)}
          sx={{ 
            boxShadow: 'none',
            '&:before': { display: 'none' },
            borderBottom: '1px solid',
            borderColor: 'divider'
          }}
        >
          <AccordionSummary 
            expandIcon={<ExpandMore />}
            sx={{ 
              px: 3,
              '& .MuiAccordionSummary-content': { 
                alignItems: 'center',
                gap: 1,
                my: 2
              }
            }}
          >
            <FilterList color="primary" />
            <Typography variant="h6" fontWeight="bold">Filtros</Typography>
            {!filtrosExpanded && (
              <Box sx={{ ml: 2, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {(search || status || tipoAtendimento || dataInicio || dataFim || clienteSelecionado) && (
                  <>
                    {search && <Chip label={`Busca: ${search}`} size="small" />}
                    {status && <Chip label={`Status: ${status}`} size="small" color="primary" />}
                    {tipoAtendimento && <Chip label={`Tipo: ${tipoAtendimento}`} size="small" color="secondary" />}
                    {clienteSelecionado && <Chip label={`Cliente: ${clienteSelecionado.nome}`} size="small" color="success" />}
                    {(dataInicio || dataFim) && <Chip label="Período" size="small" color="info" />}
                  </>
                )}
              </Box>
            )}
            <Button size="small" onClick={(e) => { e.stopPropagation(); limparFiltros(); }} sx={{ ml: 'auto' }}>
              Limpar Filtros
            </Button>
          </AccordionSummary>
          
          <AccordionDetails sx={{ px: 3, pb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Buscar pedido"
                placeholder="Número, cliente..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
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
            
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={status}
                  label="Status"
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(0);
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
            
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={tipoAtendimento}
                  label="Tipo"
                  onChange={(e) => {
                    setTipoAtendimento(e.target.value);
                    setPage(0);
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
              <TextField
                fullWidth
                type="date"
                label="Data Início"
                value={dataInicio}
                onChange={(e) => {
                  setDataInicio(e.target.value);
                  setPage(0);
                }}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarToday fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                type="date"
                label="Data Fim"
                value={dataFim}
                onChange={(e) => {
                  setDataFim(e.target.value);
                  setPage(0);
                }}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Autocomplete
                options={clientes?.clientes || []}
                getOptionLabel={(option) => option.nome || ''}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                value={clienteSelecionado}
                onChange={(_, newValue) => {
                  setClienteSelecionado(newValue);
                  setPage(0);
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
        </Accordion>

        {/* Loading do pedido da URL */}
        {loadingPedidoUrl && pedidoIdUrl && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4, gap: 2 }}>
            <CircularProgress size={24} />
            <Typography>Carregando pedido #{pedidoIdUrl.substring(0, 8)}...</Typography>
          </Box>
        )}

        {/* Tabela */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
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
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Número</TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Data</TableCell>
                    <TableCell>Cliente</TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Tipo</TableCell>
                    <TableCell align="right" sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Itens</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="right">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pedidos.map((pedido: any, index) => (
                    <TableRow
                      key={pedido.id}
                      component={motion.tr}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      hover
                      onClick={() => handleVisualizarPedido(pedido)}
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: 'action.hover',
                        }
                      }}
                    >
                      <TableCell>
                        <Chip
                          label={`#${pedido.numero}`}
                          size="small"
                          variant="outlined"
                          color="primary"
                          sx={{ fontFamily: 'monospace', fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{formatDate(pedido.data)}</TableCell>
                      <TableCell>
                        <Box>
                          <Box sx={{ fontWeight: 600 }}>{pedido.cliente_nome || 'Cliente não informado'}</Box>
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
                          variant="filled"
                          sx={{ 
                            fontWeight: 600,
                            color: 'white',
                          }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
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
                      <TableCell align="center">{getStatusChip(pedido.status)}</TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                            <Tooltip title="Visualizar">
                              <IconButton
                                size="small"
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
        <MenuItem onClick={() => handleMenuAction(() => handleEditarPedido(pedidoSelecionado))} disabled={pedidoSelecionado?.status === 'CANCELADO'}>
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

        {pedidoSelecionado?.status === 'PENDENTE' && (
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

        <MenuItem onClick={() => handleMenuAction(() => handleExcluirPedido(pedidoSelecionado))}>
          <ListItemIcon>
            <Delete fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText 
            primary="Excluir Pedido" 
            primaryTypographyProps={{ sx: { color: 'error.main' } }}
          />
        </MenuItem>
      </Menu>
      
      {/* Dialog de Detalhes do Pedido */}
      <Dialog 
        open={dialogDetalhes} 
        onClose={handleFecharDialogDetalhes} 
        maxWidth="md" 
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Receipt color="primary" />
            <Typography variant="h6" fontWeight="bold">
              Pedido #{pedidoDetalhes?.numero}
            </Typography>
            {pedidoDetalhes && getStatusChip(pedidoDetalhes.status)}
          </Box>
          <IconButton onClick={handleFecharDialogDetalhes}>
            <Close />
          </IconButton>
        </DialogTitle>
        
        <DialogContent>
          {loadingDetalhes ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : pedidoCompleto ? (
            <Box sx={{ pt: 2 }}>
              {/* Informações Gerais */}
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Informações do Pedido
                    </Typography>
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">Data:</Typography>
                      <Typography fontWeight="bold">{formatDate(pedidoCompleto.data)}</Typography>
                    </Box>
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">Tipo de Atendimento:</Typography>
                      <Typography fontWeight="bold">{pedidoCompleto.tipo_atendimento_nome || '-'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Forma de Pagamento:</Typography>
                      <Typography fontWeight="bold">{pedidoCompleto.forma_pagamento_nome || '-'}</Typography>
                    </Box>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Cliente
                    </Typography>
                    <Box sx={{ mb: 1 }}>
                      <Typography fontWeight="bold">
                        {pedidoCompleto.cliente_nome || 'Não informado'}
                      </Typography>
                    </Box>
                    {pedidoCompleto.cliente_telefone && (
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">Telefone:</Typography>
                        <Typography>{pedidoCompleto.cliente_telefone}</Typography>
                      </Box>
                    )}
                    {pedidoCompleto.endereco_logradouro && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">Endereço:</Typography>
                        <Typography>{pedidoCompleto.endereco_logradouro}</Typography>
                      </Box>
                    )}
                  </Card>
                </Grid>
              </Grid>
              
              {/* Itens do Pedido */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>Itens do Pedido</Typography>
                <TableContainer component={Card} variant="outlined">
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
              <Card variant="outlined" sx={{ mt: 3, p: 2 }}>
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
                  <Typography variant="h6" fontWeight="bold" color="primary">
                    {formatCurrency(pedidoCompleto.total ?? 0)}
                  </Typography>
                </Box>
              </Card>
              
              {/* Observações */}
              {pedidoCompleto.observacao && (
                <Card variant="outlined" sx={{ mt: 2, p: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Observações
                  </Typography>
                  <Typography>{pedidoCompleto.observacao}</Typography>
                </Card>
              )}
            </Box>
          ) : (
            <Alert severity="error">Erro ao carregar detalhes do pedido</Alert>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 3, justifyContent: 'space-between' }}>
          <Button onClick={handleFecharDialogDetalhes} variant="outlined">
            Fechar
          </Button>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              onClick={() => {
                setPrintDialog({ open: true, pedido: pedidoCompleto || pedidoDetalhes });
                handleFecharDialogDetalhes();
              }} 
              variant="outlined"
              color="primary"
              startIcon={<Print />}
            >
              Imprimir
            </Button>
            
            {pedidoDetalhes?.status !== 'CANCELADO' && (
              <Button 
                onClick={() => {
                  handleEditarPedido(pedidoDetalhes);
                  handleFecharDialogDetalhes();
                }} 
                variant="outlined"
                startIcon={<Edit />}
              >
                Editar
              </Button>
            )}
            
            {pedidoDetalhes?.status === 'PENDENTE' && (
              <>
                <Button 
                  onClick={() => {
                    handleFinalizarPedido(pedidoDetalhes);
                    handleFecharDialogDetalhes();
                  }} 
                  variant="contained" 
                  color="success"
                  startIcon={<CheckCircle />}
                >
                  Finalizar
                </Button>
                <Button 
                  onClick={() => {
                    handleCancelarPedido(pedidoDetalhes);
                    handleFecharDialogDetalhes();
                  }} 
                  variant="outlined" 
                  color="error"
                  startIcon={<Cancel />}
                >
                  Cancelar
                </Button>
              </>
            )}
            
            <Button 
              onClick={() => {
                handleExcluirPedido(pedidoDetalhes);
                handleFecharDialogDetalhes();
              }} 
              variant="outlined" 
              color="error"
              startIcon={<Delete />}
            >
              Excluir
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
      
      {/* Dialog de Edição de Pedido */}
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
          <IconButton onClick={() => setDialogEditar(false)}>
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
                    <InputLabel>Tipo de Atendimento</InputLabel>
                    <Select
                      value={pedidoEditando.tipo_atendimento_id || ''}
                      label="Tipo de Atendimento"
                      onChange={(e) => setPedidoEditando({ 
                        ...pedidoEditando, 
                        tipo_atendimento_id: e.target.value 
                      })}
                    >
                      <MenuItem value="">Nenhum</MenuItem>
                      {(tiposAtendimento as any)?.map((tipo: any) => (
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
                    <InputLabel>Forma de Pagamento</InputLabel>
                    <Select
                      value={pedidoEditando.forma_pagamento_id || ''}
                      label="Forma de Pagamento"
                      onChange={(e) => setPedidoEditando({ 
                        ...pedidoEditando, 
                        forma_pagamento_id: e.target.value 
                      })}
                    >
                      <MenuItem value="">Nenhuma</MenuItem>
                      {(formasPagamento as any)?.map((forma: any) => (
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
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={pedidoEditando.status || 'PENDENTE'}
                      label="Status"
                      onChange={(e) => setPedidoEditando({ 
                        ...pedidoEditando, 
                        status: e.target.value 
                      })}
                    >
                      <MenuItem value="PENDENTE">Pendente</MenuItem>
                      <MenuItem value="CONFIRMADO">Confirmado</MenuItem>
                      <MenuItem value="FINALIZADO">Finalizado</MenuItem>
                      <MenuItem value="CANCELADO">Cancelado</MenuItem>
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
      
      {/* Dialog de Confirmação Personalizado */}
      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
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
