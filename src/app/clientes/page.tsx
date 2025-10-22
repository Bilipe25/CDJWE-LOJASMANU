'use client';

import { useState } from 'react';
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
  Email,
  History,
  OpenInNew,
} from '@mui/icons-material';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { trpc } from '@/lib/trpc/client';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function ClientesPage() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [search, setSearch] = useState('');
  
  // Dialogs
  const [dialogNovo, setDialogNovo] = useState(false);
  const [dialogEditar, setDialogEditar] = useState(false);
  const [dialogDetalhes, setDialogDetalhes] = useState(false);
  const [dialogHistorico, setDialogHistorico] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<any>(null);
  const [clienteDetalhes, setClienteDetalhes] = useState<any>(null);
  const [clienteHistorico, setClienteHistorico] = useState<any>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });
  
  // Formulário
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [ativo, setAtivo] = useState(true);
  
  // Campos de endereço
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [cep, setCep] = useState('');

  const { data, isLoading } = trpc.clientes.list.useQuery({
    limit: rowsPerPage,
    offset: page * rowsPerPage,
    search: search || undefined,
  });
  
  // Query para estatísticas
  const { data: stats } = trpc.clientes.stats.useQuery();
  
  // Query para pedidos do cliente (só busca quando dialog está aberto)
  const { data: pedidosCliente, isLoading: loadingPedidos } = trpc.pedidos.listByCliente.useQuery(
    { clienteId: clienteHistorico?.id || '' },
    { enabled: !!clienteHistorico?.id && dialogHistorico }
  );

  const clientes = data?.clientes || [];
  const total = data?.total || 0;
  
  // Mutations
  const utils = trpc.useUtils();
  const criarMutation = trpc.clientes.create.useMutation({
    onSuccess: () => {
      utils.clientes.list.invalidate();
      utils.clientes.stats.invalidate();
    },
  });
  const atualizarMutation = trpc.clientes.update.useMutation({
    onSuccess: () => {
      utils.clientes.list.invalidate();
      utils.clientes.stats.invalidate();
    },
  });
  const deletarMutation = trpc.clientes.delete.useMutation({
    onSuccess: () => {
      utils.clientes.list.invalidate();
      utils.clientes.stats.invalidate();
    },
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
    setLogradouro('');
    setNumero('');
    setComplemento('');
    setBairro('');
    setCidade('');
    setEstado('');
    setCep('');
  };
  
  const handleNovoCliente = () => {
    limparFormulario();
    setDialogNovo(true);
  };
  
  const handleEditarCliente = (cliente: any) => {
    setClienteEditando(cliente);
    setNome(cliente.nome);
    setCpf(cliente.cpf || '');
    setTelefone(cliente.telefone || '');
    setEmail(cliente.email || '');
    setAtivo(cliente.ativo);
    
    // Buscar endereço do cliente via query separada
    buscarEnderecoCliente(cliente.id);
    
    setDialogEditar(true);
  };
  
  const buscarEnderecoCliente = async (clienteId: string) => {
    try {
      const clienteCompleto = await utils.clientes.getById.fetch({ id: clienteId });
      if (clienteCompleto?.enderecos && Array.isArray(clienteCompleto.enderecos) && clienteCompleto.enderecos.length > 0) {
        // Usar type assertion para garantir que TypeScript reconheça todos os campos
        const endereco: any = clienteCompleto.enderecos.find((e: any) => e.principal) || clienteCompleto.enderecos[0];
        setLogradouro(endereco?.logradouro || '');
        setNumero(endereco?.numero || '');
        setComplemento(endereco?.complemento || '');
        setBairro(endereco?.bairro || '');
        setCidade(endereco?.cidade || '');
        setEstado(endereco?.estado || '');
        setCep(endereco?.cep || '');
      } else {
        // Limpa campos de endereço se não houver endereços
        setLogradouro('');
        setNumero('');
        setComplemento('');
        setBairro('');
        setCidade('');
        setEstado('');
        setCep('');
      }
    } catch (error) {
      console.error('Erro ao buscar endereço:', error);
      // Limpa campos de endereço em caso de erro
      setLogradouro('');
      setNumero('');
      setComplemento('');
      setBairro('');
      setCidade('');
      setEstado('');
      setCep('');
    }
  };
  
  const handleVisualizarCliente = (cliente: any) => {
    setClienteDetalhes(cliente);
    setDialogDetalhes(true);
  };
  
  const handleHistoricoPedidos = (cliente: any) => {
    setClienteHistorico(cliente);
    setDialogHistorico(true);
  };
  
  const handleVerPedido = (pedidoId: string) => {
    router.push(`/pedidos?id=${pedidoId}`);
  };
  
  const handleSalvarNovo = async () => {
    if (!nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    
    const toastId = toast.loading('Criando cliente...');
    try {
      await criarMutation.mutateAsync({
        nome: nome.trim(),
        cpf: cpf.trim() || undefined,
        telefone: telefone.trim() || undefined,
        email: email.trim() || undefined,
        ativo: ativo,
      });
      
      toast.success('Cliente criado com sucesso!', { id: toastId });
      setDialogNovo(false);
      limparFormulario();
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao criar cliente', { id: toastId });
    }
  };
  
  const handleSalvarEdicao = async () => {
    if (!nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    
    const toastId = toast.loading('Atualizando cliente...');
    try {
      const updateData: any = {
        id: clienteEditando.id,
        nome: nome.trim(),
        cpf: cpf.trim() || undefined,
        telefone: telefone.trim() || undefined,
        email: email.trim() || undefined,
        ativo: ativo,
      };
      
      // Adicionar endereço se houver dados preenchidos
      if (logradouro.trim()) {
        updateData.endereco = {
          logradouro: logradouro.trim(),
          numero: numero.trim() || undefined,
          complemento: complemento.trim() || undefined,
          bairro: bairro.trim() || undefined,
          cidade: cidade.trim() || undefined,
          estado: estado.trim() || undefined,
          cep: cep.trim() || undefined,
          principal: true,
        };
      }
      
      await atualizarMutation.mutateAsync(updateData);
      
      toast.success('Cliente atualizado com sucesso!', { id: toastId });
      setDialogEditar(false);
      setClienteEditando(null);
      limparFormulario();
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao atualizar cliente', { id: toastId });
    }
  };
  
  const handleDeletarCliente = (cliente: any) => {
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
        } catch (error: any) {
          toast.error(error?.message || 'Erro ao desativar cliente', { id: toastId });
        }
      },
    });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Clientes"
        subtitle={`${total} clientes cadastrados`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Clientes' },
        ]}
        action={{
          label: 'Novo Cliente',
          icon: <Add />,
          onClick: handleNovoCliente,
        }}
      />
      
      {/* Cards de Estatísticas */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'primary.light', color: 'primary.main' }}>
                <Person />
              </Box>
              <Box>
                <Box sx={{ fontSize: 24, fontWeight: 700 }}>{stats?.total || 0}</Box>
                <Box sx={{ fontSize: 12, color: 'text.secondary' }}>Total de Clientes</Box>
              </Box>
            </Box>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'success.light', color: 'success.main' }}>
                <CheckCircle />
              </Box>
              <Box>
                <Box sx={{ fontSize: 24, fontWeight: 700 }}>
                  {stats?.ativos || 0}
                </Box>
                <Box sx={{ fontSize: 12, color: 'text.secondary' }}>Clientes Ativos</Box>
              </Box>
            </Box>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'warning.light', color: 'warning.main' }}>
                <ShoppingCart />
              </Box>
              <Box>
                <Box sx={{ fontSize: 24, fontWeight: 700 }}>
                  {stats?.totalPedidos || 0}
                </Box>
                <Box sx={{ fontSize: 12, color: 'text.secondary' }}>Total de Pedidos</Box>
              </Box>
            </Box>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'info.light', color: 'info.main' }}>
                <TrendingUp />
              </Box>
              <Box>
                <Box sx={{ fontSize: 24, fontWeight: 700 }}>
                  {formatCurrency(stats?.valorTotalCompras || 0)}
                </Box>
                <Box sx={{ fontSize: 12, color: 'text.secondary' }}>Total em Compras</Box>
              </Box>
            </Box>
          </Card>
        </Grid>
      </Grid>

      <Card>
        {/* Barra de Pesquisa */}
        <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
          <TextField
            fullWidth
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

        {/* Tabela */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : clientes.length === 0 ? (
          <EmptyState
            icon={<Person />}
            title="Nenhum cliente encontrado"
            description={
              search
                ? 'Tente buscar com outros termos'
                : 'Cadastre seu primeiro cliente para começar'
            }
            action={
              !search
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
                  {clientes.map((cliente: any, index) => (
                    <TableRow
                      key={cliente.id}
                      component={motion.tr}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      hover
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
                            {cliente.endereco_principal_logradouro || '-'}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                        <Box sx={{ fontWeight: 600, color: 'success.main' }}>
                          {formatCurrency(cliente.valor_total_compras)}
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={cliente.ativo ? 'Ativo' : 'Inativo'}
                          size="small"
                          color={cliente.ativo ? 'success' : 'default'}
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Histórico de Pedidos">
                          <IconButton
                            size="small"
                            color="info"
                            onClick={() => handleHistoricoPedidos(cliente)}
                          >
                            <History fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Visualizar">
                          <IconButton
                            size="small"
                            onClick={() => handleVisualizarCliente(cliente)}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Editar">
                          <IconButton
                            size="small"
                            onClick={() => handleEditarCliente(cliente)}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Desativar">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeletarCliente(cliente)}
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
              rowsPerPageOptions={[5, 10, 25, 50]}
              labelRowsPerPage="Linhas por página:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
            />
          </>
        )}
      </Card>
      
      {/* Dialog Novo Cliente */}
      <Dialog open={dialogNovo} onClose={() => setDialogNovo(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Novo Cliente</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Nome Completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              fullWidth
              required
              autoFocus
              placeholder="Ex: João Silva"
            />
            <TextField
              label="CPF"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              fullWidth
              placeholder="000.000.000-00"
            />
            <TextField
              label="Telefone"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              fullWidth
              placeholder="(00) 00000-0000"
            />
            <TextField
              label="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              type="email"
              placeholder="email@exemplo.com"
            />
            <FormControlLabel
              control={<Switch checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />}
              label="Cliente Ativo"
            />
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
      <Dialog open={dialogEditar} onClose={() => setDialogEditar(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Cliente</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Nome Completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              fullWidth
              required
              autoFocus
              placeholder="Ex: João Silva"
            />
            <TextField
              label="CPF"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              fullWidth
              placeholder="000.000.000-00"
            />
            <TextField
              label="Telefone"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              fullWidth
              placeholder="(00) 00000-0000"
            />
            <TextField
              label="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              type="email"
              placeholder="email@exemplo.com"
            />
            <FormControlLabel
              control={<Switch checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />}
              label="Cliente Ativo"
            />
            
            <Divider sx={{ my: 2 }}>
              <Chip label="Endereço" size="small" />
            </Divider>
            
            <TextField
              label="Logradouro"
              value={logradouro}
              onChange={(e) => setLogradouro(e.target.value)}
              fullWidth
              placeholder="Ex: Rua das Flores"
            />
            
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <TextField
                  label="Número"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  fullWidth
                  placeholder="123"
                />
              </Grid>
              <Grid item xs={8}>
                <TextField
                  label="Complemento"
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                  fullWidth
                  placeholder="Apto 45"
                />
              </Grid>
            </Grid>
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Bairro"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  fullWidth
                  placeholder="Centro"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="CEP"
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  fullWidth
                  placeholder="00000-000"
                />
              </Grid>
            </Grid>
            
            <Grid container spacing={2}>
              <Grid item xs={8}>
                <TextField
                  label="Cidade"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  fullWidth
                  placeholder="São Paulo"
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="Estado"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  fullWidth
                  placeholder="SP"
                  inputProps={{ maxLength: 2 }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogEditar(false)}>Cancelar</Button>
          <Button onClick={handleSalvarEdicao} variant="contained" disabled={atualizarMutation.isPending}>
            {atualizarMutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Dialog Detalhes do Cliente */}
      <Dialog open={dialogDetalhes} onClose={() => setDialogDetalhes(false)} maxWidth="sm" fullWidth>
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
                {clienteDetalhes.endereco_principal_logradouro && (
                  <Grid item xs={12}>
                    <Box sx={{ color: 'text.secondary', fontSize: 12, mb: 0.5 }}>Endereço Principal</Box>
                    <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, fontSize: 14 }}>
                      {clienteDetalhes.endereco_principal_logradouro}
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
              handleEditarCliente(clienteDetalhes);
            }}
            variant="contained"
            startIcon={<Edit />}
          >
            Editar
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Dialog Histórico de Pedidos */}
      <Dialog open={dialogHistorico} onClose={() => setDialogHistorico(false)} maxWidth="md" fullWidth>
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
          ) : !pedidosCliente || pedidosCliente.length === 0 ? (
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
                  {pedidosCliente.map((pedido: any) => (
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
          <Button onClick={() => setDialogHistorico(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
      
      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
        onConfirm={confirmDialog.onConfirm}
        confirmText="Desativar"
        cancelText="Cancelar"
        severity="warning"
      />
    </AppLayout>
  );
}
