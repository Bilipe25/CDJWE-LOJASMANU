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
  useTheme,
  Typography,
  Alert,
  MenuItem,
  Menu,
} from '@mui/material';
import {
  Search,
  Add,
  Edit,
  Phone,
  Person,
  LocationOn,
  Visibility,
  ShoppingCart,
  OpenInNew,
  MoreVert,
  Close,
} from '@mui/icons-material';
import AppLayout from '@/components/layout/AppLayout';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import LoadingSkeleton from '@/components/common/LoadingSkeleton';
import StatusBadge from '@/components/common/StatusBadge';
import { trpc } from '@/lib/trpc/client';
import { OperationalHeader, OperationalSummary, operationalSurface, operationalTable } from '@/components/common/OperationalPage';
import { usePDVStore } from '@/stores/pdv-store';
import { formatarEndereco } from '@/lib/utils/endereco';
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
  const [paginaHistorico, setPaginaHistorico] = useState(0);
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);
  const [clienteDetalhes, setClienteDetalhes] = useState<Cliente | null>(null);
  const [clienteMenu, setClienteMenu] = useState<Cliente | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [abrindoVenda, setAbrindoVenda] = useState(false);
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
    { clienteId: clienteDetalhes?.id || '', limit: 25, offset: paginaHistorico * 25 },
    { enabled: !!clienteDetalhes?.id && dialogDetalhes }
  );

  const { data: clienteFicha, isLoading: loadingFicha, error: erroFicha, refetch: recarregarFicha } = trpc.clientes.getById.useQuery(
    { id: clienteDetalhes?.id || '' }, { enabled: !!clienteDetalhes?.id && dialogDetalhes }
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
    setPaginaHistorico(0);
    setClienteDetalhes(cliente);
    setDialogDetalhes(true);
  };

  const handleHistoricoPedidos = (cliente: Cliente) => handleVisualizarCliente(cliente);

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
  const handleNovaVenda = async (cliente: Cliente) => {
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
    <AppLayout>
      <OperationalHeader title="Clientes" description="Encontre o cadastro e retome o atendimento." actions={<Button variant="contained" startIcon={<Add />} onClick={handleNovoCliente}>Novo cliente</Button>} />
      {erroEstatisticas && <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" onClick={() => recarregarEstatisticas()}>Tentar novamente</Button>}>Indicadores indisponíveis.</Alert>}
      <OperationalSummary label="Indicadores gerais de clientes" items={[
        { label: 'Cadastros', value: erroEstatisticas ? '—' : stats?.total ?? '—' },
        { label: 'Ativos', value: erroEstatisticas ? '—' : stats?.ativos ?? '—' },
        { label: 'Vendas finalizadas', value: erroEstatisticas ? '—' : stats?.totalPedidos ?? '—' },
        { label: 'Compras finalizadas', value: erroEstatisticas || !stats ? '—' : formatCurrency(stats.valorTotalCompras) },
      ]} />
      <Card sx={operationalSurface}>
        {/* Barra de Pesquisa */}
        <Box sx={{ p: 2.5, display: 'flex', gap: 2, flexWrap: 'wrap', borderBottom: '1px solid', borderColor: 'divider' }}>
          <TextField size="small" label="Buscar cliente" placeholder="Nome, CPF, telefone ou e-mail" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} sx={{ flex: 1, minWidth: { xs: '100%', sm: 240 } }} InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} />
          <TextField size="small" select label="Situação" sx={{ width: { xs: '100%', sm: 180 } }} value={filtroAtivo} onChange={e => { setFiltroAtivo(e.target.value as typeof filtroAtivo); setPage(0); }}><MenuItem value="ativos">Ativos</MenuItem><MenuItem value="inativos">Inativos</MenuItem><MenuItem value="todos">Todos</MenuItem></TextField>
        </Box>
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
              <Table size="small" sx={operationalTable}>
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
                  {clientes.map((cliente) => (
                    <TableRow
                      key={cliente.id}
                      hover
                      onClick={() => handleVisualizarCliente(cliente)}
                      sx={{
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          bgcolor: 'action.hover',
                        }
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', minWidth: 0 }}>
                          <Box>
                            <Box sx={{ fontWeight: 600 }}>{cliente.nome}</Box>
                            <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                              {cliente.telefone || 'Telefone não informado'} · {cliente.total_pedidos || 0} vendas finalizadas
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
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <Tooltip title="Abrir ficha"><IconButton aria-label={'Abrir ficha de ' + cliente.nome} onClick={e => { e.stopPropagation(); handleVisualizarCliente(cliente); }}><Visibility fontSize="small" /></IconButton></Tooltip>
                          <Tooltip title="Editar cliente"><IconButton aria-label={'Editar ' + cliente.nome} onClick={e => { e.stopPropagation(); void handleEditarCliente(cliente); }} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}><Edit fontSize="small" /></IconButton></Tooltip>
                          <IconButton aria-label={'Mais ações de ' + cliente.nome} aria-haspopup="menu" onClick={e => { e.stopPropagation(); setClienteMenu(cliente); setMenuAnchor(e.currentTarget); }}><MoreVert fontSize="small" /></IconButton>
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

      <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => { setMenuAnchor(null); if (clienteMenu) handleHistoricoPedidos(clienteMenu); }}>Abrir ficha e histórico</MenuItem>
        <MenuItem onClick={() => { setMenuAnchor(null); if (clienteMenu) void handleEditarCliente(clienteMenu); }}>Editar cliente</MenuItem>
        <MenuItem onClick={() => { setMenuAnchor(null); if (clienteMenu) { if (clienteMenu.ativo) handleDeletarCliente(clienteMenu); else handleReativar(clienteMenu); } }} sx={{ color: clienteMenu?.ativo ? 'error.main' : 'primary.main' }}>{clienteMenu?.ativo ? 'Desativar cliente' : 'Reativar cliente'}</MenuItem>
      </Menu>
      {/* Ficha do cliente: contato, endereços e histórico na mesma consulta. */}
      <Dialog open={dialogDetalhes} onClose={() => setDialogDetalhes(false)} maxWidth={false} fullWidth fullScreen={isMobile} PaperProps={{ sx: { maxWidth: { sm: 900 } } }} aria-labelledby="cliente-ficha-titulo">
        <DialogTitle id="cliente-ficha-titulo" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Person color="primary" /><Box sx={{ flex: 1, minWidth: 0 }}><Typography component="span" sx={{ fontSize: 24, fontWeight: 700 }}>{clienteDetalhes?.nome}</Typography><Typography variant="body2" color="text.secondary">Ficha do cliente</Typography></Box>
          <StatusBadge status={clienteFicha ? clienteFicha.ativo ? 'ATIVO' : 'INATIVO' : clienteDetalhes?.ativo ? 'ATIVO' : 'INATIVO'} />
          <IconButton aria-label="Fechar ficha do cliente" onClick={() => setDialogDetalhes(false)}><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: '24px !important' }}>
          {clienteDetalhes && <>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1.5fr 1fr' }, gap: 2, mb: 3, p: 2, bgcolor: 'background.default', borderRadius: '12px' }}>
              <Box><Typography variant="caption" color="text.secondary">Telefone</Typography><Typography>{(clienteFicha ?? clienteDetalhes).telefone || 'Não informado'}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">E-mail</Typography><Typography sx={{ overflowWrap: 'anywhere' }}>{(clienteFicha ?? clienteDetalhes).email || 'Não informado'}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">CPF</Typography><Typography>{(clienteFicha ?? clienteDetalhes).cpf || 'Não informado'}</Typography></Box>
            </Box>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography component="h3" variant="h6" sx={{ mb: 2 }}>Endereços</Typography>
                {loadingFicha ? <LoadingSkeleton type="form" rows={2} /> : erroFicha ? <Alert severity="error" action={<Button onClick={() => recarregarFicha()}>Tentar novamente</Button>}>Não foi possível carregar os endereços.</Alert> : clienteFicha?.enderecos.length ? clienteFicha.enderecos.map(endereco => <Box key={endereco.id} sx={{ p: 2, mb: 1.5, bgcolor: 'background.default', borderRadius: '12px' }}>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}><LocationOn fontSize="small" color="primary" />{endereco.principal && endereco.ativo && <Chip size="small" label="Principal" color="primary" variant="outlined" />}{!endereco.ativo && <Chip size="small" label="Inativo" />}</Box>
                  <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{formatarEndereco(endereco)}</Typography>
                </Box>) : <Typography color="text.secondary" variant="body2">Nenhum endereço cadastrado.</Typography>}
                <Button startIcon={<Edit />} onClick={() => { setDialogDetalhes(false); void handleEditarCliente(clienteDetalhes); }}>Editar endereços</Button>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography component="h3" variant="h6">Histórico de pedidos</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>{pedidosCliente?.total ?? '…'} pedidos no histórico · Compras finalizadas: {formatCurrency(clienteDetalhes.valor_total_compras)}</Typography>
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
              <Table size="small" sx={operationalTable}>
                <TableHead>
                  <TableRow>
                    <TableCell>Número</TableCell>
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
                          sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}
                        />
                        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>{formatDateBR(pedido.data)}</Typography>
                        <StatusBadge status={pedido.status || 'Não informado'} sx={{ mt: 0.5 }} />
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
                            aria-label={'Abrir pedido #' + pedido.numero}
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

                {pedidosCliente && <TablePagination component="div" count={pedidosCliente.total} page={paginaHistorico} rowsPerPage={25} rowsPerPageOptions={[25]} onPageChange={(_, p) => setPaginaHistorico(p)} labelRowsPerPage="Por página" />}
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

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
        onConfirm={confirmDialog.onConfirm}
        confirmText={confirmDialog.title === 'Iniciar uma nova venda?' ? 'Descartar e iniciar' : confirmDialog.title === 'Reativar cliente' ? 'Reativar' : 'Desativar'}
        cancelText="Cancelar"
        severity={confirmDialog.title === 'Reativar cliente' ? 'success' : 'warning'}
        loading={atualizarMutation.isPending || deletarMutation.isPending}
      />
    </AppLayout>
  );
}
