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
  Tabs,
  Tab,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Search,
  Add,
  Edit,
  Delete,
  Inventory,
  Category,
  Visibility,
  ContentCopy,
  FileDownload,
  TrendingUp,
  CheckCircle,
  Cancel,
  Palette,
  Label,
} from '@mui/icons-material';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { trpc } from '@/lib/trpc/client';
import { motion } from 'framer-motion';

export default function ProdutosPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [tabAtiva, setTabAtiva] = useState(0);
  
  // Estados de Produtos
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [search, setSearch] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [dialogNovo, setDialogNovo] = useState(false);
  const [dialogEditar, setDialogEditar] = useState(false);
  const [dialogDetalhes, setDialogDetalhes] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<any>(null);
  const [produtoDetalhes, setProdutoDetalhes] = useState<any>(null);
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [ordenacao, setOrdenacao] = useState<'nome' | 'codigo' | 'valor'>('nome');
  
  // Estados de Cores
  const [dialogNovaCor, setDialogNovaCor] = useState(false);
  const [dialogEditarCor, setDialogEditarCor] = useState(false);
  const [corEditando, setCorEditando] = useState<any>(null);
  const [nomeCorForm, setNomeCorForm] = useState('');
  const [descricaoCorForm, setDescricaoCorForm] = useState('');
  
  // Estados de Categorias
  const [dialogNovaCategoria, setDialogNovaCategoria] = useState(false);
  const [dialogEditarCategoria, setDialogEditarCategoria] = useState(false);
  const [categoriaEditando, setCategoriaEditando] = useState<any>(null);
  const [nomeCategoriaForm, setNomeCategoriaForm] = useState('');
  const [descricaoCategoriaForm, setDescricaoCategoriaForm] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });
  
  // Formulário
  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
  const [categoriaFormId, setCategoriaFormId] = useState('');
  const [unidade, setUnidade] = useState('UN');
  const [valorBase, setValorBase] = useState('');
  const [descricao, setDescricao] = useState('');
  const [ativo, setAtivo] = useState(true);

  const { data, isLoading } = trpc.produtos.list.useQuery({
    limit: rowsPerPage,
    offset: page * rowsPerPage,
    search: search || undefined,
    categoriaId: categoriaId || undefined,
  });
  
  // Query para estatísticas gerais
  const { data: stats } = trpc.produtos.stats.useQuery();

  const { data: categorias } = trpc.dominios.categorias.list.useQuery();
  const { data: cores } = trpc.dominios.cores.list.useQuery();
  
  // Mutations
  const utils = trpc.useUtils();
  const criarMutation = trpc.produtos.create.useMutation({
    onSuccess: () => {
      utils.produtos.list.invalidate();
      utils.produtos.stats.invalidate();
    },
  });
  const atualizarMutation = trpc.produtos.update.useMutation({
    onSuccess: () => {
      utils.produtos.list.invalidate();
      utils.produtos.stats.invalidate();
    },
  });
  const deletarMutation = trpc.produtos.delete.useMutation({
    onSuccess: () => {
      utils.produtos.list.invalidate();
      utils.produtos.stats.invalidate();
    },
  });
  
  // Mutations de Cores
  const criarCorMutation = trpc.dominios.cores.create.useMutation({
    onSuccess: () => {
      utils.dominios.cores.list.invalidate();
    },
  });
  const atualizarCorMutation = trpc.dominios.cores.update.useMutation({
    onSuccess: () => {
      utils.dominios.cores.list.invalidate();
    },
  });
  const deletarCorMutation = trpc.dominios.cores.delete.useMutation({
    onSuccess: () => {
      utils.dominios.cores.list.invalidate();
    },
  });
  
  // Mutations de Categorias
  const criarCategoriaMutation = trpc.dominios.categorias.create.useMutation({
    onSuccess: () => {
      utils.dominios.categorias.list.invalidate();
    },
  });
  const atualizarCategoriaMutation = trpc.dominios.categorias.update.useMutation({
    onSuccess: () => {
      utils.dominios.categorias.list.invalidate();
    },
  });
  const deletarCategoriaMutation = trpc.dominios.categorias.delete.useMutation({
    onSuccess: () => {
      utils.dominios.categorias.list.invalidate();
    },
  });

  const produtos = data?.produtos || [];
  const total = data?.total || 0;

  type Produto = typeof produtos[number];

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };
  
  const limparFormulario = () => {
    setNome('');
    setCodigo('');
    setCategoriaFormId('');
    setUnidade('UN');
    setValorBase('');
    setDescricao('');
    setAtivo(true);
  };
  
  const handleNovoProduto = () => {
    limparFormulario();
    setDialogNovo(true);
  };
  
  const handleEditarProduto = (produto: any) => {
    setProdutoEditando(produto);
    setNome(produto.nome);
    setCodigo(produto.codigo || '');
    setCategoriaFormId(produto.categoria_id || '');
    setUnidade(produto.unidade);
    setValorBase(produto.valor_base.toString());
    setDescricao(produto.descricao || '');
    setAtivo(produto.ativo);
    setDialogEditar(true);
  };
  
  const handleVisualizarProduto = (produto: any) => {
    setProdutoDetalhes(produto);
    setDialogDetalhes(true);
  };
  
  const handleDuplicarProduto = async (produto: any) => {
    const toastId = toast.loading('Duplicando produto...');
    
    try {
      await criarMutation.mutateAsync({
        nome: `${produto.nome} (cópia)`,
        codigo: produto.codigo ? `${produto.codigo}-COPY` : undefined,
        categoria_id: produto.categoria_id || undefined,
        unidade: produto.unidade,
        valor_base: produto.valor_base,
        descricao: produto.descricao,
        ativo: true,
      });
      
      toast.success('Produto duplicado com sucesso!', { id: toastId });
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao duplicar produto', { id: toastId });
    }
  };
  
  const handleExportarCSV = () => {
    const csv = [
      ['Código', 'Nome', 'Categoria', 'Unidade', 'Valor Base', 'Status'].join(','),
      ...produtos.map(p => [
        p.codigo || '',
        p.nome,
        categorias?.find((c: any) => c.id === p.categoria_id)?.nome || '',
        p.unidade,
        p.valor_base,
        p.ativo ? 'Ativo' : 'Inativo'
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `produtos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast.success('Produtos exportados com sucesso!');
  };
  
  const handleSalvarNovo = async () => {
    if (!nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (!valorBase || parseFloat(valorBase) < 0) {
      toast.error('Valor base inválido');
      return;
    }
    
    const toastId = toast.loading('Criando produto...');
    
    try {
      await criarMutation.mutateAsync({
        nome: nome.trim(),
        codigo: codigo.trim() || undefined,
        categoria_id: categoriaFormId || undefined,
        unidade: unidade,
        valor_base: parseFloat(valorBase),
        descricao: descricao.trim() || undefined,
        ativo: ativo,
      });
      
      toast.success('Produto criado com sucesso!', { id: toastId });
      setDialogNovo(false);
      limparFormulario();
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao criar produto', { id: toastId });
    }
  };
  
  const handleSalvarEdicao = async () => {
    if (!nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (!valorBase || parseFloat(valorBase) < 0) {
      toast.error('Valor base inválido');
      return;
    }
    
    const toastId = toast.loading('Atualizando produto...');
    
    try {
      await atualizarMutation.mutateAsync({
        id: produtoEditando.id,
        nome: nome.trim(),
        codigo: codigo.trim() || undefined,
        categoria_id: categoriaFormId || undefined,
        unidade: unidade,
        valor_base: parseFloat(valorBase),
        descricao: descricao.trim() || undefined,
        ativo: ativo,
      });
      
      toast.success('Produto atualizado com sucesso!', { id: toastId });
      setDialogEditar(false);
      setProdutoEditando(null);
      limparFormulario();
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao atualizar produto', { id: toastId });
    }
  };
  
  const handleDeletarProduto = (produto: any) => {
    setConfirmDialog({
      open: true,
      title: 'Desativar Produto',
      message: `Tem certeza que deseja desativar o produto "${produto.nome}"? Ele não aparecerá mais nas listagens ativas.`,
      onConfirm: async () => {
        const toastId = toast.loading('Desativando produto...');
        try {
          await deletarMutation.mutateAsync({ id: produto.id });
          toast.success('Produto desativado com sucesso!', { id: toastId });
          setConfirmDialog({ ...confirmDialog, open: false });
        } catch (error: any) {
          toast.error(error?.message || 'Erro ao desativar produto', { id: toastId });
        }
      },
    });
  };

  // Handlers de Cores
  const handleNovaCor = () => {
    setNomeCorForm('');
    setDescricaoCorForm('');
    setDialogNovaCor(true);
  };
  
  const handleEditarCor = (cor: any) => {
    setCorEditando(cor);
    setNomeCorForm(cor.descricao);
    setDescricaoCorForm(cor.linha || '');
    setDialogEditarCor(true);
  };
  
  const handleSalvarNovaCor = async () => {
    if (!nomeCorForm.trim()) {
      toast.error('Nome da cor é obrigatório');
      return;
    }
    
    const toastId = toast.loading('Criando cor...');
    try {
      await criarCorMutation.mutateAsync({
        descricao: nomeCorForm.trim(),
        linha: descricaoCorForm.trim() || undefined,
      });
      toast.success('Cor criada com sucesso!', { id: toastId });
      setDialogNovaCor(false);
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao criar cor', { id: toastId });
    }
  };
  
  const handleSalvarEdicaoCor = async () => {
    if (!nomeCorForm.trim()) {
      toast.error('Nome da cor é obrigatório');
      return;
    }
    
    const toastId = toast.loading('Atualizando cor...');
    try {
      await atualizarCorMutation.mutateAsync({
        id: corEditando.id,
        descricao: nomeCorForm.trim(),
        linha: descricaoCorForm.trim() || undefined,
      });
      toast.success('Cor atualizada com sucesso!', { id: toastId });
      setDialogEditarCor(false);
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao atualizar cor', { id: toastId });
    }
  };
  
  const handleDeletarCor = (cor: any) => {
    setConfirmDialog({
      open: true,
      title: 'Excluir Cor',
      message: `Tem certeza que deseja excluir a cor "${cor.descricao}"?`,
      onConfirm: async () => {
        const toastId = toast.loading('Excluindo cor...');
        try {
          await deletarCorMutation.mutateAsync({ id: cor.id });
          toast.success('Cor excluída com sucesso!', { id: toastId });
          setConfirmDialog({ ...confirmDialog, open: false });
        } catch (error: any) {
          toast.error(error?.message || 'Erro ao excluir cor', { id: toastId });
        }
      },
    });
  };
  
  // Handlers de Categorias
  const handleNovaCategoria = () => {
    setNomeCategoriaForm('');
    setDescricaoCategoriaForm('');
    setDialogNovaCategoria(true);
  };
  
  const handleEditarCategoria = (categoria: any) => {
    setCategoriaEditando(categoria);
    setNomeCategoriaForm(categoria.nome);
    setDescricaoCategoriaForm(categoria.descricao || '');
    setDialogEditarCategoria(true);
  };
  
  const handleSalvarNovaCategoria = async () => {
    if (!nomeCategoriaForm.trim()) {
      toast.error('Nome da categoria é obrigatório');
      return;
    }
    
    const toastId = toast.loading('Criando categoria...');
    try {
      await criarCategoriaMutation.mutateAsync({
        nome: nomeCategoriaForm.trim(),
        descricao: descricaoCategoriaForm.trim() || undefined,
      });
      toast.success('Categoria criada com sucesso!', { id: toastId });
      setDialogNovaCategoria(false);
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao criar categoria', { id: toastId });
    }
  };
  
  const handleSalvarEdicaoCategoria = async () => {
    if (!nomeCategoriaForm.trim()) {
      toast.error('Nome da categoria é obrigatório');
      return;
    }
    
    const toastId = toast.loading('Atualizando categoria...');
    try {
      await atualizarCategoriaMutation.mutateAsync({
        id: categoriaEditando.id,
        nome: nomeCategoriaForm.trim(),
        descricao: descricaoCategoriaForm.trim() || undefined,
      });
      toast.success('Categoria atualizada com sucesso!', { id: toastId });
      setDialogEditarCategoria(false);
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao atualizar categoria', { id: toastId });
    }
  };
  
  const handleDeletarCategoria = (categoria: any) => {
    setConfirmDialog({
      open: true,
      title: 'Excluir Categoria',
      message: `Tem certeza que deseja excluir a categoria "${categoria.nome}"?`,
      onConfirm: async () => {
        const toastId = toast.loading('Excluindo categoria...');
        try {
          await deletarCategoriaMutation.mutateAsync({ id: categoria.id });
          toast.success('Categoria excluída com sucesso!', { id: toastId });
          setConfirmDialog({ ...confirmDialog, open: false });
        } catch (error: any) {
          toast.error(error?.message || 'Erro ao excluir categoria', { id: toastId });
        }
      },
    });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Gerenciamento"
        subtitle="Produtos, Cores e Categorias"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Produtos' },
        ]}
        action={{
          label: tabAtiva === 0 ? 'Novo Produto' : tabAtiva === 1 ? 'Nova Cor' : 'Nova Categoria',
          icon: <Add />,
          onClick: tabAtiva === 0 ? handleNovoProduto : tabAtiva === 1 ? handleNovaCor : handleNovaCategoria,
        }}
      />
      
      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs value={tabAtiva} onChange={(e, newValue) => setTabAtiva(newValue)} sx={{ borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { fontSize: { xs: '0.75rem', sm: '0.875rem' }, minHeight: { xs: 48, sm: 56 } } }}>
          <Tab icon={<Inventory sx={{ fontSize: { xs: 20, sm: 24 } }} />} label={isMobile ? "Produtos" : "Produtos"} iconPosition="start" />
          <Tab icon={<Palette sx={{ fontSize: { xs: 20, sm: 24 } }} />} label={isMobile ? "Cores" : "Cores"} iconPosition="start" />
          <Tab icon={<Label sx={{ fontSize: { xs: 20, sm: 24 } }} />} label={isMobile ? "Categorias" : "Categorias"} iconPosition="start" />
        </Tabs>
      </Card>
      
      {/* Cards de Estatísticas */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'primary.light', color: 'primary.main' }}>
                <Inventory sx={{ fontSize: { xs: 28, sm: 24 } }} />
              </Box>
              <Box>
                <Box sx={{ fontSize: 24, fontWeight: 700 }}>{stats?.total || 0}</Box>
                <Box sx={{ fontSize: 12, color: 'text.secondary' }}>Total de Produtos</Box>
              </Box>
            </Box>
          </Card>
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'success.light', color: 'success.main' }}>
                <CheckCircle sx={{ fontSize: { xs: 28, sm: 24 } }} />
              </Box>
              <Box>
                <Box sx={{ fontSize: 24, fontWeight: 700 }}>
                  {stats?.ativos || 0}
                </Box>
                <Box sx={{ fontSize: 12, color: 'text.secondary' }}>Produtos Ativos</Box>
              </Box>
            </Box>
          </Card>
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'warning.light', color: 'warning.main' }}>
                <Category sx={{ fontSize: { xs: 28, sm: 24 } }} />
              </Box>
              <Box>
                <Box sx={{ fontSize: 24, fontWeight: 700 }}>
                  {categorias?.length || 0}
                </Box>
                <Box sx={{ fontSize: 12, color: 'text.secondary' }}>Categorias</Box>
              </Box>
            </Box>
          </Card>
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'info.light', color: 'info.main' }}>
                <TrendingUp sx={{ fontSize: { xs: 28, sm: 24 } }} />
              </Box>
              <Box>
                <Box sx={{ fontSize: 24, fontWeight: 700 }}>
                  {formatCurrency(stats?.valorMedio || 0)}
                </Box>
                <Box sx={{ fontSize: 12, color: 'text.secondary' }}>Valor Médio</Box>
              </Box>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Conteúdo da Tab de Produtos */}
      {tabAtiva === 0 && (
        <Card>
          {/* Filtros */}
          <Box sx={{ p: { xs: 2, sm: 3 }, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Buscar por nome ou código..."
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
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Categoria</InputLabel>
                <Select
                  value={categoriaId}
                  label="Categoria"
                  onChange={(e) => {
                    setCategoriaId(e.target.value);
                    setPage(0);
                  }}
                >
                  <MenuItem value="">Todas as categorias</MenuItem>
                  {categorias?.map((cat: any) => (
                    <MenuItem key={cat.id} value={cat.id}>
                      {cat.nome}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Tooltip title="Exportar para CSV">
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleExportarCSV}
                    startIcon={<FileDownload />}
                    disabled={produtos.length === 0}
                  >
                    Exportar
                  </Button>
                </Tooltip>
                <Tooltip title={mostrarInativos ? 'Ocultar inativos' : 'Mostrar inativos'}>
                  <Button
                    variant={mostrarInativos ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => setMostrarInativos(!mostrarInativos)}
                    startIcon={mostrarInativos ? <CheckCircle /> : <Cancel />}
                  >
                    {mostrarInativos ? 'Ativos' : 'Todos'}
                  </Button>
                </Tooltip>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Tabela */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : produtos.length === 0 ? (
          <EmptyState
            icon={<Inventory />}
            title="Nenhum produto encontrado"
            description={
              search || categoriaId
                ? 'Tente ajustar os filtros de busca'
                : 'Cadastre seu primeiro produto para começar'
            }
            action={
              !search && !categoriaId
                ? {
                    label: 'Cadastrar Produto',
                    onClick: handleNovoProduto,
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
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Código</TableCell>
                    <TableCell>Produto</TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Categoria</TableCell>
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Unidade</TableCell>
                    <TableCell align="right">Valor Base</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="right">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {produtos.map((produto: any, index) => (
                    <TableRow
                      key={produto.id}
                      component={motion.tr}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      hover
                      onClick={() => handleVisualizarProduto(produto)}
                      sx={{
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          bgcolor: 'action.hover',
                          transform: 'scale(1.01)',
                        }
                      }}
                    >
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                        <Chip
                          label={produto.codigo || 'S/Cód'}
                          size="small"
                          variant="outlined"
                          sx={{ fontFamily: 'monospace' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ fontWeight: 600 }}>{produto.nome}</Box>
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Category fontSize="small" color="action" />
                          {categorias?.find((c: any) => c.id === produto.categoria_id)?.nome || '-'}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>{produto.unidade}</TableCell>
                      <TableCell align="right">
                        <Box sx={{ fontWeight: 600, color: 'primary.main' }}>
                          {formatCurrency(produto.valor_base)}
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={produto.ativo ? 'Ativo' : 'Inativo'}
                          size="small"
                          color={produto.ativo ? 'success' : 'default'}
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>
                          <Tooltip title="Visualizar">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVisualizarProduto(produto);
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
                              handleEditarProduto(produto);
                            }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Duplicar">
                          <IconButton
                            size="small"
                            color="info"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicarProduto(produto);
                            }}
                          >
                            <ContentCopy fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Desativar">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletarProduto(produto);
                            }}
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
      )}
      
      {/* Conteúdo da Tab de Cores */}
      {tabAtiva === 1 && (
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Cor</TableCell>
                  <TableCell>Linha</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cores?.map((cor: any) => (
                  <TableRow key={cor.id}>
                    <TableCell>
                      <Box sx={{ fontWeight: 600 }}>{cor.descricao}</Box>
                    </TableCell>
                    <TableCell>{cor.linha || '-'}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => handleEditarCor(cor)}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir">
                        <IconButton size="small" color="error" onClick={() => handleDeletarCor(cor)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {(!cores || cores.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ py: 8 }}>
                      <EmptyState
                        icon={<Palette />}
                        title="Nenhuma cor cadastrada"
                        description="Cadastre cores para usar nos produtos"
                        action={{ label: 'Cadastrar Cor', onClick: handleNovaCor }}
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
      
      {/* Conteúdo da Tab de Categorias */}
      {tabAtiva === 2 && (
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Categoria</TableCell>
                  <TableCell>Descrição</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {categorias?.map((categoria: any) => (
                  <TableRow key={categoria.id}>
                    <TableCell>
                      <Box sx={{ fontWeight: 600 }}>{categoria.nome}</Box>
                    </TableCell>
                    <TableCell>{categoria.descricao || '-'}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => handleEditarCategoria(categoria)}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir">
                        <IconButton size="small" color="error" onClick={() => handleDeletarCategoria(categoria)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {(!categorias || categorias.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ py: 8 }}>
                      <EmptyState
                        icon={<Label />}
                        title="Nenhuma categoria cadastrada"
                        description="Cadastre categorias para organizar seus produtos"
                        action={{ label: 'Cadastrar Categoria', onClick: handleNovaCategoria }}
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
      
      {/* Dialog Novo Produto */}
      <Dialog open={dialogNovo} onClose={() => setDialogNovo(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Novo Produto</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Nome do Produto"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              fullWidth
              required
              autoFocus
            />
            <TextField
              label="Código"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              fullWidth
              placeholder="Ex: PROD001"
            />
            <FormControl fullWidth>
              <InputLabel>Categoria</InputLabel>
              <Select
                value={categoriaFormId}
                label="Categoria"
                onChange={(e) => setCategoriaFormId(e.target.value)}
              >
                <MenuItem value="">Nenhuma</MenuItem>
                {categorias?.map((cat: any) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Unidade"
              value={unidade}
              onChange={(e) => setUnidade(e.target.value)}
              fullWidth
              placeholder="Ex: UN, KG, MT"
            />
            <TextField
              label="Valor Base"
              value={valorBase}
              onChange={(e) => setValorBase(e.target.value)}
              fullWidth
              required
              type="number"
              InputProps={{
                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
              }}
            />
            <TextField
              label="Descrição"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              fullWidth
              multiline
              rows={3}
              placeholder="Informações adicionais sobre o produto..."
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={ativo ? 'true' : 'false'}
                label="Status"
                onChange={(e) => setAtivo(e.target.value === 'true')}
              >
                <MenuItem value="true">Ativo</MenuItem>
                <MenuItem value="false">Inativo</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogNovo(false)}>Cancelar</Button>
          <Button onClick={handleSalvarNovo} variant="contained" disabled={criarMutation.isPending}>
            {criarMutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Dialog Editar Produto */}
      <Dialog open={dialogEditar} onClose={() => setDialogEditar(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Produto</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Nome do Produto"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              fullWidth
              required
              autoFocus
            />
            <TextField
              label="Código"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              fullWidth
              placeholder="Ex: PROD001"
            />
            <FormControl fullWidth>
              <InputLabel>Categoria</InputLabel>
              <Select
                value={categoriaFormId}
                label="Categoria"
                onChange={(e) => setCategoriaFormId(e.target.value)}
              >
                <MenuItem value="">Nenhuma</MenuItem>
                {categorias?.map((cat: any) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Unidade"
              value={unidade}
              onChange={(e) => setUnidade(e.target.value)}
              fullWidth
              placeholder="Ex: UN, KG, MT"
            />
            <TextField
              label="Valor Base"
              value={valorBase}
              onChange={(e) => setValorBase(e.target.value)}
              fullWidth
              required
              type="number"
              InputProps={{
                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
              }}
            />
            <TextField
              label="Descrição"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              fullWidth
              multiline
              rows={3}
              placeholder="Informações adicionais sobre o produto..."
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={ativo ? 'true' : 'false'}
                label="Status"
                onChange={(e) => setAtivo(e.target.value === 'true')}
              >
                <MenuItem value="true">Ativo</MenuItem>
                <MenuItem value="false">Inativo</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogEditar(false)}>Cancelar</Button>
          <Button onClick={handleSalvarEdicao} variant="contained" disabled={atualizarMutation.isPending}>
            {atualizarMutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Dialog Detalhes do Produto */}
      <Dialog open={dialogDetalhes} onClose={() => setDialogDetalhes(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Detalhes do Produto</DialogTitle>
        <DialogContent>
          {produtoDetalhes && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box sx={{ mb: 2, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ fontSize: 20, fontWeight: 700, mb: 1 }}>
                      {produtoDetalhes.nome}
                    </Box>
                    <Chip
                      label={produtoDetalhes.ativo ? 'Ativo' : 'Inativo'}
                      color={produtoDetalhes.ativo ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ color: 'text.secondary', fontSize: 12, mb: 0.5 }}>Código</Box>
                  <Box sx={{ fontWeight: 600 }}>{produtoDetalhes.codigo || '-'}</Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ color: 'text.secondary', fontSize: 12, mb: 0.5 }}>Categoria</Box>
                  <Box sx={{ fontWeight: 600 }}>{categorias?.find((c: any) => c.id === produtoDetalhes.categoria_id)?.nome || '-'}</Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ color: 'text.secondary', fontSize: 12, mb: 0.5 }}>Unidade</Box>
                  <Box sx={{ fontWeight: 600 }}>{produtoDetalhes.unidade}</Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ color: 'text.secondary', fontSize: 12, mb: 0.5 }}>Valor Base</Box>
                  <Box sx={{ fontWeight: 700, color: 'primary.main', fontSize: 18 }}>
                    {formatCurrency(produtoDetalhes.valor_base)}
                  </Box>
                </Grid>
                {produtoDetalhes.descricao && (
                  <Grid item xs={12}>
                    <Box sx={{ color: 'text.secondary', fontSize: 12, mb: 0.5 }}>Descrição</Box>
                    <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, fontSize: 14 }}>
                      {produtoDetalhes.descricao}
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
              handleEditarProduto(produtoDetalhes);
            }}
            variant="contained"
            startIcon={<Edit />}
          >
            Editar
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Dialog Nova Cor */}
      <Dialog open={dialogNovaCor} onClose={() => setDialogNovaCor(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nova Cor</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Nome da Cor"
              value={nomeCorForm}
              onChange={(e) => setNomeCorForm(e.target.value)}
              fullWidth
              required
              autoFocus
              placeholder="Ex: Azul, Vermelho, Verde"
            />
            <TextField
              label="Linha"
              value={descricaoCorForm}
              onChange={(e) => setDescricaoCorForm(e.target.value)}
              fullWidth
              placeholder="Ex: Linha especial, Linha básica (opcional)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogNovaCor(false)}>Cancelar</Button>
          <Button onClick={handleSalvarNovaCor} variant="contained" disabled={criarCorMutation.isPending}>
            {criarCorMutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Dialog Editar Cor */}
      <Dialog open={dialogEditarCor} onClose={() => setDialogEditarCor(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Cor</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Nome da Cor"
              value={nomeCorForm}
              onChange={(e) => setNomeCorForm(e.target.value)}
              fullWidth
              required
              autoFocus
              placeholder="Ex: Azul, Vermelho, Verde"
            />
            <TextField
              label="Linha"
              value={descricaoCorForm}
              onChange={(e) => setDescricaoCorForm(e.target.value)}
              fullWidth
              placeholder="Ex: Linha especial, Linha básica (opcional)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogEditarCor(false)}>Cancelar</Button>
          <Button onClick={handleSalvarEdicaoCor} variant="contained" disabled={atualizarCorMutation.isPending}>
            {atualizarCorMutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Dialog Nova Categoria */}
      <Dialog open={dialogNovaCategoria} onClose={() => setDialogNovaCategoria(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nova Categoria</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Nome da Categoria"
              value={nomeCategoriaForm}
              onChange={(e) => setNomeCategoriaForm(e.target.value)}
              fullWidth
              required
              autoFocus
              placeholder="Ex: Móveis, Eletrônicos, Roupas"
            />
            <TextField
              label="Tipo/Descrição"
              value={descricaoCategoriaForm}
              onChange={(e) => setDescricaoCategoriaForm(e.target.value)}
              fullWidth
              placeholder="Ex: Categoria principal, Subcategoria (opcional)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogNovaCategoria(false)}>Cancelar</Button>
          <Button onClick={handleSalvarNovaCategoria} variant="contained" disabled={criarCategoriaMutation.isPending}>
            {criarCategoriaMutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Dialog Editar Categoria */}
      <Dialog open={dialogEditarCategoria} onClose={() => setDialogEditarCategoria(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Categoria</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Nome da Categoria"
              value={nomeCategoriaForm}
              onChange={(e) => setNomeCategoriaForm(e.target.value)}
              fullWidth
              required
              autoFocus
              placeholder="Ex: Móveis, Eletrônicos, Roupas"
            />
            <TextField
              label="Tipo/Descrição"
              value={descricaoCategoriaForm}
              onChange={(e) => setDescricaoCategoriaForm(e.target.value)}
              fullWidth
              placeholder="Ex: Categoria principal, Subcategoria (opcional)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogEditarCategoria(false)}>Cancelar</Button>
          <Button onClick={handleSalvarEdicaoCategoria} variant="contained" disabled={atualizarCategoriaMutation.isPending}>
            {atualizarCategoriaMutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
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
