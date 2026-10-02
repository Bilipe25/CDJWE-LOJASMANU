'use client';

import { useEffect, useRef, useState } from 'react';
import { formatDateBR } from '@/lib/utils/dateUtils';
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
  Avatar,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControlLabel,
  Switch,
  Divider,
  useMediaQuery,
  Breadcrumbs,
  Link,
  useTheme,
  Typography,
  Alert,
  MenuItem,
} from '@mui/material';
import {
  Search,
  Add,
  Edit,
  Delete,
  Phone,
  Person,
  LocationOn,
  Visibility,
  TrendingUp,
  CheckCircle,
  ShoppingCart,
  History,
  NavigateNext,
  OpenInNew,
} from '@mui/icons-material';
import AppLayout from '@/components/layout/AppLayout';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import LoadingSkeleton from '@/components/common/LoadingSkeleton';
import StatusBadge from '@/components/common/StatusBadge';
import { trpc } from '@/lib/trpc/client';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import ClienteDadosFields from '@/components/common/ClienteDadosFields';
import EnderecosClienteFields, { type EnderecoCadastroFormulario } from '@/components/common/EnderecosClienteFields';
import { clienteSchema, clienteUpdateSchema } from '@/lib/schemas/cliente';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

export default function ClientesPage() {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [search, setSearch] = useState('');

  // Dialogs
  const [dialogNovo, setDialogNovo] = useState(false);
  const [dialogEditar, setDialogEditar] = useState(false);
  const [dialogDetalhes, setDialogDetalhes] = useState(false);
  const [dialogHistorico, setDialogHistorico] = useState(false);
  const [paginaHistorico, setPaginaHistorico] = useState(0);
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);
  const [clienteDetalhes, setClienteDetalhes] = useState<Cliente | null>(null);
  const [clienteHistorico, setClienteHistorico] = useState<Cliente | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => { } });

  // Formulário
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [ativo, setAtivo] = useState(true);

  const [enderecosFormulario, setEnderecosFormulario] = useState<EnderecoCadastroFormulario[]>([]);
  const [loadingEndereco, setLoadingEndereco] = useState(false);
  const [erroEndereco, setErroEndereco] = useState(false);
  const consultaEnderecoAtual = useRef(0);
  const [filtroAtivo, setFiltroAtivo] = useState<'ativos'|'inativos'|'todos'>('ativos');
  const buscaConsulta = useDebouncedValue(search);
  const dadosCliente = { nome, cpf, telefone, email };
  const atualizarDadosCliente = (dados: typeof dadosCliente) => { setNome(dados.nome); setCpf(dados.cpf); setTelefone(dados.telefone); setEmail(dados.email); };

  const { data, isLoading, error: erroLista, refetch: recarregarLista } = trpc.clientes.list.useQuery({
    limit: rowsPerPage,
    offset: page * rowsPerPage,
    search: buscaConsulta || undefined,
    ativo: filtroAtivo === 'todos' ? null : filtroAtivo === 'ativos',
  });

  // Query para estatísticas
  const { data: stats, error: erroEstatisticas, refetch: recarregarEstatisticas } = trpc.clientes.stats.useQuery();

  // Query para pedidos do cliente (só busca quando dialog está aberto)
  const { data: pedidosCliente, isLoading: loadingPedidos, error: erroHistorico, refetch: recarregarHistorico } = trpc.pedidos.listByCliente.useQuery(
    { clienteId: clienteHistorico?.id || '', limit: 25, offset: paginaHistorico * 25 },
    { enabled: !!clienteHistorico?.id && dialogHistorico }
  );

  const clientes = data?.clientes || [];
  const total = data?.total || 0;

  useEffect(() => { if (data && page > 0 && page * rowsPerPage >= data.total) setPage(Math.max(0, Math.ceil(data.total / rowsPerPage) - 1)); }, [data, page, rowsPerPage]);
  // Mutations
  const utils = trpc.useUtils();
  const criarMutation = trpc.clientes.create.useMutation({
    onSuccess: async () => { await utils.invalidate(); },
  });
  const atualizarMutation = trpc.clientes.update.useMutation({
    onSuccess: async () => { await utils.invalidate(); },
  });
  const deletarMutation = trpc.clientes.delete.useMutation({
    onSuccess: async () => { await utils.invalidate(); },
  });

  type Cliente = typeof clientes[number];

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

  const limparFormulario = () => {
    setNome('');
    setCpf('');
    setTelefone('');
    setEmail('');
    setAtivo(true);
    setEnderecosFormulario([]);
  };

  const handleNovoCliente = () => {
    limparFormulario();
    setDialogNovo(true);
  };

  const handleEditarCliente = (cliente: Cliente) => {
    setClienteEditando(cliente);
    setNome(cliente.nome);
    setCpf(cliente.cpf || '');
    setTelefone(cliente.telefone || '');
    setEmail(cliente.email || '');
    setAtivo(cliente.ativo !== false);

    setEnderecosFormulario([]);

    // Buscar endereço do cliente via query separada
    buscarEnderecoCliente(cliente.id);

    setDialogEditar(true);
  };

  const buscarEnderecoCliente = async (clienteId: string) => {
    const consulta = ++consultaEnderecoAtual.current;
    setLoadingEndereco(true);
    setErroEndereco(false);
    try {
      const clienteCompleto = await utils.clientes.getById.fetch({ id: clienteId });
      if (consulta !== consultaEnderecoAtual.current) return;
      setEnderecosFormulario(clienteCompleto.enderecos.map(e => ({ id: e.id, logradouro: e.logradouro, numero: e.numero || '', complemento: e.complemento || '', bairro: e.bairro || '', cidade: e.cidade || '', estado: e.estado || '', cep: e.cep || '', principal: !!e.principal, ativo: e.ativo })));
    } catch {
      if (consulta !== consultaEnderecoAtual.current) return;
      setErroEndereco(true);
    } finally {
      if (consulta === consultaEnderecoAtual.current) setLoadingEndereco(false);
    }
  };

  const handleVisualizarCliente = (cliente: Cliente) => {
    setClienteDetalhes(cliente);
    setDialogDetalhes(true);
  };

  const handleHistoricoPedidos = (cliente: Cliente) => {
    setPaginaHistorico(0);
    setClienteHistorico(cliente);
    setDialogHistorico(true);
  };

  const handleVerPedido = (pedidoId: string) => {
    router.push(`/pedidos?id=${pedidoId}`);
  };

  const salvarCliente = async (edicao: boolean) => {
    if (edicao && (!clienteEditando || loadingEndereco || erroEndereco)) return;
    const entrada = { ...dadosCliente, ativo, enderecos: enderecosFormulario };
    const validacao = edicao ? clienteUpdateSchema.safeParse({ ...entrada, id: clienteEditando?.id }) : clienteSchema.safeParse(entrada);
    if (!validacao.success) { toast.error(validacao.error.issues[0].message); return; }
    const toastId = toast.loading(edicao ? 'Atualizando cliente...' : 'Criando cliente...');
    try {
      if (edicao && clienteEditando) await atualizarMutation.mutateAsync({ ...entrada, id: clienteEditando.id });
      else await criarMutation.mutateAsync(entrada);
      toast.success(edicao ? 'Cliente atualizado!' : 'Cliente criado!', { id: toastId });
      setDialogNovo(false); setDialogEditar(false); setClienteEditando(null); limparFormulario();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o cliente.', { id: toastId }); }
  };
  const handleSalvarNovo = () => salvarCliente(false);
  const handleSalvarEdicao = () => salvarCliente(true);

  const handleDeletarCliente = (cliente: Cliente) => {
    setConfirmDialog({
      open: true,
      title: 'Desativar Cliente',
      message: `Tem certeza que deseja desativar o cliente "${cliente.nome}"?`,
      onConfirm: async () => {
        const toastId = toast.loading('Desativando cliente...');
        try {
          await deletarMutation.mutateAsync({ id: cliente.id });
          toast.success('Cliente desativado com sucesso!', { id: toastId });
          setConfirmDialog({ ...confirmDialog, open: false });
        } catch (error: unknown) {
          toast.error((error instanceof Error ? error.message : null) || 'Erro ao desativar cliente', { id: toastId });
        }
      },
    });
  };

  const handleReativar = (cliente: Cliente) => setConfirmDialog({ open: true, title: 'Reativar cliente', message: 'Reativar ' + cliente.nome + '? O cadastro voltará a aparecer no PDV.', onConfirm: async () => {
    try { await atualizarMutation.mutateAsync({ id: cliente.id, ativo: true }); setConfirmDialog(c => ({ ...c, open: false })); toast.success('Cliente reativado.'); } catch (e) { toast.error(e instanceof Error ? e.message : 'Não foi possível reativar.'); }
  }});
  return (
    <AppLayout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        {erroEstatisticas && <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" onClick={() => recarregarEstatisticas()}>Tentar novamente</Button>}>Indicadores indisponíveis. Tente novamente.</Alert>}
      <Breadcrumbs separator={<NavigateNext fontSize="small" />} aria-label="breadcrumb">
          <Link underline="hover" color="inherit" href="/" onClick={(e) => { e.preventDefault(); router.push('/'); }} sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            Dashboard
          </Link>
          <Typography color="text.primary">Clientes</Typography>
        </Breadcrumbs>

        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleNovoCliente}
          size="large"
        >
          Novo Cliente
        </Button>
      </Box>

      {/* Cards de Estatísticas */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ p: { xs: 2, sm: 2.5 }, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', minWidth: 0 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'primary.light', color: 'primary.main' }}>
                <Person sx={{ fontSize: { xs: 28, sm: 24 } }} />
              </Box>
              <Box>
                <Box sx={{ fontSize: { xs: 20, sm: 24 }, fontWeight: 700, whiteSpace: 'nowrap', maxWidth: '100%', overflowX: 'auto', fontVariantNumeric: 'tabular-nums' }}>{erroEstatisticas ? '—' : stats?.total ?? '—'}</Box>
                <Box sx={{ fontSize: 12, color: 'text.secondary' }}>Total de Clientes</Box>
              </Box>
            </Box>
          </Card>
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ p: { xs: 2, sm: 2.5 }, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', minWidth: 0 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'success.light', color: 'success.main' }}>
                <CheckCircle sx={{ fontSize: { xs: 28, sm: 24 } }} />
              </Box>
              <Box>
                <Box sx={{ fontSize: { xs: 20, sm: 24 }, fontWeight: 700, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                  {erroEstatisticas ? '—' : stats?.ativos ?? '—'}
                </Box>
                <Box sx={{ fontSize: 12, color: 'text.secondary' }}>Clientes Ativos</Box>
              </Box>
            </Box>
          </Card>
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ p: { xs: 2, sm: 2.5 }, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', minWidth: 0 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'warning.light', color: 'warning.main' }}>
                <ShoppingCart sx={{ fontSize: { xs: 28, sm: 24 } }} />
              </Box>
              <Box>
                <Box sx={{ fontSize: { xs: 20, sm: 24 }, fontWeight: 700, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                  {erroEstatisticas ? '—' : stats?.totalPedidos ?? '—'}
                </Box>
                <Box sx={{ fontSize: 12, color: 'text.secondary' }}>Total de Pedidos</Box>
              </Box>
            </Box>
          </Card>
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ p: { xs: 2, sm: 2.5 }, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', minWidth: 0 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'info.light', color: 'info.main' }}>
                <TrendingUp sx={{ fontSize: { xs: 28, sm: 24 } }} />
              </Box>
              <Box>
                <Box sx={{ fontSize: { xs: 20, sm: 24 }, fontWeight: 700, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                  {erroEstatisticas || !stats ? '—' : formatCurrency(stats.valorTotalCompras)}
                </Box>
                <Box sx={{ fontSize: 12, color: 'text.secondary' }}>Total em Compras</Box>
              </Box>
            </Box>
          </Card>
        </Grid>
      </Grid>

      <Card>
        {/* Barra de Pesquisa */}
        <Box sx={{ p: { xs: 2, sm: 3 }, borderBottom: '1px solid', borderColor: 'divider' }}>
          <TextField
            fullWidth
            label="Buscar cliente"
            placeholder="Buscar por nome, CPF ou telefone..."
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
        </Box>

        <Box sx={{ px: 2, pb: 2 }}><TextField select label="Situação dos clientes" fullWidth value={filtroAtivo} onChange={e => { setFiltroAtivo(e.target.value as typeof filtroAtivo); setPage(0); }}>
          <MenuItem value="ativos">Ativos</MenuItem><MenuItem value="inativos">Inativos</MenuItem><MenuItem value="todos">Todos</MenuItem>
        </TextField></Box>
        {/* Tabela */}
        {erroLista ? <Alert severity="error" action={<Button color="inherit" onClick={() => recarregarLista()}>Tentar novamente</Button>}>Não foi possível carregar os clientes. Confira a conexão e tente novamente.</Alert> : isLoading ? (
          <Box sx={{ p: 2 }}>
            <LoadingSkeleton type="table" rows={5} />
          </Box>
        ) : clientes.length === 0 ? (
          <EmptyState
            icon={<Person />}
            title="Nenhum cliente encontrado"
            description={
              search
                ? 'Tente buscar com outros termos'
                : filtroAtivo === 'inativos' ? 'Não há clientes inativos. Altere a situação para consultar outros cadastros.' : 'Cadastre seu primeiro cliente para começar'
            }
            action={
              !search && filtroAtivo !== 'inativos'
                ? {
                  label: 'Cadastrar Cliente',
                  onClick: handleNovoCliente,
                }
                : undefined
            }
          />
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Cliente</TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>CPF</TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Telefone</TableCell>
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Endereço</TableCell>
                    <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Total Compras</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="right">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {clientes.map((cliente, index) => (
                    <TableRow
                      key={cliente.id}
                      component={motion.tr}
                      initial={false}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.15, delay: Math.min(index, 4) * 0.02 }}
                      hover
                      onClick={() => handleVisualizarCliente(cliente)}
                      sx={{
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          bgcolor: 'action.hover',
                          transform: 'scale(1.01)',
                        }
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', minWidth: 0 }}>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            {cliente.nome?.charAt(0).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Box sx={{ fontWeight: 600 }}>{cliente.nome}</Box>
                            <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                              {cliente.total_pedidos || 0} pedidos
                            </Box>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{cliente.cpf || '-'}</TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Phone fontSize="small" color="action" />
                          {cliente.telefone || '-'}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LocationOn fontSize="small" color="action" />
                          <Box sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {cliente.endereco_principal_completo || '-'}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                        <Box sx={{ fontWeight: 600, color: 'success.main' }}>
                          {formatCurrency(cliente.valor_total_compras)}
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <StatusBadge
                          status={cliente.ativo ? 'ATIVO' : 'INATIVO'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Histórico de Pedidos">
                          <IconButton
                            size="small"
                            color="info"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleHistoricoPedidos(cliente);
                            }}
                          >
                            <History fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>
                          <Tooltip title="Visualizar">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVisualizarCliente(cliente);
                              }}
                            >
                              <Visibility fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                        <Tooltip title="Editar">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditarCliente(cliente);
                            }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={cliente.ativo ? "Desativar cliente" : "Reativar cliente"}>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (cliente.ativo) handleDeletarCliente(cliente); else handleReativar(cliente);
                            }}
                          >
                            {cliente.ativo ? <Delete fontSize="small" /> : <CheckCircle fontSize="small" />}
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

      {/* Dialog Novo Cliente */}
      <Dialog open={dialogNovo} onClose={() => setDialogNovo(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>Novo Cliente</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <ClienteDadosFields value={dadosCliente} onChange={atualizarDadosCliente} />
            <FormControlLabel
              control={<Switch checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />}
              label="Cliente Ativo"
            />

            <Divider sx={{ my: 2 }}>
              <Chip label="Endereço" size="small" />
            </Divider>

            <EnderecosClienteFields value={enderecosFormulario} onChange={setEnderecosFormulario} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogNovo(false)}>Cancelar</Button>
          <Button onClick={handleSalvarNovo} variant="contained" disabled={criarMutation.isPending}>
            {criarMutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Editar Cliente */}
      <Dialog open={dialogEditar} onClose={() => setDialogEditar(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>Editar Cliente</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <ClienteDadosFields value={dadosCliente} onChange={atualizarDadosCliente} />
            <FormControlLabel
              control={<Switch checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />}
              label="Cliente Ativo"
            />

            <Divider sx={{ my: 2 }}>
              <Chip label="Endereço" size="small" />
            </Divider>

            {loadingEndereco ? (
              <Box sx={{ py: 2 }}>
                <LoadingSkeleton type="form" rows={4} />
              </Box>
            ) : erroEndereco ? (
              <Alert severity="error" action={<Button color="inherit" onClick={() => clienteEditando && buscarEnderecoCliente(clienteEditando.id)}>Tentar novamente</Button>}>
                Não foi possível carregar o endereço. Tente novamente antes de salvar.
              </Alert>
            ) : (
              <EnderecosClienteFields value={enderecosFormulario} onChange={setEnderecosFormulario} />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogEditar(false)}>Cancelar</Button>
          <Button onClick={handleSalvarEdicao} variant="contained" disabled={atualizarMutation.isPending || loadingEndereco || erroEndereco}>
            {atualizarMutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Detalhes do Cliente */}
      <Dialog open={dialogDetalhes} onClose={() => setDialogDetalhes(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>Detalhes do Cliente</DialogTitle>
        <DialogContent>
          {clienteDetalhes && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56, fontSize: 24 }}>
                      {clienteDetalhes.nome?.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Box sx={{ fontSize: 20, fontWeight: 700, mb: 0.5 }}>
                        {clienteDetalhes.nome}
                      </Box>
                      <Chip
                        label={clienteDetalhes.ativo ? 'Ativo' : 'Inativo'}
                        color={clienteDetalhes.ativo ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ color: 'text.secondary', fontSize: 12, mb: 0.5 }}>CPF</Box>
                  <Box sx={{ fontWeight: 600 }}>{clienteDetalhes.cpf || '-'}</Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ color: 'text.secondary', fontSize: 12, mb: 0.5 }}>Telefone</Box>
                  <Box sx={{ fontWeight: 600 }}>{clienteDetalhes.telefone || '-'}</Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ color: 'text.secondary', fontSize: 12, mb: 0.5 }}>E-mail</Box>
                  <Box sx={{ fontWeight: 600 }}>{clienteDetalhes.email || '-'}</Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ color: 'text.secondary', fontSize: 12, mb: 0.5 }}>Total de Pedidos</Box>
                  <Box sx={{ fontWeight: 700, color: 'warning.main', fontSize: 18 }}>
                    {clienteDetalhes.total_pedidos || 0}
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ color: 'text.secondary', fontSize: 12, mb: 0.5 }}>Total em Compras</Box>
                  <Box sx={{ fontWeight: 700, color: 'success.main', fontSize: 18 }}>
                    {formatCurrency(clienteDetalhes.valor_total_compras)}
                  </Box>
                </Grid>
                {clienteDetalhes.endereco_principal_completo && (
                  <Grid item xs={12}>
                    <Box sx={{ color: 'text.secondary', fontSize: 12, mb: 0.5 }}>Endereço Principal</Box>
                    <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, fontSize: 14 }}>
                      {clienteDetalhes.endereco_principal_completo}
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogDetalhes(false)}>Fechar</Button>
          <Button
            onClick={() => {
              setDialogDetalhes(false);
              if (clienteDetalhes) handleEditarCliente(clienteDetalhes);
            }}
            variant="contained"
            startIcon={<Edit />}
          >
            Editar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Histórico de Pedidos */}
      <Dialog open={dialogHistorico} onClose={() => setDialogHistorico(false)} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <History />
            Histórico de Pedidos - {clienteHistorico?.nome}
          </Box>
        </DialogTitle>
        <DialogContent>
          {loadingPedidos ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : erroHistorico ? <Alert severity="error" action={<Button onClick={() => recarregarHistorico()}>Tentar novamente</Button>}>Histórico indisponível.</Alert> : !pedidosCliente || pedidosCliente.total === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
              Nenhum pedido encontrado para este cliente
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Número</TableCell>
                    <TableCell>Data</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="center">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pedidosCliente.pedidos.map((pedido) => (
                    <TableRow key={pedido.id} hover>
                      <TableCell>
                        <Chip
                          label={`#${pedido.numero}`}
                          size="small"
                          variant="outlined"
                          sx={{ fontFamily: 'monospace', fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell>
                        {formatDateBR(pedido.data)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={pedido.status}
                          size="small"
                          color={
                            pedido.status === 'FINALIZADO' ? 'success' :
                              pedido.status === 'PENDENTE' ? 'warning' :
                                pedido.status === 'CANCELADO' ? 'error' : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ fontWeight: 600, color: 'success.main' }}>
                          {formatCurrency(pedido.total)}
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Ver Detalhes do Pedido">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleVerPedido(pedido.id)}
                          >
                            <OpenInNew fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <TablePagination component="div" count={pedidosCliente?.total ?? 0} page={paginaHistorico} rowsPerPage={25} rowsPerPageOptions={[25]} onPageChange={(_,p) => setPaginaHistorico(p)} labelRowsPerPage="Por página" /><Button onClick={() => setDialogHistorico(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
        onConfirm={confirmDialog.onConfirm}
        confirmText={confirmDialog.title === 'Reativar cliente' ? 'Reativar' : 'Desativar'}
        cancelText="Cancelar"
        severity={confirmDialog.title === 'Reativar cliente' ? 'success' : 'warning'}
        loading={atualizarMutation.isPending || deletarMutation.isPending}
      />
    </AppLayout>
  );
}
