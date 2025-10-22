'use client';

import { useState } from 'react';
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
} from '@mui/material';
import {
  Search,
  Visibility,
  Print,
  ContentCopy,
  Cancel,
  CheckCircle,
  FilterList,
  CalendarToday,
  Person,
  Edit,
  Close,
  Delete,
  AttachMoney,
  Notes,
  Check,
  CallMade,
  TrendingUp,
  Receipt,
} from '@mui/icons-material';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import PrintConfirmDialog from '@/components/common/PrintConfirmDialog';
import { trpc } from '@/lib/trpc/client';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { dateToString } from '@/lib/utils/dateUtils';

export default function SaidasPage() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
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
  const [dialogNovaSaida, setDialogNovaSaida] = useState(false);
  const [novaSaida, setNovaSaida] = useState({
    cliente_id: '',
    destinatario_nome: '',
    forma_pagamento_id: '',
    valor: 0,
    data: dateToString(new Date()),
    observacao: '',
  });

  // Query apenas para SAÍDAS
  const { data, isLoading } = trpc.pedidos.list.useQuery({
    limit: rowsPerPage,
    offset: page * rowsPerPage,
    status: status as any,
    dataInicio: dataInicio || undefined,
    dataFim: dataFim || undefined,
    tipoAtendimento: 'SAIDA', // FILTRO FIXO PARA SAÍDAS
    clienteId: clienteSelecionado?.id,
  });
  
  // Query de estatísticas - busca com limit menor mas sem outros filtros
  const { data: estatisticasTotais } = trpc.pedidos.list.useQuery({
    limit: 1000,
    offset: 0,
    tipoAtendimento: 'SAIDA',
  });
  
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
  const criarClienteMutation = trpc.clientes.create.useMutation();
  const criarPedidoMutation = trpc.pedidos.create.useMutation();
  
  const { data: formasPagamento } = trpc.dominios.formasPagamento.list.useQuery();
  const { data: tiposAtendimento } = trpc.dominios.tiposAtendimento.list.useQuery();

  const pedidos = data?.pedidos || [];
  const total = data?.total || 0;
  
  // Usar dados das estatísticas totais (sem filtros de status/data/cliente)
  const todosPedidos = estatisticasTotais?.pedidos || [];
  const totalSaidas = estatisticasTotais?.total || 0;
  const valorTotal = todosPedidos.reduce((sum, p) => sum + (p.total || 0), 0);
  const saidasPendentes = todosPedidos.filter(p => p.status === 'PENDENTE').length;
  const saidasFinalizadas = todosPedidos.filter(p => p.status === 'FINALIZADO').length;
  const saidasCanceladas = todosPedidos.filter(p => p.status === 'CANCELADO').length;

  type Pedido = typeof pedidos[number];

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const formatCurrency = (value: number | null | undefined) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  const formatDate = (dateString: string) => {
    try {
      // Parse manual para evitar conversão de timezone
      const [year, month, day] = dateString.split('T')[0].split('-');
      return `${day}/${month}/${year}`;
    } catch {
      return dateString;
    }
  };

  const getStatusChip = (status: string) => {
    const config = {
      PENDENTE: { label: 'Pendente', color: 'warning' as const },
      CONFIRMADO: { label: 'Confirmado', color: 'info' as const },
      FINALIZADO: { label: 'Finalizado', color: 'success' as const },
      CANCELADO: { label: 'Cancelado', color: 'error' as const },
    }[status] || { label: status, color: 'default' as const };

    return <Chip label={config.label} color={config.color} size="small" sx={{ fontWeight: 600 }} />;
  };
  
  const handleVisualizarPedido = (pedido: any) => {
    setPedidoDetalhes(pedido);
    setDialogDetalhes(true);
  };
  
  const handleEditarPedido = (pedido: any) => {
    setPedidoEditando({
      id: pedido.id,
      cliente_id: pedido.cliente_id,
      destinatario_nome: pedido.cliente_nome || '',
      forma_pagamento_id: pedido.forma_pagamento_id,
      valor: pedido.total || 0,
      data: pedido.data || dateToString(new Date()),
      observacao: pedido.observacao ?? '',
      status: pedido.status,
    });
    setDialogEditar(true);
  };
  
  const handleSalvarEdicao = async () => {
    if (!pedidoEditando) return;
    
    // Validar valor
    if (!pedidoEditando.valor || pedidoEditando.valor <= 0) {
      toast.error('Por favor, informe o valor da despesa');
      return;
    }
    
    const toastId = toast.loading('Salvando alterações...');
    
    try {
      let clienteIdFinal = pedidoEditando.cliente_id;
      
      // Se foi alterado o nome do destinatário e não tem ID, criar novo
      if (pedidoEditando.destinatario_nome && !pedidoEditando.cliente_id) {
        toast.loading('Criando novo destinatário...', { id: toastId });
        
        try {
          const novoCliente = await criarClienteMutation.mutateAsync({
            nome: pedidoEditando.destinatario_nome,
          });
          clienteIdFinal = novoCliente.id;
        } catch (error) {
          console.error('Erro ao criar destinatário:', error);
        }
      }
      
      toast.loading('Atualizando despesa...', { id: toastId });
      
      await atualizarMutation.mutateAsync({
        id: pedidoEditando.id,
        cliente_id: clienteIdFinal || undefined,
        forma_pagamento_id: pedidoEditando.forma_pagamento_id || undefined,
        observacao: pedidoEditando.observacao,
        status: pedidoEditando.status,
        total: pedidoEditando.valor,
        subtotal: pedidoEditando.valor,
        data: pedidoEditando.data,
        desconto_valor: 0,
      });
      
      toast.success('Despesa atualizada com sucesso!', { id: toastId });
      setDialogEditar(false);
      setPedidoEditando(null);
      
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      toast.error('Erro ao atualizar despesa. Tente novamente.', { id: toastId });
    }
  };
  
  const handleCancelarPedido = async (pedido: any) => {
    setConfirmDialog({
      open: true,
      title: 'Cancelar Saída',
      message: `Deseja realmente cancelar a saída #${pedido.numero}?\n\nA saída ficará com status CANCELADO.`,
      severity: 'warning',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, open: false });
        const toastId = toast.loading('Cancelando saída...');
        
        try {
          await cancelarMutation.mutateAsync({ id: pedido.id });
          toast.success(`Saída #${pedido.numero} cancelada com sucesso!`, { id: toastId });
          setTimeout(() => window.location.reload(), 500);
        } catch (error) {
          toast.error('Erro ao cancelar saída. Tente novamente.', { id: toastId });
        }
      },
    });
  };
  
  const handleFinalizarPedido = async (pedido: any) => {
    setConfirmDialog({
      open: true,
      title: 'Finalizar Saída',
      message: `Deseja finalizar a saída #${pedido.numero}?\n\nA saída ficará com status FINALIZADO.`,
      severity: 'success',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, open: false });
        const toastId = toast.loading('Finalizando saída...');
        
        try {
          await finalizarMutation.mutateAsync({ id: pedido.id });
          toast.success(`Saída #${pedido.numero} finalizada com sucesso!`, { id: toastId });
          setTimeout(() => window.location.reload(), 500);
        } catch (error) {
          toast.error('Erro ao finalizar saída. Tente novamente.', { id: toastId });
        }
      },
    });
  };
  
  const handleDuplicarPedido = async (pedido: any) => {
    setConfirmDialog({
      open: true,
      title: 'Duplicar Saída',
      message: `Deseja duplicar a saída #${pedido.numero}?\n\nUma cópia da saída será criada com todos os itens.`,
      severity: 'info',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, open: false });
        const toastId = toast.loading('Duplicando saída...');
        
        try {
          await duplicarMutation.mutateAsync({ id: pedido.id });
          toast.success('Saída duplicada com sucesso!', { id: toastId });
          setTimeout(() => window.location.reload(), 500);
        } catch (error) {
          toast.error('Erro ao duplicar saída. Tente novamente.', { id: toastId });
        }
      },
    });
  };
  
  const handleExcluirPedido = async (pedido: any) => {
    setConfirmDialog({
      open: true,
      title: 'Excluir Saída Permanentemente',
      message: `⚠️ ATENÇÃO: Deseja realmente EXCLUIR a saída #${pedido.numero}?\n\n✗ Esta ação NÃO pode ser desfeita!\n✗ Todos os itens da saída também serão excluídos.\n✗ Não será possível recuperar os dados.`,
      severity: 'error',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, open: false });
        const toastId = toast.loading('Excluindo saída...');
        
        try {
          await deletarMutation.mutateAsync({ id: pedido.id });
          toast.success(`Saída #${pedido.numero} excluída com sucesso!`, { id: toastId });
          setTimeout(() => window.location.reload(), 500);
        } catch (error) {
          toast.error('Erro ao excluir saída. Tente novamente.', { id: toastId });
        }
      },
    });
  };
  
  const limparFiltros = () => {
    setStatus('');
    setSearch('');
    setDataInicio('');
    setDataFim('');
    setClienteSelecionado(null);
    setPage(0);
  };
  
  const handleCriarSaida = () => {
    setDialogNovaSaida(true);
  };
  
  const handleSalvarNovaSaida = async () => {
    // Validar valor
    if (!novaSaida.valor || novaSaida.valor <= 0) {
      toast.error('Por favor, informe o valor da despesa');
      return;
    }
    
    const toastId = toast.loading('Criando nova despesa...');
    
    try {
      let clienteIdFinal = novaSaida.cliente_id;
      
      // Se foi digitado um nome novo (não selecionado da lista)
      if (novaSaida.destinatario_nome && !novaSaida.cliente_id) {
        toast.loading('Criando novo destinatário...', { id: toastId });
        
        try {
          const novoCliente = await criarClienteMutation.mutateAsync({
            nome: novaSaida.destinatario_nome,
          });
          clienteIdFinal = novoCliente.id;
        } catch (error) {
          console.error('Erro ao criar destinatário:', error);
          // Continua mesmo se falhar ao criar o destinatário
        }
      }
      
      // Buscar o ID do tipo de atendimento SAIDA
      const tipoSaida = (tiposAtendimento as any)?.find((t: any) => t.tipo === 'SAIDA');
      
      if (!tipoSaida) {
        toast.error('Tipo de atendimento SAÍDA não encontrado', { id: toastId });
        return;
      }
      
      // Criar o pedido (despesa)
      toast.loading('Salvando despesa...', { id: toastId });
      
      await criarPedidoMutation.mutateAsync({
        cliente_id: clienteIdFinal || undefined,
        tipo_atendimento_id: tipoSaida.id,
        forma_pagamento_id: novaSaida.forma_pagamento_id || undefined,
        data: novaSaida.data,
        observacao: novaSaida.observacao || undefined,
        total: novaSaida.valor,
        subtotal: novaSaida.valor,
        desconto_valor: 0,
      });
      
      toast.success('Despesa criada com sucesso!', { id: toastId });
      setDialogNovaSaida(false);
      setNovaSaida({
        cliente_id: '',
        destinatario_nome: '',
        forma_pagamento_id: '',
        valor: 0,
        data: dateToString(new Date()),
        observacao: '',
      });
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      toast.error('Erro ao criar despesa. Tente novamente.', { id: toastId });
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Gerenciar Saídas Financeiras"
        subtitle={`${total} despesas registradas`}
        breadcrumbs={[
          { label: 'Início', href: '/' },
          { label: 'Saídas Financeiras' },
        ]}
        action={{
          label: 'Nova Despesa',
          onClick: handleCriarSaida,
          icon: <CallMade />,
          variant: 'contained',
        }}
      />
      
      {/* Cards de Estatísticas */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              p: 3,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                  Total de Despesas
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  {totalSaidas}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  Registradas
                </Typography>
              </Box>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CallMade sx={{ fontSize: 28 }} />
              </Box>
            </Box>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              p: 3,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                  Total em Despesas
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {formatCurrency(valorTotal)}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  Gastos registrados
                </Typography>
              </Box>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AttachMoney sx={{ fontSize: 28 }} />
              </Box>
            </Box>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
              p: 3,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                  Pendentes
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  {saidasPendentes}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  Aguardando
                </Typography>
              </Box>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <TrendingUp sx={{ fontSize: 28 }} />
              </Box>
            </Box>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
              color: 'white',
              p: 3,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                  Finalizadas
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  {saidasFinalizadas}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  Concluídas
                </Typography>
              </Box>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle sx={{ fontSize: 28 }} />
              </Box>
            </Box>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mb: 3 }}>
        <Card sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <FilterList color="primary" />
            <Typography variant="h6" fontWeight="bold">
              Filtros
            </Typography>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                placeholder="Buscar por número..."
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
            
            <Grid item xs={12} sm={6} md={3}>
              <Autocomplete
                options={(clientes as any)?.clientes || []}
                getOptionLabel={(option: any) => option.nome || ''}
                value={clienteSelecionado}
                onChange={(_, newValue) => {
                  setClienteSelecionado(newValue);
                  setPage(0);
                }}
                onInputChange={(_, newInputValue) => {
                  setSearchCliente(newInputValue);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Fornecedor/Destinatário"
                    placeholder="Filtrar por fornecedor ou destinatário"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <InputAdornment position="start">
                            <Person />
                          </InputAdornment>
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  onClick={limparFiltros}
                  startIcon={<Close />}
                >
                  Limpar Filtros
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Card>
      </Box>

      <Card>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
            <CircularProgress />
          </Box>
        ) : pedidos.length === 0 ? (
          <EmptyState
            icon={<CallMade />}
            title="Nenhuma despesa encontrada"
            description="Não há despesas registradas com os filtros selecionados"
          />
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Número</TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Data</TableCell>
                    <TableCell>Fornecedor/Destinatário</TableCell>
                    <TableCell align="right">Valor</TableCell>
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
                    >
                      <TableCell>
                        <Chip
                          label={`#${pedido.numero}`}
                          size="small"
                          variant="outlined"
                          color="error"
                          icon={<CallMade />}
                          sx={{ fontFamily: 'monospace', fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{formatDate(pedido.data)}</TableCell>
                      <TableCell>
                        <Box>
                          <Box sx={{ fontWeight: 600 }}>{pedido.cliente_nome || 'Não especificado'}</Box>
                          {pedido.cliente_telefone && (
                            <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                              {pedido.cliente_telefone}
                            </Box>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ fontWeight: 600, color: 'error.main', fontSize: '1rem' }}>
                          {formatCurrency(pedido.total)}
                        </Box>
                      </TableCell>
                      <TableCell align="center">{getStatusChip(pedido.status)}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Visualizar Detalhes">
                          <IconButton
                            size="small"
                            onClick={() => handleVisualizarPedido(pedido)}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Editar">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleEditarPedido(pedido)}
                            disabled={pedido.status === 'CANCELADO'}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Imprimir">
                          <IconButton
                            size="small"
                            onClick={() => setPrintDialog({ open: true, pedido })}
                          >
                            <Print fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Duplicar">
                          <IconButton
                            size="small"
                            onClick={() => handleDuplicarPedido(pedido)}
                            disabled={duplicarMutation.isPending}
                          >
                            <ContentCopy fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {pedido.status === 'PENDENTE' && (
                          <>
                            <Tooltip title="Finalizar">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleFinalizarPedido(pedido)}
                                disabled={finalizarMutation.isPending}
                              >
                                <CheckCircle fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Cancelar">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleCancelarPedido(pedido)}
                                disabled={cancelarMutation.isPending}
                              >
                                <Cancel fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        <Tooltip title="Excluir Permanentemente">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleExcluirPedido(pedido)}
                            disabled={deletarMutation.isPending}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
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
              labelRowsPerPage="Saídas por página:"
              labelDisplayedRows={({ from, to, count }) =>
                `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
              }
            />
          </>
        )}
      </Card>

      {/* Dialog de Confirmação */}
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
        onPrint={() => {
          toast.success(`Abrindo janela de impressão...`);
          setPrintDialog({ open: false, pedido: null });
          alert(`Implementar impressão da saída #${printDialog.pedido?.numero}`);
        }}
        onDownload={() => {
          toast.success(`Gerando PDF para download...`);
          setPrintDialog({ open: false, pedido: null });
          alert(`Implementar download da saída #${printDialog.pedido?.numero}`);
        }}
        title="Imprimir Saída"
        subtitle={printDialog.pedido ? `Saída #${printDialog.pedido.numero}` : ''}
      />
      
      {/* Dialog de Detalhes da Saída */}
      <Dialog 
        open={dialogDetalhes} 
        onClose={() => setDialogDetalhes(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Receipt color="primary" />
            <Typography variant="h6" fontWeight="bold">
              Detalhes da Despesa #{pedidoCompleto?.numero}
            </Typography>
          </Box>
          <IconButton onClick={() => setDialogDetalhes(false)}>
            <Close />
          </IconButton>
        </DialogTitle>
        
        <DialogContent>
          {loadingDetalhes ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
              <CircularProgress />
            </Box>
          ) : pedidoCompleto ? (
            <Box>
              {/* Informações Principais */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="caption" color="text.secondary">Data</Typography>
                    <Typography fontWeight="bold">{pedidoCompleto.data ? formatDate(pedidoCompleto.data) : '-'}</Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="caption" color="text.secondary">Status</Typography>
                    <Box sx={{ mt: 0.5 }}>{pedidoCompleto.status ? getStatusChip(pedidoCompleto.status) : '-'}</Box>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="caption" color="text.secondary">Fornecedor/Destinatário</Typography>
                    <Typography fontWeight="bold">{pedidoCompleto.cliente_nome || 'Não especificado'}</Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="caption" color="text.secondary">Forma de Pagamento</Typography>
                    <Typography fontWeight="bold">{pedidoCompleto.forma_pagamento_nome || 'Não informada'}</Typography>
                  </Card>
                </Grid>
              </Grid>
              
              {/* Valores */}
              <Card variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'error.50' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6" fontWeight="bold">Valor Total da Despesa:</Typography>
                  <Typography variant="h5" fontWeight="bold" color="error.main">
                    {formatCurrency(pedidoCompleto.total)}
                  </Typography>
                </Box>
              </Card>
              
              {/* Observações */}
              {pedidoCompleto.observacao && (
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Observações
                  </Typography>
                  <Typography>{pedidoCompleto.observacao}</Typography>
                </Card>
              )}
            </Box>
          ) : (
            <Alert severity="error">Erro ao carregar detalhes da despesa</Alert>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 3, justifyContent: 'space-between' }}>
          <Button onClick={() => setDialogDetalhes(false)} variant="outlined">
            Fechar
          </Button>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              onClick={() => {
                setPrintDialog({ open: true, pedido: pedidoDetalhes });
                setDialogDetalhes(false);
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
                  setDialogDetalhes(false);
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
                    setDialogDetalhes(false);
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
                    setDialogDetalhes(false);
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
                setDialogDetalhes(false);
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
      
      {/* Dialog de Edição */}
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
              Editar Despesa
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
                {/* Destinatário */}
                <Grid item xs={12}>
                  <Autocomplete
                    freeSolo
                    options={(clientes as any)?.clientes || []}
                    getOptionLabel={(option: any) => {
                      if (typeof option === 'string') return option;
                      return option.nome || '';
                    }}
                    value={pedidoEditando.destinatario_nome}
                    onChange={(_, newValue) => {
                      if (typeof newValue === 'string') {
                        setPedidoEditando({ 
                          ...pedidoEditando, 
                          destinatario_nome: newValue,
                          cliente_id: ''
                        });
                      } else if (newValue) {
                        setPedidoEditando({ 
                          ...pedidoEditando, 
                          destinatario_nome: (newValue as any).nome || '',
                          cliente_id: (newValue as any).id || ''
                        });
                      } else {
                        setPedidoEditando({ 
                          ...pedidoEditando, 
                          destinatario_nome: '',
                          cliente_id: ''
                        });
                      }
                    }}
                    onInputChange={(_, newInputValue) => {
                      setPedidoEditando({ 
                        ...pedidoEditando, 
                        destinatario_nome: newInputValue 
                      });
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Fornecedor/Destinatário"
                        placeholder="Digite ou selecione"
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <>
                              <InputAdornment position="start">
                                <Person />
                              </InputAdornment>
                              {params.InputProps.startAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />
                </Grid>
                
                {/* Data */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Data da Despesa"
                    type="date"
                    value={pedidoEditando.data}
                    onChange={(e) => setPedidoEditando({ 
                      ...pedidoEditando, 
                      data: e.target.value 
                    })}
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CalendarToday />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                
                {/* Valor */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Valor (R$)"
                    type="number"
                    required
                    value={pedidoEditando.valor}
                    onChange={(e) => setPedidoEditando({ 
                      ...pedidoEditando, 
                      valor: parseFloat(e.target.value) || 0 
                    })}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <AttachMoney />
                        </InputAdornment>
                      ),
                    }}
                    error={pedidoEditando.valor <= 0}
                  />
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
            disabled={atualizarMutation.isPending || (pedidoEditando && pedidoEditando.valor <= 0)}
            startIcon={atualizarMutation.isPending ? <CircularProgress size={20} /> : <Check />}
          >
            {atualizarMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Dialog de Nova Saída */}
      <Dialog 
        open={dialogNovaSaida} 
        onClose={() => setDialogNovaSaida(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CallMade color="error" />
            <Typography variant="h6" fontWeight="bold">
              Nova Despesa Financeira
            </Typography>
          </Box>
          <IconButton onClick={() => setDialogNovaSaida(false)}>
            <Close />
          </IconButton>
        </DialogTitle>
        
        <DialogContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            Registre uma nova despesa ou gasto financeiro da empresa.
          </Alert>
          
          {novaSaida.destinatario_nome && !novaSaida.cliente_id && (
            <Alert severity="success" sx={{ mb: 3 }}>
              ✨ Novo destinatário "{novaSaida.destinatario_nome}" será criado automaticamente
            </Alert>
          )}
          
          <Grid container spacing={2}>
            {/* Destinatário */}
            <Grid item xs={12}>
              <Autocomplete
                freeSolo
                options={(clientes as any)?.clientes || []}
                getOptionLabel={(option: any) => {
                  if (typeof option === 'string') return option;
                  return option.nome || '';
                }}
                value={novaSaida.destinatario_nome}
                onChange={(_, newValue) => {
                  if (typeof newValue === 'string') {
                    setNovaSaida({ 
                      ...novaSaida, 
                      destinatario_nome: newValue,
                      cliente_id: ''
                    });
                  } else if (newValue) {
                    setNovaSaida({ 
                      ...novaSaida, 
                      destinatario_nome: (newValue as any).nome || '',
                      cliente_id: (newValue as any).id || ''
                    });
                  } else {
                    setNovaSaida({ 
                      ...novaSaida, 
                      destinatario_nome: '',
                      cliente_id: ''
                    });
                  }
                }}
                onInputChange={(_, newInputValue) => {
                  setNovaSaida({ 
                    ...novaSaida, 
                    destinatario_nome: newInputValue 
                  });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Fornecedor/Destinatário (Opcional)"
                    placeholder="Digite ou selecione o destinatário"
                    helperText="Você pode digitar um novo nome ou selecionar um existente"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <InputAdornment position="start">
                            <Person />
                          </InputAdornment>
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Grid>
            
            {/* Forma de Pagamento */}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Forma de Pagamento (Opcional)</InputLabel>
                <Select
                  value={novaSaida.forma_pagamento_id}
                  label="Forma de Pagamento (Opcional)"
                  onChange={(e) => setNovaSaida({ ...novaSaida, forma_pagamento_id: e.target.value })}
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
            
            {/* Data da Despesa */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Data da Despesa *"
                type="date"
                required
                value={novaSaida.data}
                onChange={(e) => setNovaSaida({ ...novaSaida, data: e.target.value })}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarToday />
                    </InputAdornment>
                  ),
                }}
                helperText="Quando a despesa ocorreu?"
              />
            </Grid>
            
            {/* Valor da Despesa */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Valor da Despesa (R$) *"
                type="number"
                required
                value={novaSaida.valor}
                onChange={(e) => setNovaSaida({ ...novaSaida, valor: parseFloat(e.target.value) || 0 })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AttachMoney />
                    </InputAdornment>
                  ),
                }}
                helperText="Informe o valor total da despesa"
                error={novaSaida.valor <= 0}
              />
            </Grid>
            
            {/* Observações */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Observações"
                value={novaSaida.observacao}
                onChange={(e) => setNovaSaida({ ...novaSaida, observacao: e.target.value })}
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
          
          <Alert severity="warning" sx={{ mt: 3 }}>
            Esta saída representa uma despesa financeira da empresa.
          </Alert>
        </DialogContent>
        
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => setDialogNovaSaida(false)} 
            variant="outlined"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSalvarNovaSaida} 
            variant="contained"
            color="error"
            startIcon={<Check />}
            disabled={!novaSaida.valor || novaSaida.valor <= 0}
          >
            Criar Despesa
          </Button>
        </DialogActions>
      </Dialog>
    </AppLayout>
  );
}
