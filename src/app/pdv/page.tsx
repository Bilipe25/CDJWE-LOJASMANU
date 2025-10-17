'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { dateToString } from '@/lib/utils/dateUtils';
import {
  Box,
  Card,
  Grid,
  TextField,
  Button,
  Typography,
  IconButton,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Autocomplete,
  InputAdornment,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  Alert,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Add,
  Remove,
  Delete,
  ShoppingCart,
  Person,
  Receipt,
  Clear,
  Check,
  Search,
  Edit,
  Percent,
  Palette,
  AttachMoney,
  ExpandMore,
  LocationOn,
  Payment,
  Phone,
  Notes,
  Category,
  PersonAdd,
  Print,
  Download,
  ContentCopy,
} from '@mui/icons-material';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import { trpc } from '@/lib/trpc/client';
import { usePDVStore } from '@/stores/pdv-store';
import { motion, AnimatePresence } from 'framer-motion';
import { gerarPedidoPDF } from '@/lib/pdf/pedido-pdf';

function PDVPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pedidoEditId = searchParams.get('edit');
  const [modoEdicao, setModoEdicao] = useState(false);
  const [pedidoOriginalId, setPedidoOriginalId] = useState<string | null>(null);

  const [produtoSelecionado, setProdutoSelecionado] = useState<any>(null);
  const [quantidade, setQuantidade] = useState(1);
  const [valorUnitario, setValorUnitario] = useState(0);
  const [descontoItem, setDescontoItem] = useState(0);
  const [corSelecionada, setCorSelecionada] = useState<any>(null);
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);
  const [searchProduto, setSearchProduto] = useState('');
  const [searchCliente, setSearchCliente] = useState('');
  const [dialogFinalizar, setDialogFinalizar] = useState(false);
  const [editandoItem, setEditandoItem] = useState<number | null>(null);
  const [descontoGeral, setDescontoGeral] = useState(0);
  const [tipoDescontoGeral, setTipoDescontoGeral] = useState<'valor' | 'percentual'>('valor');
  
  // Novos campos da venda
  const [enderecoSelecionado, setEnderecoSelecionado] = useState<any>(null);
  const [formaPagamentoId, setFormaPagamentoId] = useState('');
  const [tipoAtendimentoId, setTipoAtendimentoId] = useState('');
  const [telefoneContato, setTelefoneContato] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [dialogNovoCliente, setDialogNovoCliente] = useState(false);
  const [novoClienteNome, setNovoClienteNome] = useState('');
  const [novoClienteCPF, setNovoClienteCPF] = useState('');
  const [novoClienteTelefone, setNovoClienteTelefone] = useState('');
  const [novoClienteEndereco, setNovoClienteEndereco] = useState('');
  const [accordionExpandido, setAccordionExpandido] = useState<string | false>('cliente');

  const { data: produtos } = trpc.produtos.list.useQuery({
    limit: 100,
    offset: 0,
    search: searchProduto || undefined,
  });

  const { data: clientes } = trpc.clientes.list.useQuery({
    limit: 100,
    offset: 0,
    search: searchCliente || undefined,
  });

  const { data: tiposAtendimento } = trpc.dominios.tiposAtendimento.list.useQuery();
  const { data: formasPagamento } = trpc.dominios.formasPagamento.list.useQuery();
  const { data: cores } = trpc.dominios.cores.list.useQuery();
  
  // Buscar endereços do cliente
  const { data: clienteCompleto } = trpc.clientes.getById.useQuery(
    { id: clienteSelecionado?.id || '' },
    { enabled: !!clienteSelecionado?.id }
  );

  // Buscar pedido para edição
  const { data: pedidoParaEditar, isLoading: loadingPedido } = trpc.pedidos.getById.useQuery(
    { id: pedidoEditId || '' },
    { enabled: !!pedidoEditId }
  );
  
  // Mutations
  const criarClienteMutation = trpc.clientes.create.useMutation();
  const criarPedidoMutation = trpc.pedidos.create.useMutation();
  const atualizarPedidoMutation = trpc.pedidos.update.useMutation();
  const adicionarItemMutation = trpc.pedidos.addItem.useMutation();
  const removerItemMutation = trpc.pedidos.removeItem.useMutation();
  
  // Hook para buscar configurações
  const { data: configuracoes } = trpc.configuracoes.get.useQuery();

  const {
    pedidoAtual,
    adicionarItem,
    atualizarItem,
    removerItem,
    limparCarrinho,
    setPedidoAtual,
    novoPedido,
  } = usePDVStore();

  // useEffect para carregar dados do pedido em modo edição
  useEffect(() => {
    if (pedidoEditId && pedidoParaEditar && !modoEdicao && clientes && produtos) {
      setModoEdicao(true);
      setPedidoOriginalId(pedidoEditId);
      
      // Buscar e carregar cliente
      if (pedidoParaEditar.cliente_id) {
        const cliente = clientes?.clientes?.find((c: any) => c.id === pedidoParaEditar.cliente_id);
        if (cliente) {
          setClienteSelecionado(cliente);
          setSearchCliente(cliente.nome || '');
        } else {
          // Se não encontrou na lista, usar os dados que vêm do pedido
          if (pedidoParaEditar.cliente_nome) {
            setClienteSelecionado({
              id: pedidoParaEditar.cliente_id,
              nome: pedidoParaEditar.cliente_nome,
              cpf: pedidoParaEditar.cliente_cpf,
              telefone: pedidoParaEditar.cliente_telefone,
            });
            setSearchCliente(pedidoParaEditar.cliente_nome);
          }
        }
      }
      
      // Buscar e carregar endereço se houver
      if (pedidoParaEditar.endereco_id && clienteCompleto?.enderecos) {
        const endereco = (clienteCompleto.enderecos as any[]).find((e: any) => e.id === pedidoParaEditar.endereco_id);
        if (endereco) {
          setEnderecoSelecionado(endereco);
        }
      }
      
      // Preencher campos
      setTipoAtendimentoId(pedidoParaEditar.tipo_atendimento_id || '');
      setFormaPagamentoId(pedidoParaEditar.forma_pagamento_id || '');
      setTelefoneContato((pedidoParaEditar as any).telefone_contato || '');
      setObservacoes(pedidoParaEditar.observacao || '');
      setDescontoGeral(pedidoParaEditar.desconto_valor || 0);
      
      // Carregar itens do pedido
      if (pedidoParaEditar.itens && Array.isArray(pedidoParaEditar.itens)) {
        limparCarrinho();
        pedidoParaEditar.itens.forEach((item: any) => {
          adicionarItem({
            produto_id: item.produto_id,
            produto_nome: item.produto_nome || 'Produto', // Vem da view vw_itens_pedido_completos
            produto_codigo: item.produto_codigo || '', // Vem da view vw_itens_pedido_completos
            cor_id: item.cor_id,
            cor_descricao: item.cor_descricao || '', // Vem da view vw_itens_pedido_completos
            quantidade: item.quantidade,
            valor_unitario: item.valor_unitario,
            desconto_valor: item.desconto_valor || 0,
          });
        });
      }
      
      toast.success(`Editando pedido #${pedidoParaEditar.numero}`);
    }
  }, [pedidoEditId, pedidoParaEditar, modoEdicao, clientes, produtos, clienteCompleto]);

  // useEffect para atalhos de teclado
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Enter - Adicionar produto se estiver selecionado
      if (e.key === 'Enter' && produtoSelecionado && !dialogFinalizar && !dialogNovoCliente) {
        e.preventDefault();
        handleAdicionarProduto();
      }
      
      // Esc - Limpar seleção
      if (e.key === 'Escape' && produtoSelecionado) {
        setProdutoSelecionado(null);
        setQuantidade(1);
        setValorUnitario(0);
        setDescontoItem(0);
        setCorSelecionada(null);
        toast('Seleção cancelada', { icon: '❌' });
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [produtoSelecionado, dialogFinalizar, dialogNovoCliente, quantidade]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleAdicionarProduto = () => {
    if (!produtoSelecionado || quantidade <= 0) return;

    adicionarItem({
      produto_id: produtoSelecionado.id,
      produto_nome: produtoSelecionado.nome,
      produto_codigo: produtoSelecionado.codigo,
      cor_id: corSelecionada?.id,
      cor_descricao: corSelecionada?.descricao,
      quantidade,
      valor_unitario: valorUnitario > 0 ? valorUnitario : produtoSelecionado.valor_base,
      desconto_valor: descontoItem,
    });

    // Toast de sucesso
    toast.success(
      `${produtoSelecionado.nome} adicionado! (${quantidade}x)`,
      { duration: 2000 }
    );

    // Limpar campos
    setProdutoSelecionado(null);
    setQuantidade(1);
    setValorUnitario(0);
    setDescontoItem(0);
    setCorSelecionada(null);
  };

  // Atualizar valor unitário quando selecionar produto
  const handleSelecionarProduto = (produto: any) => {
    setProdutoSelecionado(produto);
    setValorUnitario(produto?.valor_base || 0);
    setDescontoItem(0);
    setCorSelecionada(null);
  };

  // Aplicar desconto geral
  const handleAplicarDescontoGeral = () => {
    let valorDesconto = descontoGeral;
    
    if (tipoDescontoGeral === 'percentual') {
      valorDesconto = (pedidoAtual.subtotal * descontoGeral) / 100;
    }

    setPedidoAtual({ desconto_valor: valorDesconto });
  };

  // Duplicar linha do carrinho
  const handleDuplicarLinha = (index: number) => {
    const item = pedidoAtual.itens[index];
    adicionarItem({ ...item });
    toast.success('Item duplicado!', { duration: 2000 });
  };

  // Limpar carrinho com confirmação
  const handleLimparCarrinho = () => {
    if (pedidoAtual.itens.length === 0) {
      toast.error('Carrinho já está vazio');
      return;
    }
    
    if (window.confirm(`Deseja realmente limpar o carrinho?\n${pedidoAtual.itens.length} itens serão removidos.`)) {
      limparCarrinho();
      toast.success('Carrinho limpo!');
    }
  };

  const handleFinalizarPedido = () => {
    if (pedidoAtual.itens.length === 0) {
      toast.error('Adicione pelo menos um item ao pedido');
      return;
    }
    
    if (!tipoAtendimentoId) {
      toast.error('Selecione o Tipo de Atendimento');
      setAccordionExpandido('atendimento');
      return;
    }
    
    if (!formaPagamentoId) {
      toast.error('Selecione a Forma de Pagamento');
      setAccordionExpandido('atendimento');
      return;
    }
    
    setDialogFinalizar(true);
  };

  const handleConfirmarPedido = async () => {
    const toastId = toast.loading(modoEdicao ? 'Atualizando pedido...' : 'Salvando pedido...');
    
    try {
      // Mapear itens do pedido para o formato do backend
      const itens = pedidoAtual.itens.map((item, index) => ({
        produto_id: item.produto_id,
        cor_id: item.cor_id || undefined,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario,
        desconto_valor: item.desconto_valor || 0,
        ordem: index,
      }));

      if (modoEdicao && pedidoOriginalId) {
        // Atualizar pedido existente
        // 1. Remover todos os itens antigos do pedido
        if (pedidoParaEditar?.itens && Array.isArray(pedidoParaEditar.itens)) {
          for (const item of pedidoParaEditar.itens) {
            if (item.id) {
              await removerItemMutation.mutateAsync({ id: item.id });
            }
          }
        }

        // 2. Adicionar os novos itens
        for (const item of itens) {
          await adicionarItemMutation.mutateAsync({
            pedido_id: pedidoOriginalId,
            item: {
              produto_id: item.produto_id,
              quantidade: item.quantidade,
              valor_unitario: item.valor_unitario,
              cor_id: item.cor_id,
              desconto_valor: item.desconto_valor,
              ordem: item.ordem,
            },
          });
        }

        // 3. Atualizar dados principais do pedido
        await atualizarPedidoMutation.mutateAsync({
          id: pedidoOriginalId,
          cliente_id: clienteSelecionado?.id,
          endereco_id: enderecoSelecionado?.id,
          tipo_atendimento_id: tipoAtendimentoId,
          forma_pagamento_id: formaPagamentoId || undefined,
          telefone_contato: telefoneContato || undefined,
          desconto_valor: pedidoAtual.desconto_valor,
          observacao: observacoes || undefined,
        });
        
        toast.success('Pedido atualizado com sucesso!', { id: toastId });
        setDialogFinalizar(false);
        router.push('/pedidos');
      } else {
        // Criar pedido novo
        const pedidoCriado = await criarPedidoMutation.mutateAsync({
          data: dateToString(new Date()),
          cliente_id: clienteSelecionado?.id,
          endereco_id: enderecoSelecionado?.id,
          tipo_atendimento_id: tipoAtendimentoId,
          forma_pagamento_id: formaPagamentoId || undefined,
          telefone_contato: telefoneContato || undefined,
          desconto_valor: pedidoAtual.desconto_valor,
          subtotal: pedidoAtual.subtotal,
          total: pedidoAtual.total,
          observacao: observacoes || undefined,
          status: 'PENDENTE',
          itens,
        });
        
        toast.success(`Pedido #${(pedidoCriado as any).numero} criado com sucesso!`, { id: toastId });
        setDialogFinalizar(false);
        novoPedido();
        limparCamposVenda();
      }
    } catch (error: any) {
      console.error('Erro ao salvar pedido:', error);
      toast.error(error?.message || 'Erro ao salvar pedido. Tente novamente.', { id: toastId });
    }
  };
  
  const limparCamposVenda = () => {
    setClienteSelecionado(null);
    setEnderecoSelecionado(null);
    setFormaPagamentoId('');
    setTipoAtendimentoId('');
    setTelefoneContato('');
    setObservacoes('');
  };
  
  const handleCriarCliente = async () => {
    if (!novoClienteNome.trim()) {
      toast.error('Nome é obrigatório!');
      return;
    }
    
    const toastId = toast.loading('Criando cliente...');
    
    try {
      const novoCliente = await criarClienteMutation.mutateAsync({
        nome: novoClienteNome,
        cpf: novoClienteCPF || undefined,
        telefone: novoClienteTelefone || undefined,
        endereco: novoClienteEndereco ? {
          logradouro: novoClienteEndereco,
          principal: true,
        } : undefined,
      });
      
      setClienteSelecionado(novoCliente);
      setTelefoneContato((novoCliente as any).telefone || '');
      setDialogNovoCliente(false);
      
      // Limpar campos
      setNovoClienteNome('');
      setNovoClienteCPF('');
      setNovoClienteTelefone('');
      setNovoClienteEndereco('');
      
      toast.success(`Cliente ${novoClienteNome} criado com sucesso!`, { id: toastId });
    } catch (error) {
      toast.error('Erro ao criar cliente. Tente novamente.', { id: toastId });
    }
  };
  
  const handleImprimirPedido = async (acao: 'print' | 'download' = 'print') => {
    // Montar endereço completo do cliente
    const enderecoCompleto = enderecoSelecionado ? [
      enderecoSelecionado.logradouro,
      enderecoSelecionado.numero,
      enderecoSelecionado.complemento,
      enderecoSelecionado.bairro,
      enderecoSelecionado.cidade,
      enderecoSelecionado.estado,
      enderecoSelecionado.cep ? `CEP: ${enderecoSelecionado.cep}` : '',
    ].filter(Boolean).join(', ') : '';

    const dadosPedido = {
      numero: pedidoAtual.numero,
      data: pedidoAtual.data,
      cliente_nome: clienteSelecionado?.nome,
      cliente_telefone: telefoneContato,
      endereco: enderecoCompleto,
      tipo_atendimento: (tiposAtendimento as any)?.find((t: any) => t.id === tipoAtendimentoId)?.nome,
      forma_pagamento: (formasPagamento as any)?.find((f: any) => f.id === formaPagamentoId)?.nome,
      observacoes: observacoes,
      itens: pedidoAtual.itens,
      subtotal: pedidoAtual.subtotal,
      desconto_valor: pedidoAtual.desconto_valor,
      total: pedidoAtual.total,
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

  if (loadingPedido) {
    return (
      <AppLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
          <CircularProgress />
        </Box>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title={modoEdicao ? `PDV - Editando Pedido #${pedidoParaEditar?.numero}` : "PDV - Ponto de Venda"}
        subtitle={modoEdicao ? "Modo de edição - Alterando pedido existente" : "Sistema de vendas rápido e intuitivo"}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'PDV' },
        ]}
      />

      {/* Indicador de Modo Edição */}
      {modoEdicao && (
        <Alert 
          severity="warning" 
          icon={<Edit />}
          sx={{ mb: 3 }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Modo de Edição Ativo - Você está editando o Pedido #{pedidoParaEditar?.numero}
          </Typography>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Área de Produtos */}
        <Grid item xs={12} lg={7}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ShoppingCart /> Adicionar Produtos
              {modoEdicao && (
                <Chip 
                  label="EDITANDO" 
                  color="warning" 
                  size="small" 
                  sx={{ fontWeight: 700 }}
                />
              )}
            </Typography>

            <Divider sx={{ my: 2 }} />

            {/* Seleção de Produto */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={12}>
                <Autocomplete
                  options={produtos?.produtos || []}
                  getOptionLabel={(option) => `${option.nome}${option.codigo ? ` - ${option.codigo}` : ''}`}
                  value={produtoSelecionado}
                  onChange={(_, newValue) => {
                    if (newValue) {
                      handleSelecionarProduto(newValue);
                    }
                  }}
                  onInputChange={(_, value) => setSearchProduto(value)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Buscar produto"
                      placeholder="Digite o nome ou código..."
                      autoFocus
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                  renderOption={(props, option) => {
                    const { key, ...otherProps } = props as any;
                    return (
                      <li key={option.id} {...otherProps}>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {option.nome}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {option.codigo && `Cód: ${option.codigo} | `}
                            {formatCurrency(option.valor_base)}
                          </Typography>
                        </Box>
                      </li>
                    );
                  }}
                />
              </Grid>

              {produtoSelecionado && (
                <>
                  <Grid item xs={6} md={3}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Quantidade"
                      value={quantidade}
                      onChange={(e) => setQuantidade(Math.max(0.01, parseFloat(e.target.value) || 1))}
                      InputProps={{ 
                        inputProps: { min: 0.01, step: 0.1 },
                        startAdornment: (
                          <InputAdornment position="start">
                            <ShoppingCart fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={6} md={3}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Valor Unitário"
                      value={valorUnitario}
                      onChange={(e) => setValorUnitario(Math.max(0, parseFloat(e.target.value) || 0))}
                      InputProps={{ 
                        inputProps: { min: 0, step: 0.01 },
                        startAdornment: (
                          <InputAdornment position="start">
                            <AttachMoney fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={6} md={3}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Desconto (R$)"
                      value={descontoItem}
                      onChange={(e) => setDescontoItem(Math.max(0, parseFloat(e.target.value) || 0))}
                      InputProps={{ 
                        inputProps: { min: 0, step: 0.01 },
                        startAdornment: (
                          <InputAdornment position="start">
                            <Percent fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={6} md={3}>
                    <Autocomplete
                      options={cores || []}
                      getOptionLabel={(option: any) => option.descricao || ''}
                      isOptionEqualToValue={(option: any, value: any) => option.id === value.id}
                      value={corSelecionada}
                      onChange={(_, newValue) => setCorSelecionada(newValue)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Cor (Opcional)"
                          placeholder="Selecione..."
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: (
                              <InputAdornment position="start">
                                <Palette fontSize="small" />
                              </InputAdornment>
                            ),
                          }}
                        />
                      )}
                    />
                  </Grid>
                </>
              )}

              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  startIcon={<Add />}
                  onClick={handleAdicionarProduto}
                  disabled={!produtoSelecionado || quantidade <= 0 || valorUnitario <= 0}
                  sx={{ height: 56 }}
                >
                  Adicionar ao Pedido
                </Button>
              </Grid>
            </Grid>

            {produtoSelecionado && (
              <Card
                component={motion.div}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                sx={{ p: 2, bgcolor: 'primary.main', color: 'white', mb: 3 }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                  <Box>
                    <Typography variant="body2" fontWeight="bold" sx={{ opacity: 0.9 }}>
                      {produtoSelecionado.nome}
                    </Typography>
                    {corSelecionada && (
                      <Chip 
                        label={corSelecionada.descricao} 
                        size="small" 
                        icon={<Palette />}
                        sx={{ mt: 0.5, bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                      />
                    )}
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {formatCurrency(valorUnitario)} × {quantidade} unid.
                    {descontoItem > 0 && ` - ${formatCurrency(descontoItem)}`}
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    = {formatCurrency((valorUnitario * quantidade) - descontoItem)}
                  </Typography>
                </Box>
              </Card>
            )}

            {/* Lista de Itens */}
            <Box sx={{ bgcolor: 'background.default', borderRadius: 2, p: 2, minHeight: 300 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Itens do Pedido ({pedidoAtual.itens.length})
                </Typography>
                {pedidoAtual.itens.length > 0 && (
                  <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    startIcon={<Delete />}
                    onClick={handleLimparCarrinho}
                  >
                    Limpar Tudo
                  </Button>
                )}
              </Box>

              <AnimatePresence>
                {pedidoAtual.itens.length === 0 ? (
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      py: 6,
                      color: 'text.secondary',
                    }}
                  >
                    <ShoppingCart sx={{ fontSize: 64, opacity: 0.3, mb: 2 }} />
                    <Typography>Nenhum item adicionado</Typography>
                  </Box>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Produto</TableCell>
                          <TableCell align="center">Qtd</TableCell>
                          <TableCell align="right">Valor Unit.</TableCell>
                          <TableCell align="right">Desconto</TableCell>
                          <TableCell align="right">Total</TableCell>
                          <TableCell align="center">Ações</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pedidoAtual.itens.map((item, index) => (
                          <TableRow
                            key={index}
                            component={motion.tr}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                          >
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {item.produto_nome}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                                {item.produto_codigo && (
                                  <Typography variant="caption" color="text.secondary">
                                    Cód: {item.produto_codigo}
                                  </Typography>
                                )}
                                {item.cor_descricao && (
                                  <Chip 
                                    label={item.cor_descricao} 
                                    size="small" 
                                    icon={<Palette fontSize="small" />}
                                    sx={{ height: 18, fontSize: '0.7rem' }}
                                  />
                                )}
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    atualizarItem(index, { quantidade: Math.max(0.01, item.quantidade - 1) })
                                  }
                                >
                                  <Remove fontSize="small" />
                                </IconButton>
                                <Typography sx={{ minWidth: 40, textAlign: 'center' }}>
                                  {item.quantidade}
                                </Typography>
                                <IconButton
                                  size="small"
                                  onClick={() => atualizarItem(index, { quantidade: item.quantidade + 1 })}
                                >
                                  <Add fontSize="small" />
                                </IconButton>
                              </Box>
                            </TableCell>
                            <TableCell align="right">
                              {editandoItem === index ? (
                                <TextField
                                  size="small"
                                  type="number"
                                  value={item.valor_unitario}
                                  onChange={(e) => atualizarItem(index, { valor_unitario: parseFloat(e.target.value) || 0 })}
                                  onBlur={() => setEditandoItem(null)}
                                  autoFocus
                                  sx={{ width: 80 }}
                                  InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                                />
                              ) : (
                                <Box
                                  onClick={() => setEditandoItem(index)}
                                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, borderRadius: 1, px: 1 }}
                                >
                                  {formatCurrency(item.valor_unitario)}
                                  <Edit sx={{ fontSize: 12, ml: 0.5, opacity: 0.5 }} />
                                </Box>
                              )}
                            </TableCell>
                            <TableCell align="right">
                              <TextField
                                size="small"
                                type="number"
                                value={item.desconto_valor}
                                onChange={(e) => atualizarItem(index, { desconto_valor: parseFloat(e.target.value) || 0 })}
                                sx={{ width: 80 }}
                                InputProps={{ 
                                  inputProps: { min: 0, step: 0.01 },
                                  startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                                }}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Typography fontWeight="bold">{formatCurrency(item.valor_total)}</Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Tooltip title="Duplicar">
                                <IconButton 
                                  size="small" 
                                  color="primary" 
                                  onClick={() => handleDuplicarLinha(index)}
                                >
                                  <ContentCopy fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Remover">
                                <IconButton 
                                  size="small" 
                                  color="error" 
                                  onClick={() => removerItem(index)}
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
                )}
              </AnimatePresence>
            </Box>
          </Card>
        </Grid>

        {/* Resumo e Finalização */}
        <Grid item xs={12} lg={5}>
          <Card sx={{ p: 3, position: 'sticky', top: 100 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Receipt /> Resumo do Pedido
            </Typography>

            <Divider sx={{ my: 2 }} />

            {/* Dados do Cliente */}
            <Accordion 
              expanded={accordionExpandido === 'cliente'} 
              onChange={(_, isExpanded) => setAccordionExpandido(isExpanded ? 'cliente' : false)}
              sx={{ mb: 2, boxShadow: 1 }}
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Person color="primary" />
                  <Typography fontWeight="bold">
                    Cliente {clienteSelecionado && `- ${clienteSelecionado.nome}`}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Autocomplete
                        fullWidth
                        options={clientes?.clientes || []}
                        getOptionLabel={(option) => option.nome || ''}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        value={clienteSelecionado}
                        onChange={(_, newValue) => {
                          setClienteSelecionado(newValue);
                          setTelefoneContato((newValue as any)?.telefone || '');
                          setPedidoAtual({ cliente_id: newValue?.id, cliente_nome: newValue?.nome });
                        }}
                        onInputChange={(_, value) => setSearchCliente(value)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Buscar Cliente"
                            placeholder="Digite o nome..."
                            size="small"
                          />
                        )}
                      />
                      <Button
                        variant="outlined"
                        startIcon={<PersonAdd />}
                        onClick={() => setDialogNovoCliente(true)}
                        sx={{ minWidth: 120 }}
                      >
                        Novo
                      </Button>
                    </Box>
                  </Grid>
                  
                  {clienteSelecionado && (
                    <>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Telefone Contato"
                          value={telefoneContato}
                          onChange={(e) => setTelefoneContato(e.target.value)}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Phone fontSize="small" />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Grid>
                      
                      {(clienteCompleto as any)?.enderecos && (clienteCompleto as any).enderecos.length > 0 && (
                        <Grid item xs={12}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Endereço de Entrega</InputLabel>
                            <Select
                              value={enderecoSelecionado?.id || ''}
                              label="Endereço de Entrega"
                              onChange={(e) => {
                                const endereco = (clienteCompleto as any).enderecos.find((end: any) => end.id === e.target.value);
                                setEnderecoSelecionado(endereco);
                                setPedidoAtual({ endereco_id: e.target.value });
                              }}
                              startAdornment={
                                <InputAdornment position="start">
                                  <LocationOn fontSize="small" />
                                </InputAdornment>
                              }
                            >
                              {(clienteCompleto as any).enderecos.map((endereco: any) => (
                                <MenuItem key={endereco.id} value={endereco.id}>
                                  {endereco.logradouro}
                                  {endereco.principal && ' (Principal)'}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                      )}
                    </>
                  )}
                </Grid>
              </AccordionDetails>
            </Accordion>
            
            {/* Tipo de Atendimento e Pagamento */}
            <Accordion 
              expanded={accordionExpandido === 'atendimento'} 
              onChange={(_, isExpanded) => setAccordionExpandido(isExpanded ? 'atendimento' : false)}
              sx={{ mb: 2, boxShadow: 1 }}
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Category color="primary" />
                  <Typography fontWeight="bold">Tipo de Atendimento e Pagamento</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Tipo de Atendimento *</InputLabel>
                      <Select
                        value={tipoAtendimentoId}
                        label="Tipo de Atendimento *"
                        onChange={(e) => {
                          setTipoAtendimentoId(e.target.value);
                          setPedidoAtual({ tipo_atendimento_id: e.target.value });
                        }}
                      >
                        {(tiposAtendimento as any)?.map((tipo: any) => (
                          <MenuItem key={tipo.id} value={tipo.id}>
                            {tipo.nome} {tipo.tipo && `(${tipo.tipo})`}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Forma de Pagamento *</InputLabel>
                      <Select
                        value={formaPagamentoId}
                        label="Forma de Pagamento *"
                        onChange={(e) => {
                          setFormaPagamentoId(e.target.value);
                          setPedidoAtual({ forma_pagamento_id: e.target.value });
                        }}
                        startAdornment={
                          <InputAdornment position="start">
                            <Payment fontSize="small" />
                          </InputAdornment>
                        }
                      >
                        {(formasPagamento as any)?.map((forma: any) => (
                          <MenuItem key={forma.id} value={forma.id}>
                            {forma.nome}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
            
            {/* Observações */}
            <Accordion 
              expanded={accordionExpandido === 'observacoes'} 
              onChange={(_, isExpanded) => setAccordionExpandido(isExpanded ? 'observacoes' : false)}
              sx={{ mb: 2, boxShadow: 1 }}
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Notes color="primary" />
                  <Typography fontWeight="bold">Observações</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Observações sobre o pedido"
                  placeholder="Digite aqui observações adicionais..."
                  value={observacoes}
                  onChange={(e) => {
                    setObservacoes(e.target.value);
                    setPedidoAtual({ observacao: e.target.value });
                  }}
                />
              </AccordionDetails>
            </Accordion>

            {/* Desconto Geral */}
            <Box sx={{ bgcolor: 'background.default', borderRadius: 2, p: 2, mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Percent /> Desconto Geral
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={4}>
                  <TextField
                    fullWidth
                    select
                    size="small"
                    value={tipoDescontoGeral}
                    onChange={(e: any) => setTipoDescontoGeral(e.target.value)}
                  >
                    <MenuItem value="valor">R$</MenuItem>
                    <MenuItem value="percentual">%</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={5}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    value={descontoGeral}
                    onChange={(e) => setDescontoGeral(parseFloat(e.target.value) || 0)}
                    InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                  />
                </Grid>
                <Grid item xs={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    size="small"
                    onClick={handleAplicarDescontoGeral}
                  >
                    OK
                  </Button>
                </Grid>
              </Grid>
            </Box>

            {/* Totais */}
            <Box sx={{ bgcolor: 'background.default', borderRadius: 2, p: 2, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Subtotal:</Typography>
                <Typography fontWeight="bold" sx={{ color: 'success.main' }}>
                  {formatCurrency(pedidoAtual.subtotal)}
                </Typography>
              </Box>
              {pedidoAtual.desconto_valor > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Desconto:</Typography>
                  <Typography fontWeight="bold" sx={{ color: 'error.main' }}>
                    - {formatCurrency(pedidoAtual.desconto_valor)}
                  </Typography>
                </Box>
              )}
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6" fontWeight="bold">
                  Total:
                </Typography>
                <Typography variant="h6" fontWeight="bold" sx={{ color: 'primary.main' }}>
                  {formatCurrency(pedidoAtual.total)}
                </Typography>
              </Box>
            </Box>

            {/* Informações Adicionais */}
            <Box sx={{ mb: 3 }}>
              <Chip
                label={`${pedidoAtual.itens.length} ${pedidoAtual.itens.length === 1 ? 'item' : 'itens'}`}
                color="primary"
                sx={{ mr: 1 }}
              />
              <Chip
                label={`${pedidoAtual.itens.reduce((acc, item) => acc + item.quantidade, 0)} unidades`}
                variant="outlined"
              />
            </Box>

            {/* Ações */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<Check />}
                onClick={handleFinalizarPedido}
                disabled={pedidoAtual.itens.length === 0}
                sx={{ py: 1.5 }}
              >
                {modoEdicao ? 'Salvar Alterações' : 'Finalizar Pedido'}
              </Button>
              
              <Button
                fullWidth
                variant="outlined"
                size="large"
                startIcon={<Print />}
                onClick={() => handleImprimirPedido('print')}
                disabled={pedidoAtual.itens.length === 0}
                color="primary"
              >
                Imprimir Pedido
              </Button>

              <Button
                fullWidth
                variant="outlined"
                size="large"
                startIcon={<Clear />}
                onClick={() => {
                  if (confirm('Deseja cancelar este pedido?')) {
                    limparCarrinho();
                    limparCamposVenda();
                  }
                }}
                disabled={pedidoAtual.itens.length === 0}
                color="error"
              >
                Cancelar Pedido
              </Button>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog de Finalização */}
      <Dialog open={dialogFinalizar} onClose={() => setDialogFinalizar(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Receipt />
            Resumo da Venda
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 3 }}>
            {/* Valor Total */}
            <Box sx={{ bgcolor: 'primary.light', color: 'primary.contrastText', p: 3, borderRadius: 2, mb: 3, textAlign: 'center' }}>
              <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                Valor Total
              </Typography>
              <Typography variant="h3" fontWeight="bold">
                {formatCurrency(pedidoAtual.total)}
              </Typography>
            </Box>

            <Grid container spacing={3}>
              {/* Informações do Cliente */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ p: 2, height: '100%' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Person fontSize="small" /> Cliente
                  </Typography>
                  <Typography fontWeight="bold" gutterBottom>
                    {clienteSelecionado?.nome || 'Não informado'}
                  </Typography>
                  {telefoneContato && (
                    <Typography variant="body2" color="text.secondary">
                      <Phone fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                      {telefoneContato}
                    </Typography>
                  )}
                  {enderecoSelecionado && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      <LocationOn fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                      {enderecoSelecionado.logradouro}
                    </Typography>
                  )}
                </Card>
              </Grid>

              {/* Informações de Pagamento */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ p: 2, height: '100%' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Payment fontSize="small" /> Pagamento e Atendimento
                  </Typography>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Tipo de Atendimento:
                    </Typography>
                    <Typography fontWeight="bold">
                      {(tiposAtendimento as any)?.find((t: any) => t.id === tipoAtendimentoId)?.nome || '-'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Forma de Pagamento:
                    </Typography>
                    <Typography fontWeight="bold">
                      {(formasPagamento as any)?.find((f: any) => f.id === formaPagamentoId)?.nome || '-'}
                    </Typography>
                  </Box>
                </Card>
              </Grid>

              {/* Itens do Pedido */}
              <Grid item xs={12}>
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Itens do Pedido ({pedidoAtual.itens.length})
                  </Typography>
                  <TableContainer sx={{ maxHeight: 200 }}>
                    <Table size="small">
                      <TableBody>
                        {pedidoAtual.itens.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {item.produto_nome}
                              </Typography>
                              {item.cor_descricao && (
                                <Typography variant="caption" color="text.secondary">
                                  Cor: {item.cor_descricao}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2">
                                {item.quantidade} × {formatCurrency(item.valor_unitario)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight="bold">
                                {formatCurrency(item.valor_total)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>Subtotal:</Typography>
                    <Typography fontWeight="bold">{formatCurrency(pedidoAtual.subtotal)}</Typography>
                  </Box>
                  {pedidoAtual.desconto_valor > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography color="error">Desconto:</Typography>
                      <Typography color="error" fontWeight="bold">
                        - {formatCurrency(pedidoAtual.desconto_valor)}
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: 1, borderColor: 'divider' }}>
                    <Typography variant="h6" fontWeight="bold">Total:</Typography>
                    <Typography variant="h6" fontWeight="bold" color="primary">
                      {formatCurrency(pedidoAtual.total)}
                    </Typography>
                  </Box>
                </Card>
              </Grid>

              {/* Observações */}
              {observacoes && (
                <Grid item xs={12}>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Notes fontSize="small" /> Observações
                    </Typography>
                    <Typography variant="body2">{observacoes}</Typography>
                  </Card>
                </Grid>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, bgcolor: 'background.default', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, flexGrow: 1 }}>
            <Button 
              onClick={() => handleImprimirPedido('print')} 
              variant="outlined"
              size="large"
              startIcon={<Print />}
              disabled={pedidoAtual.itens.length === 0}
            >
              Imprimir
            </Button>
            <Button 
              onClick={() => handleImprimirPedido('download')} 
              variant="outlined"
              size="large"
              startIcon={<Download />}
              disabled={pedidoAtual.itens.length === 0}
            >
              Baixar PDF
            </Button>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={() => setDialogFinalizar(false)} variant="outlined" size="large">
              Voltar
            </Button>
            <Button 
              onClick={handleConfirmarPedido} 
              variant="contained" 
              size="large"
              startIcon={<Check />}
              autoFocus
            >
              Confirmar Venda
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Dialog de Criar Novo Cliente */}
      <Dialog open={dialogNovoCliente} onClose={() => setDialogNovoCliente(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonAdd color="primary" />
          Cadastrar Novo Cliente
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              Cadastro rápido de cliente. Você pode completar os dados depois na página de Clientes.
            </Alert>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nome Completo *"
                  value={novoClienteNome}
                  onChange={(e) => setNovoClienteNome(e.target.value)}
                  placeholder="Digite o nome do cliente"
                  autoFocus
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="CPF"
                  value={novoClienteCPF}
                  onChange={(e) => setNovoClienteCPF(e.target.value)}
                  placeholder="000.000.000-00"
                  inputProps={{ maxLength: 14 }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Telefone"
                  value={novoClienteTelefone}
                  onChange={(e) => setNovoClienteTelefone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Phone fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Endereço"
                  value={novoClienteEndereco}
                  onChange={(e) => setNovoClienteEndereco(e.target.value)}
                  placeholder="Rua, Número, Bairro"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocationOn fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => {
              setDialogNovoCliente(false);
              setNovoClienteNome('');
              setNovoClienteCPF('');
              setNovoClienteTelefone('');
              setNovoClienteEndereco('');
            }} 
            variant="outlined"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleCriarCliente} 
            variant="contained"
            disabled={!novoClienteNome.trim() || criarClienteMutation.isPending}
            startIcon={criarClienteMutation.isPending ? <CircularProgress size={20} /> : <Check />}
          >
            {criarClienteMutation.isPending ? 'Criando...' : 'Criar Cliente'}
          </Button>
        </DialogActions>
      </Dialog>
    </AppLayout>
  );
}

export default function PDVPage() {
  return (
    <Suspense fallback={
      <AppLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
          <CircularProgress />
        </Box>
      </AppLayout>
    }>
      <PDVPageContent />
    </Suspense>
  );
}
