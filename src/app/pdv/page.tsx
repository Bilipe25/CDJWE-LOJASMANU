'use client';

import { useState, useEffect, Suspense, useRef, useMemo } from 'react';
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
  Menu,
  FormControl,
  InputLabel,
  Select,
  Alert,
  CircularProgress,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Add,
  NavigateNext,
  Remove,
  Delete,
  ShoppingCart,
  Person,
  Receipt,
  Check,
  Search,
  Edit,
  Percent,
  Palette,
  AttachMoney,
  LocationOn,
  Payment,
  Phone,
  Notes,
  Category,
  PersonAdd,
  Print,
  Download,
  ContentCopy,
  Keyboard,
  MoreVert,
} from '@mui/icons-material';
import AppLayout from '@/components/layout/AppLayout';
import { trpc } from '@/lib/trpc/client';
import { usePDVStore } from '@/stores/pdv-store';
import { motion, AnimatePresence } from 'framer-motion';
import { OperationalHeader, operationalSurface, operationalTable } from '@/components/common/OperationalPage';
import { arredondarMoeda } from '@/lib/utils/valores-pedido';
import SaleSection from '@/components/common/SaleSection';
import EnderecoFields from '@/components/common/EnderecoFields';
import ClienteDadosFields from '@/components/common/ClienteDadosFields';
import { clienteSchema } from '@/lib/schemas/cliente';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useNetworkAvailable } from '@/hooks/useNetworkAvailable';
import { empresaParaDocumento } from '@/lib/utils/documentos';
import type { Tables } from '@/types/supabase';
import { EnderecoCliente, EnderecoFormulario, enderecoVazio, formatarEndereco, selecionarEndereco, temDadosEndereco } from '@/lib/utils/endereco';

function PDVPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const pedidoEditId = searchParams.get('edit');
  const {
    pedidoAtual,
    adicionarItem,
    atualizarItem: atualizarItemStore,
    removerItem,
    limparCarrinho,
    setPedidoAtual,
    novoPedido,
  } = usePDVStore();
  const [rascunhoPronto, setRascunhoPronto] = useState(false);
  useEffect(() => { setRascunhoPronto(true); }, []);
  const salvandoRef = useRef(false);
  const [salvando, setSalvando] = useState(false);
  const [pedidoSalvo, setPedidoSalvo] = useState<{ id: string; numero: number | null } | null>(null);
  const edicaoHidratada = useRef<string | null>(null);
  const [falhaHidratacao, setFalhaHidratacao] = useState('');
  const atualizarItem = (index: number, item: Parameters<typeof atualizarItemStore>[1]) => {
    try { atualizarItemStore(index,item); } catch (erro) { toast.error((erro as Error).message); }
  };
  const [modoEdicao, setModoEdicao] = useState(false);
  const [pedidoOriginalId, setPedidoOriginalId] = useState<string | null>(null);

  const [produtoSelecionado, setProdutoSelecionado] = useState<Tables<'produtos'> | null>(null);
  const [quantidade, setQuantidade] = useState(1);
  const [valorUnitario, setValorUnitario] = useState(0);
  const [descontoItem, setDescontoItem] = useState(0);
  const [tipoDescontoItem, setTipoDescontoItem] = useState<'valor' | 'percentual'>('valor');
  const [corSelecionada, setCorSelecionada] = useState<Tables<'cores'> | null>(null);
  const clienteSelecionado = pedidoAtual.cliente ?? null;
  const setClienteSelecionado = (cliente: typeof pedidoAtual.cliente | null) => setPedidoAtual({ cliente: cliente ?? undefined, cliente_id: cliente?.id, cliente_nome: cliente?.nome });
  const [searchProduto, setSearchProduto] = useState('');
  const [searchCliente, setSearchCliente] = useState('');
  const [dialogFinalizar, setDialogFinalizar] = useState(false);
  const [editandoItem, setEditandoItem] = useState<number | null>(null);
  const [descontoGeral, setDescontoGeral] = useState(0);
  const [tipoDescontoGeral, setTipoDescontoGeral] = useState<'valor' | 'percentual'>('valor');

  // Dialog e campos para cadastro rápido de produto
  const [dialogNovoProduto, setDialogNovoProduto] = useState(false);
  const [novoProdutoNome, setNovoProdutoNome] = useState('');
  const [novoProdutoCodigo, setNovoProdutoCodigo] = useState('');
  const [novoProdutoValor, setNovoProdutoValor] = useState(0);
  const [novoProdutoUnidade, setNovoProdutoUnidade] = useState('UN');

  // Novos campos da venda
  const [enderecoSelecionado, setEnderecoSelecionado] = useState<EnderecoCliente | null>(null);
  const enderecoPedidoRestaurado = useRef<string | null>(null);
  const formaPagamentoId = pedidoAtual.forma_pagamento_id ?? '';
  const setFormaPagamentoId = (valor: string) => setPedidoAtual({ forma_pagamento_id: valor });
  const tipoAtendimentoId = pedidoAtual.tipo_atendimento_id ?? '';
  const setTipoAtendimentoId = (valor: string) => setPedidoAtual({ tipo_atendimento_id: valor });
  const telefoneContato = pedidoAtual.telefone_contato ?? '';
  const setTelefoneContato = (valor: string) => setPedidoAtual({ telefone_contato: valor });
  const observacoes = pedidoAtual.observacao ?? '';
  const setObservacoes = (valor: string) => setPedidoAtual({ observacao: valor });
  const [dialogNovoCliente, setDialogNovoCliente] = useState(false);
  const [novoClienteNome, setNovoClienteNome] = useState('');
  const [novoClienteEmail, setNovoClienteEmail] = useState('');
  const [novoClienteCPF, setNovoClienteCPF] = useState('');
  const [novoClienteTelefone, setNovoClienteTelefone] = useState('');
  const [novoClienteEndereco, setNovoClienteEndereco] = useState<EnderecoFormulario>({ ...enderecoVazio });
  const [accordionExpandido, setAccordionExpandido] = useState<string | false>('cliente');
  const [dialogAtalhos, setDialogAtalhos] = useState(false);
  const [itemMenu, setItemMenu] = useState<{ anchor: HTMLElement; index: number } | null>(null);

  // Mobile Steps: 0 = Itens/Carrinho, 1 = Pagamento/Dados
  const [activeStep, setActiveStep] = useState(0);

  // Refs para focar nos campos
  const produtoInputRef = useRef<HTMLInputElement>(null);
  const clienteInputRef = useRef<HTMLInputElement>(null);

  // Abrir accordion cliente automaticamente em mobile
  useEffect(() => {
    if (isMobile && !accordionExpandido) {
      setAccordionExpandido('cliente');
    }
  }, [isMobile, accordionExpandido]);

  const buscaProduto = useDebouncedValue(searchProduto);
  const buscaCliente = useDebouncedValue(searchCliente);
  const redeDisponivel = useNetworkAvailable();
  const [itemEdicaoMovel, setItemEdicaoMovel] = useState<number | null>(null);
  const [valoresItem, setValoresItem] = useState({ quantidade: '1', valor_unitario: '0', desconto_valor: '0' });
  const abrirEdicaoItem = (index: number) => {
    const item = pedidoAtual.itens[index];
    setValoresItem({ quantidade: String(item.quantidade), valor_unitario: String(item.valor_unitario), desconto_valor: String(item.desconto_valor) });
    setItemEdicaoMovel(index);
  };
  const { data: produtos, isFetching: buscandoProdutos, error: erroProdutos, refetch: recarregarProdutos } = trpc.produtos.list.useQuery({
    limit: 100,
    offset: 0,
    search: buscaProduto || undefined,
  });
  const pesquisaProdutoPendente = searchProduto.trim() !== buscaProduto.trim() || buscandoProdutos;

  const { data: clientes, error: erroClientes, refetch: recarregarClientes } = trpc.clientes.list.useQuery({
    limit: 50,
    offset: 0,
    search: buscaCliente || undefined,
  });

  const { data: tiposAtendimento, error: erroTipos, refetch: recarregarTipos } = trpc.dominios.tiposAtendimento.list.useQuery();
  const { data: formasPagamento, error: erroPagamentos, refetch: recarregarPagamentos } = trpc.dominios.formasPagamento.list.useQuery();
  const { data: cores } = trpc.dominios.cores.list.useQuery();

  // Buscar endereços do cliente
  const { data: clienteCompleto, isFetching: carregandoCliente, error: erroCliente, refetch: recarregarCliente } = trpc.clientes.getById.useQuery(
    { id: clienteSelecionado?.id || '' },
    { enabled: !!clienteSelecionado?.id }
  );

  // Buscar pedido para edição
  const { data: pedidoParaEditar, isLoading: loadingPedido, error: erroPedido, refetch: recarregarPedido } = trpc.pedidos.getById.useQuery(
    { id: pedidoEditId || '' },
    { enabled: !!pedidoEditId }
  );

  const utils = trpc.useUtils();
  const enderecosDisponiveis = useMemo(() => (clienteCompleto?.enderecos || [])
    .filter(e => e.ativo || (modoEdicao && e.id === pedidoParaEditar?.endereco_id))
    .map(e => modoEdicao && e.id === pedidoParaEditar?.endereco_id && pedidoParaEditar?.endereco ? { ...e, ...pedidoParaEditar.endereco } : e), [clienteCompleto, modoEdicao, pedidoParaEditar]);

  // Mutations
  const criarClienteMutation = trpc.clientes.create.useMutation();
  const criarProdutoMutation = trpc.produtos.create.useMutation();
  const criarPedidoMutation = trpc.pedidos.create.useMutation();
  const atualizarPedidoMutation = trpc.pedidos.update.useMutation();

  // Hook para buscar configurações
  const { data: configuracoes, error: erroEmpresa, isLoading: carregandoEmpresa } = trpc.configuracoes.get.useQuery();



  // useEffect para carregar dados do pedido em modo edição
  useEffect(() => {
    if (!pedidoEditId || !pedidoParaEditar || edicaoHidratada.current === pedidoEditId || ['CANCELADO','FINALIZADO'].includes(pedidoParaEditar.status ?? '')) return;
    try {
      const cliente = pedidoParaEditar.cliente_id ? { id: pedidoParaEditar.cliente_id, nome: pedidoParaEditar.cliente_nome ?? '', cpf: pedidoParaEditar.cliente_cpf, telefone: pedidoParaEditar.cliente_telefone } : undefined;
      setPedidoAtual({
        id: pedidoParaEditar.id ?? undefined, numero: pedidoParaEditar.numero ?? undefined, versao: pedidoParaEditar.versao,
        data: pedidoParaEditar.data ?? dateToString(new Date()), cliente,
        cliente_id: cliente?.id, cliente_nome: cliente?.nome, endereco_id: pedidoParaEditar.endereco_id ?? undefined,
        tipo_atendimento_id: pedidoParaEditar.tipo_atendimento_id ?? undefined, forma_pagamento_id: pedidoParaEditar.forma_pagamento_id ?? undefined,
        telefone_contato: pedidoParaEditar.telefone_contato ?? cliente?.telefone ?? '', observacao: pedidoParaEditar.observacao ?? '',
        desconto_valor: pedidoParaEditar.desconto_valor ?? 0, status: pedidoParaEditar.status as 'PENDENTE' | 'CONFIRMADO',
        itens: pedidoParaEditar.itens.map(item => ({ id: item.id ?? undefined, produto_id: item.produto_id!, produto_nome: item.produto_nome ?? 'Produto', produto_codigo: item.produto_codigo ?? undefined, produto_unidade: item.produto_unidade ?? undefined, cor_id: item.cor_id ?? undefined, cor_descricao: item.cor_descricao ?? undefined, quantidade: item.quantidade ?? 0, valor_unitario: item.valor_unitario ?? 0, desconto_valor: item.desconto_valor ?? 0, valor_total: item.valor_total ?? 0, ordem: item.ordem ?? 0 })),
      });
      setSearchCliente(cliente?.nome ?? '');
      setModoEdicao(true); setPedidoOriginalId(pedidoEditId); edicaoHidratada.current = pedidoEditId; setFalhaHidratacao('');
    } catch (erro) { setFalhaHidratacao('Pedido com valores inválidos: ' + (erro as Error).message); }
  }, [pedidoEditId, pedidoParaEditar, setPedidoAtual]);

  useEffect(() => { setDescontoGeral(pedidoAtual.desconto_valor); setTipoDescontoGeral('valor'); }, [pedidoAtual.desconto_valor]);

  // Esperar o cliente correto antes de restaurar o endereço vinculado ao pedido.
  useEffect(() => {
    if (!clienteSelecionado) {
      setEnderecoSelecionado(null);
      setPedidoAtual({ endereco_id: undefined });
      return;
    }
    if (!clienteCompleto || clienteCompleto.id !== clienteSelecionado.id || carregandoCliente || erroCliente) return;
    const restaurarPedido = Boolean(pedidoEditId && pedidoParaEditar && modoEdicao &&
      pedidoParaEditar.cliente_id === clienteSelecionado.id && enderecoPedidoRestaurado.current !== pedidoEditId);
    const selecaoAtual = selecionarEndereco(enderecosDisponiveis, enderecoSelecionado?.id);
    const semEnderecoNoPedido = pedidoEditId && enderecoPedidoRestaurado.current === pedidoEditId &&
      pedidoParaEditar?.cliente_id === clienteSelecionado.id && !enderecoSelecionado;
    const endereco = restaurarPedido
      ? pedidoParaEditar?.endereco ?? selecionarEndereco(enderecosDisponiveis, pedidoParaEditar?.endereco_id ?? null)
      : semEnderecoNoPedido ? null : enderecoSelecionado && selecaoAtual ? enderecoSelecionado : selecionarEndereco(enderecosDisponiveis, pedidoAtual.endereco_id);
    if (restaurarPedido) enderecoPedidoRestaurado.current = pedidoEditId;
    setEnderecoSelecionado(endereco);
    setPedidoAtual({ endereco_id: endereco?.id });
  }, [clienteCompleto, clienteSelecionado, carregandoCliente, erroCliente, pedidoEditId, pedidoParaEditar, modoEdicao, enderecoSelecionado, pedidoAtual.endereco_id, enderecosDisponiveis, setPedidoAtual]);

  // useEffect para atalhos de teclado
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Não executar atalhos se estiver em um dialog
      const emDialog = dialogFinalizar || !!pedidoSalvo || !!itemMenu || dialogNovoCliente || dialogNovoProduto || dialogAtalhos || itemEdicaoMovel !== null || !!(e.target as HTMLElement | null)?.closest('[role="dialog"]');

      // F2 - Focar no campo de busca de produtos
      if (e.key === 'F2' && !emDialog) {
        e.preventDefault();
        setActiveStep(0); requestAnimationFrame(() => produtoInputRef.current?.focus());
        toast('Campo de produtos focado (F2)', { icon: <Search /> });
      }

      // F3 - Focar no campo de busca de clientes
      if (e.key === 'F3' && !emDialog) {
        e.preventDefault();
        setActiveStep(1); setAccordionExpandido('cliente');
        requestAnimationFrame(() => clienteInputRef.current?.focus());
        toast('Campo de clientes focado (F3)', { icon: <Person /> });
      }

      // F10 or F12 - Finalizar pedido (se válido)
      if ((e.key === 'F10' || e.key === 'F12') && !emDialog) {
        e.preventDefault();
        if (pedidoAtual.itens.length > 0) {
          handleFinalizarPedido();
          toast('Conferência do pedido aberta (F10)');
        } else {
          toast.error('Adicione itens antes de salvar');
        }
      }

      const alvo = e.target as HTMLElement | null;
      const campoProduto = alvo === produtoInputRef.current || !!alvo?.closest('[data-pdv-item]');
      if (e.key === 'Enter' && !e.defaultPrevented && alvo?.getAttribute('aria-expanded') !== 'true' && produtoSelecionado && !emDialog && campoProduto && !salvandoRef.current) {
        e.preventDefault(); handleAdicionarProduto();
      }
      if (e.key === 'Escape' && !emDialog) {
        if (campoProduto) {
          setProdutoSelecionado(null); setSearchProduto(''); setQuantidade(1); setValorUnitario(0); setDescontoItem(0); setTipoDescontoItem('valor'); setCorSelecionada(null);
        } else if (alvo === clienteInputRef.current) { setSearchCliente(''); }
      }

      // Ctrl+P - Abrir dialog de novo produto
      if (e.ctrlKey && e.key === 'p' && !emDialog) {
        e.preventDefault();
        setDialogNovoProduto(true);
        toast('Atalho: Cadastrar novo produto', { icon: <Add /> });
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [produtoSelecionado, dialogFinalizar, pedidoSalvo, itemMenu, dialogNovoCliente, dialogNovoProduto, dialogAtalhos, itemEdicaoMovel, redeDisponivel, quantidade, pedidoAtual.itens.length, valorUnitario, descontoItem, tipoDescontoItem, corSelecionada, tipoAtendimentoId, formaPagamentoId, pedidoAtual.desconto_valor, clienteSelecionado]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleAdicionarProduto = () => {
    if (!produtoSelecionado || quantidade <= 0) return;

    // Calcular desconto baseado no tipo
    const valorUnitarioFinal = valorUnitario;
    const valorTotalItem = valorUnitarioFinal * quantidade;
    let descontoValor = 0;

    if (tipoDescontoItem === 'percentual') {
      // Calcular desconto em valor baseado na porcentagem
      descontoValor = (valorTotalItem * descontoItem) / 100;
    } else {
      // Desconto já é em valor
      descontoValor = descontoItem;
    }

    try { adicionarItem({
      produto_id: produtoSelecionado.id,
      produto_nome: produtoSelecionado.nome,
      produto_codigo: produtoSelecionado.codigo ?? undefined,
      produto_unidade: produtoSelecionado.unidade ?? undefined,
      cor_id: corSelecionada?.id,
      cor_descricao: corSelecionada?.descricao ?? undefined,
      quantidade,
      valor_unitario: valorUnitarioFinal,
      desconto_valor: arredondarMoeda(descontoValor),
    }); } catch (erro) { toast.error((erro as Error).message); return; }

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
    setTipoDescontoItem('valor');
    setCorSelecionada(null);
  };

  // Atualizar valor unitário quando selecionar produto
  const handleSelecionarProduto = (produto: Tables<'produtos'> | null) => {
    if (!produto) setSearchProduto('');
    setQuantidade(1); setTipoDescontoItem('valor');
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

    try { setPedidoAtual({ desconto_valor: arredondarMoeda(valorDesconto) }); } catch (erro) { toast.error((erro as Error).message); }
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
    if (salvandoRef.current) return;
    if (redeDisponivel === false) { toast.error('Sem conexão. O rascunho foi preservado; reconecte para salvar.'); return; }
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
    if (salvandoRef.current || !rascunhoPronto) return;
    if (pedidoEditId && (!modoEdicao || !pedidoAtual.versao)) { toast.error('Carregue o pedido antes de salvar.'); return; }
    if (!pedidoAtual.itens.length || !tipoAtendimentoId || !formaPagamentoId) { toast.error('Confira os itens, tipo de atendimento e pagamento.'); return; }
    if (clienteSelecionado && (carregandoCliente || erroCliente || clienteCompleto?.id !== clienteSelecionado.id)) {
      toast.error('Aguarde o carregamento dos endereços do cliente ou tente novamente.');
      return;
    }
    if (enderecoSelecionado && !clienteCompleto?.enderecos.some((endereco) => endereco.id === enderecoSelecionado.id)) {
      toast.error('Selecione um endereço do cliente atual.');
      return;
    }
    if (modoEdicao && pedidoParaEditar?.cliente_id === clienteSelecionado?.id && pedidoParaEditar?.endereco_id && !enderecoSelecionado) {
      toast.error('O endereço original não está disponível. Selecione um endereço para este pedido.');
      return;
    }
    salvandoRef.current = true; setSalvando(true);
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
        await atualizarPedidoMutation.mutateAsync({
          id: pedidoOriginalId,
          versao: pedidoAtual.versao!,
          itens,
          cliente_id: clienteSelecionado?.id ?? null,
          endereco_id: enderecoSelecionado?.id ?? null,
          tipo_atendimento_id: tipoAtendimentoId,
          forma_pagamento_id: formaPagamentoId || undefined,
          telefone_contato: telefoneContato || null,
          desconto_valor: pedidoAtual.desconto_valor,
          observacao: observacoes || null,
        });

        toast.success('Pedido atualizado com sucesso!', { id: toastId });
        setDialogFinalizar(false);
        await utils.invalidate();
        novoPedido(); // Limpar PDV após edição e salvar

        // Verificar se há URL de retorno com filtros salvos
        const urlRetorno = sessionStorage.getItem('pedidos_url_retorno');
        if (urlRetorno) {
          sessionStorage.removeItem('pedidos_url_retorno');
          router.push(urlRetorno);
        } else {
          router.push('/pedidos');
        }
      } else {
        // Criar pedido novo
        const pedidoCriado = await criarPedidoMutation.mutateAsync({
          chave_requisicao: pedidoAtual.chave_requisicao,
          data: pedidoAtual.data,
          cliente_id: clienteSelecionado?.id ?? null,
          endereco_id: enderecoSelecionado?.id ?? null,
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

        toast.success(`Pedido #${pedidoCriado.numero} salvo · Pendente`, { id: toastId });
        setDialogFinalizar(false);
        novoPedido();
        limparCamposVenda();
        setPedidoSalvo({ id: pedidoCriado.id, numero: pedidoCriado.numero });
        await utils.invalidate();
      }
    } catch (error: unknown) {
      console.error('Erro ao salvar pedido:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar pedido. Tente novamente.', { id: toastId });
    } finally { salvandoRef.current = false; setSalvando(false); }
  };

  const limparCamposVenda = () => {
    novoPedido(); setEnderecoSelecionado(null); setSearchCliente(''); setSearchProduto('');
    setDescontoGeral(0); setTipoDescontoGeral('valor'); setAccordionExpandido('cliente'); setActiveStep(0);
    setPedidoOriginalId(null); setModoEdicao(false); setProdutoSelecionado(null); setQuantidade(1); setValorUnitario(0);
    setDescontoItem(0); setCorSelecionada(null); enderecoPedidoRestaurado.current = null;
  };

  const handleCriarCliente = async () => {
    const validacao = clienteSchema.safeParse({ nome: novoClienteNome, cpf: novoClienteCPF, telefone: novoClienteTelefone, email: novoClienteEmail });
    if (!validacao.success) { toast.error(validacao.error.issues[0].message); return; }
    if (!novoClienteNome.trim()) {
      toast.error('Nome do cliente é obrigatório');
      return;
    }

    if (temDadosEndereco(novoClienteEndereco) && !novoClienteEndereco.logradouro.trim()) {
      toast.error('Informe o logradouro para salvar o endereço');
      return;
    }
    const toastId = toast.loading('Criando cliente...');

    try {
      const novoCliente = await criarClienteMutation.mutateAsync({
        nome: novoClienteNome,
        cpf: novoClienteCPF,
        telefone: novoClienteTelefone,
        email: novoClienteEmail,
        endereco: temDadosEndereco(novoClienteEndereco) ? { ...novoClienteEndereco, principal: true } : undefined,
      });

      await utils.invalidate();
      setEnderecoSelecionado(null);
      setPedidoAtual({ cliente_id: novoCliente.id, cliente_nome: novoCliente.nome, endereco_id: undefined });
      setClienteSelecionado(novoCliente);
      setSearchCliente(novoCliente.nome);
      // Atualizar o telefone de contato do pedido automaticamente
      if (novoCliente.telefone) {
        setTelefoneContato(novoCliente.telefone);
      }

      setDialogNovoCliente(false);
      setNovoClienteNome('');
      setNovoClienteCPF('');
      setNovoClienteTelefone(''); setNovoClienteEmail('');
      setNovoClienteEndereco({ ...enderecoVazio });

      toast.success(`Cliente ${novoClienteNome} criado com sucesso!`, { id: toastId });
    } catch (error) {
      toast.error('Erro ao criar cliente. Tente novamente.', { id: toastId });
    }
  };

  const handleCriarProduto = async () => {
    if (!novoProdutoNome.trim()) {
      toast.error('Nome do produto é obrigatório');
      return;
    }
    if (novoProdutoValor <= 0) {
      toast.error('Valor do produto deve ser maior que zero');
      return;
    }

    const toastId = toast.loading('Cadastrando produto...');

    try {
      const novoProduto = await criarProdutoMutation.mutateAsync({
        nome: novoProdutoNome,
        codigo: novoProdutoCodigo || undefined,
        valor_base: novoProdutoValor,
        unidade: novoProdutoUnidade || 'UN',
      });

      await utils.invalidate();

      // Adicionar o produto direto ao carrinho
      handleSelecionarProduto(novoProduto);
      setProdutoSelecionado(novoProduto);
      setSearchProduto(novoProduto.nome);

      setDialogNovoProduto(false);
      setNovoProdutoNome('');
      setNovoProdutoCodigo('');
      setNovoProdutoValor(0);
      setNovoProdutoUnidade('UN');

      toast.success(`Produto ${novoProdutoNome} cadastrado com sucesso!`, { id: toastId });
    } catch {
      toast.error('Erro ao cadastrar produto. Tente novamente.', { id: toastId });
    }
  };

  const handleImprimirPedido = async (acao: 'print' | 'download' = 'print') => {
    if (erroEmpresa || carregandoEmpresa) { toast.error('Dados da empresa indisponíveis. Tente novamente antes de imprimir.'); return; }
    if (clienteSelecionado && (carregandoCliente || erroCliente || clienteCompleto?.id !== clienteSelecionado.id)) {
      toast.error('Aguarde o carregamento dos endereços do cliente ou tente novamente.');
      return;
    }
    // Montar endereço completo do cliente
    const enderecoCompleto = formatarEndereco(enderecoSelecionado);

    const dadosPedido = {
      numero: pedidoAtual.numero,
      rascunho: true,
      data: pedidoAtual.data,
      cliente_nome: clienteSelecionado?.nome,
      cliente_cpf: clienteSelecionado?.cpf ?? undefined,
      cliente_telefone: telefoneContato,
      endereco: enderecoCompleto,
      tipo_atendimento: tiposAtendimento?.find((t) => t.id === tipoAtendimentoId)?.nome,
      forma_pagamento: formasPagamento?.find((f) => f.id === formaPagamentoId)?.nome,
      observacoes: observacoes,
      itens: pedidoAtual.itens.map(item => ({ ...item, produto_unidade: item.produto_unidade ?? produtos?.produtos.find(p => p.id === item.produto_id)?.unidade ?? undefined })),
      subtotal: pedidoAtual.subtotal,
      desconto_valor: pedidoAtual.desconto_valor,
      total: pedidoAtual.total,
    };

    const dadosEmpresa = empresaParaDocumento(configuracoes);

    try {
      const { gerarPedidoPDF } = await import('@/lib/pdf/pedido-pdf');
      await gerarPedidoPDF(dadosPedido, dadosEmpresa, acao);
    } catch (erro) { toast.error(erro instanceof Error ? erro.message : 'Não foi possível preparar a impressão. Tente novamente.'); }
  };

  if (falhaHidratacao || erroPedido || (pedidoEditId && pedidoParaEditar && ['CANCELADO','FINALIZADO'].includes(pedidoParaEditar.status ?? ''))) {
    return <AppLayout><Alert severity="error">{falhaHidratacao || (erroPedido ? 'Não foi possível carregar o pedido. Seu rascunho foi preservado.' : 'Este pedido está encerrado e não pode ser editado.')}</Alert><Button onClick={() => recarregarPedido()}>Tentar novamente</Button><Button onClick={() => router.push('/pedidos')}>Voltar aos pedidos</Button></AppLayout>;
  }
  if (!rascunhoPronto || loadingPedido || (pedidoEditId && !modoEdicao)) {
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
      {(erroProdutos || erroClientes || erroTipos || erroPagamentos) && <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" onClick={() => { void recarregarProdutos(); void recarregarClientes(); void recarregarTipos(); void recarregarPagamentos(); }}>Tentar novamente</Button>}>Não foi possível carregar os dados da venda. Confira a conexão e tente novamente.</Alert>}
      <OperationalHeader description={modoEdicao ? 'Confira as alterações antes de salvar.' : 'Monte a venda e confira os dados do pedido.'} actions={<>
        <Chip label={modoEdicao ? 'Editando pedido' : 'Rascunho local'} size="small" variant="outlined" />
        <Button startIcon={<Keyboard />} onClick={() => setDialogAtalhos(true)}>Atalhos</Button>
      </>} />
      {redeDisponivel === false && <Alert severity="warning" sx={{ mb: 2 }}>Sem conexão. O rascunho está salvo neste dispositivo; reconecte para enviar.</Alert>}
      {isMobile && <Box sx={{ display: 'flex', gap: 1, mb: 2 }}><Button variant={activeStep === 0 ? 'contained' : 'outlined'} onClick={() => setActiveStep(0)}>Itens</Button><Button variant={activeStep === 1 ? 'contained' : 'outlined'} onClick={() => { setActiveStep(1); setAccordionExpandido('cliente'); }}>Cliente e pagamento</Button></Box>}

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

      <Grid container spacing={2} sx={{ position: 'relative', pb: { xs: 22, sm: 18, lg: 14 } }}>
        {/* Área de Produtos */}
        <Grid
          item
          xs={12}
          lg={8}
          sx={{
            order: 1,
            display: { xs: activeStep === 0 ? 'block' : 'none', md: 'block' }
          }}
        >
          <Card sx={{ ...operationalSurface, p: { xs: 1.5, sm: 2.5 }, height: '100%', minHeight: { lg: 'calc(100dvh - 250px)' } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ShoppingCart /> Adicionar Produtos
              </Typography>
                <Button
                      variant="text"
                    size="large"
                    startIcon={<Add />}
                    onClick={() => setDialogNovoProduto(true)}
                    sx={{ height: 56 }}
                  >
                    Novo
                  </Button>
              {modoEdicao && (
                <Chip
                  label="EDITANDO"
                  color="warning"
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Seleção de Produto */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={8} md={9}>
                <Autocomplete
                  clearText="Limpar produto"
                  autoHighlight
                  options={pesquisaProdutoPendente ? [] : produtos?.produtos || []}
                  loading={pesquisaProdutoPendente}
                  loadingText="Pesquisando produtos…"
                  onKeyDown={(event) => {
                    // Um leitor pode enviar Enter antes do debounce/resposta: não selecione a lista anterior.
                    if (event.key === 'Enter' && pesquisaProdutoPendente && searchProduto.trim()) {
                      event.preventDefault(); event.defaultMuiPrevented = true;
                    }
                  }}
                  getOptionLabel={(option) => `${option.nome}${option.codigo ? ` - ${option.codigo}` : ''}`}
                  value={produtoSelecionado}
                  onChange={(_, newValue) => handleSelecionarProduto(newValue)}
                  filterOptions={(options) => options}
                  isOptionEqualToValue={(a,b) => a.id === b.id}
                  onInputChange={(_, value, reason) => setSearchProduto(reason === 'input' ? value : '')}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      inputRef={produtoInputRef}
                      label="Buscar produto (F2)"
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
                    const { key, ...otherProps } = props;
                    return (
                      <li key={key} {...otherProps}>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {option.nome}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {option.codigo && `Cód: ${option.codigo} | `}
                            {formatCurrency(option.valor_base ?? 0)}
                          </Typography>
                        </Box>
                      </li>
                    );
                  }}
                />
              </Grid>

              <Grid item xs={4} md={3}>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  startIcon={<Add />}
                  onClick={handleAdicionarProduto}
                  disabled={salvando || !produtoSelecionado || quantidade <= 0 || valorUnitario < 0}
                  sx={{
                    height: { xs: 48, sm: 56 },
                    fontWeight: 'bold',
                    fontSize: { xs: '0.9rem', sm: '1rem' }
                  }}
                >
                  Adicionar
                </Button>
              </Grid>

              {produtoSelecionado && (
                <>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Quantidade"
                      data-pdv-item="true"
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

                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Valor Unitário"
                      data-pdv-item="true"
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

                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      select
                      size="small"
                      label="Tipo"
                      value={tipoDescontoItem}
                      onChange={(e) => {
                        setTipoDescontoItem(e.target.value === 'percentual' ? 'percentual' : 'valor');
                        setDescontoItem(0);
                      }}
                      sx={{ mb: 1 }}
                    >
                      <MenuItem value="valor">R$</MenuItem>
                      <MenuItem value="percentual">%</MenuItem>
                    </TextField>
                    <TextField
                      fullWidth
                      type="number"
                      label={`Desconto (${tipoDescontoItem === 'percentual' ? '%' : 'R$'})`}
                      data-pdv-item="true"
                      value={descontoItem}
                      onChange={(e) => setDescontoItem(Math.max(0, parseFloat(e.target.value) || 0))}
                      InputProps={{
                        inputProps: {
                          min: 0,
                          step: tipoDescontoItem === 'percentual' ? 1 : 0.01,
                          max: tipoDescontoItem === 'percentual' ? 100 : undefined,
                        },
                        startAdornment: (
                          <InputAdornment position="start">
                            {tipoDescontoItem === 'percentual' ? <Percent fontSize="small" /> : <AttachMoney fontSize="small" />}
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Autocomplete
                      options={cores || []}
                      getOptionLabel={(option) => option.descricao || ''}
                      isOptionEqualToValue={(option, value) => option.id === value.id}
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


            </Grid>

            {produtoSelecionado && (
              <Box
                component={motion.div}
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: 'primary.main', color: 'primary.contrastText', mb: 2, borderRadius: 2 }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: { xs: 0.5, sm: 1 } }}>
                  <Box>
                    <Typography variant="body2" fontWeight="bold" sx={{ opacity: 0.9, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                      {produtoSelecionado.nome}
                    </Typography>
                    {corSelecionada && (
                      <Chip
                        label={corSelecionada.descricao}
                        size="small"
                        icon={<Palette />}
                        sx={{ mt: 0.5, bgcolor: 'rgba(255,255,255,0.2)', color: 'white', height: { xs: 20, sm: 24 } }}
                      />
                    )}
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 0.5, sm: 0 } }}>
                  <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    {formatCurrency(valorUnitario)} × {quantidade} unid.
                    {descontoItem > 0 && (() => {
                      const valorTotalPrevia = valorUnitario * quantidade;
                      const descontoCalculado = tipoDescontoItem === 'percentual'
                        ? (valorTotalPrevia * descontoItem) / 100
                        : descontoItem;
                      return ` - ${formatCurrency(descontoCalculado)}`;
                    })()}
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                    = {formatCurrency((() => {
                      const valorTotalPrevia = valorUnitario * quantidade;
                      const descontoCalculado = tipoDescontoItem === 'percentual'
                        ? (valorTotalPrevia * descontoItem) / 100
                        : descontoItem;
                      return valorTotalPrevia - descontoCalculado;
                    })())}
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Lista de Itens */}
            <Box sx={{ mt: 2, minHeight: 240 }}>
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
                    <ShoppingCart sx={{ fontSize: 40, mb: 2 }} />
                    <Typography fontWeight={600}>Comece buscando um produto</Typography><Typography variant="body2" sx={{ mt: 1 }}>Use o nome ou código, selecione a quantidade e adicione ao pedido.</Typography>
                  </Box>
                ) : (
                  <TableContainer sx={{ overflowX: 'auto' }}>
                    <Table size="small" sx={operationalTable}>
                      <TableHead>
                        <TableRow>
                          <TableCell>Produto</TableCell>
                          <TableCell align="center">Qtd</TableCell>
                          <TableCell align="right" sx={{ display: { xs: 'none', xl: 'table-cell' } }}>Valor Unit.</TableCell>
<TableCell align="right" sx={{ display: 'none' }}>Desconto</TableCell>
                          <TableCell align="right">Total</TableCell>
                          <TableCell align="center">Ações</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pedidoAtual.itens.map((item, index) => (
                          <TableRow
                            key={index}
                            component={motion.tr}
                            initial={false}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                          >
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {item.produto_nome}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'block', xl: 'none' } }}>{formatCurrency(item.valor_unitario)} por unidade{item.desconto_valor > 0 ? ' · Desconto ' + formatCurrency(item.desconto_valor) : ''}</Typography>
                              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                                {item.produto_codigo && (
                                  <Typography variant="caption" color="text.secondary">Cód: {item.produto_codigo}</Typography>
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
                                  sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                                  aria-label="Diminuir quantidade"
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
                                  sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                                  aria-label="Aumentar quantidade" onClick={() => atualizarItem(index, { quantidade: item.quantidade + 1 })}
                                >
                                  <Add fontSize="small" />
                                </IconButton>
                              </Box>
                            </TableCell>
                            <TableCell align="right" sx={{ display: { xs: 'none', xl: 'table-cell' } }}>
                              {editandoItem === index ? (
                                <TextField
                                  size="small"
                                  type="number"
                                  value={item.valor_unitario}
                                  inputProps={{'aria-label': 'Preço unitário do item'}}
                                  onChange={(e) => atualizarItem(index, { valor_unitario: parseFloat(e.target.value) || 0 })}
                                  onBlur={() => setEditandoItem(null)}
                                  autoFocus
                                  sx={{ width: 80 }}
                                  InputProps={{ inputProps: { min: 0, step: 0.01, 'aria-label': 'Preço unitário do item' } }}
                                />
                              ) : (
                                <Box
                                  role="button" tabIndex={0} aria-label="Editar preço do item" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditandoItem(index); } }} onClick={() => setEditandoItem(index)}
                                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, borderRadius: 1, px: 1 }}
                                >
                                  {formatCurrency(item.valor_unitario)}
                                  <Edit sx={{ fontSize: 12, ml: 0.5, opacity: 0.5 }} />
                                </Box>
                              )}
                            </TableCell>
<TableCell align="right" sx={{ display: 'none' }}>
                              <TextField
                                size="small"
                                type="number"
                                value={item.desconto_valor}
                                inputProps={{'aria-label': 'Desconto do item'}}
                                onChange={(e) => atualizarItem(index, { desconto_valor: parseFloat(e.target.value) || 0 })}
                                sx={{ width: 80 }}
                                InputProps={{
                                  inputProps: { min: 0, step: 0.01, 'aria-label': 'Desconto do item' },
                                  startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                                }}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Typography fontWeight="bold">{formatCurrency(item.valor_total)}</Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Box sx={{
                                display: 'flex',
                                flexDirection: { xs: 'column', sm: 'row' },
                                gap: { xs: 0.5, sm: 0.5 },
                                justifyContent: 'center',
                                alignItems: 'center'
                              }}>
                                <Tooltip title="Editar item"><IconButton aria-label="Editar quantidade, preço e desconto do item" onClick={()=>abrirEdicaoItem(index)}><Edit /></IconButton></Tooltip>
                                <IconButton aria-label={'Mais ações do item ' + item.produto_nome} aria-haspopup="menu" onClick={e => setItemMenu({ anchor: e.currentTarget, index })}><MoreVert fontSize="small" /></IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </AnimatePresence>

              {/* Botão Mobile para ir para Pagamento */}
              {isMobile && activeStep === 0 && (
                <Box sx={{ mt: 3 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    color="primary"
                    endIcon={<NavigateNext />}
                    onClick={() => setActiveStep(1)}
                    disabled={pedidoAtual.itens.length === 0}
                  >
                    Continuar para Pagamento ({formatCurrency(pedidoAtual.total)})
                  </Button>
                </Box>
              )}
            </Box>
          </Card>
        </Grid>

        {/* Resumo e Finalização */}
        <Grid
          item
          xs={12}
          lg={4}
          sx={{
            order: 2,
            display: { xs: activeStep === 1 ? 'block' : 'none', md: 'block' }
          }}
        >
          <Card sx={{ ...operationalSurface, p: { xs: 1.5, sm: 2.5 }, '& .MuiAccordion-root': { boxShadow: 'none', bgcolor: 'transparent', '&:before': { display: 'none' }, borderBottom: '1px solid', borderColor: 'divider' }, '& .MuiAccordionSummary-root': { px: 0 }, '& .MuiAccordionDetails-root': { px: 0 } }}>
            {isMobile && (
              <Button
                startIcon={<NavigateNext sx={{ transform: 'rotate(180deg)' }} />}
                onClick={() => setActiveStep(0)}
                sx={{ mb: 2 }}
              >
                Voltar para Produtos
              </Button>
            )}
            {/* Dados do Cliente */}
            <SaleSection compact={isMobile} expanded={accordionExpandido === 'cliente'} onChange={open => setAccordionExpandido(open ? 'cliente' : false)} title={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Person color="primary" />
                  <Typography fontWeight="bold">
                    Cliente
                  </Typography>
                </Box>}>

                <Grid container spacing={1.5}>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Autocomplete
                        fullWidth
                        filterOptions={options => options}
                        options={clientes?.clientes || []}
                        getOptionLabel={(option) => option.nome || ''}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        value={clienteSelecionado}
                        onChange={(_, newValue) => {
                          setEnderecoSelecionado(null);
                          setPedidoAtual({ endereco_id: undefined });
                          setClienteSelecionado(newValue);
                          setTelefoneContato(newValue?.telefone || '');
                          setPedidoAtual({ cliente_id: newValue?.id, cliente_nome: newValue?.nome });
                        }}
                        onInputChange={(_, value) => setSearchCliente(value)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            inputRef={clienteInputRef}
                            label="Cliente (F3)"
                            placeholder="Nome, CPF ou telefone"
                            size="small"
                          />
                        )}
                      />
                      <Button
                        variant="outlined"
                        startIcon={<PersonAdd />}
                        onClick={() => setDialogNovoCliente(true)}
                        sx={{ minWidth: { xs: 80, sm: 120 } }}
                      >
                        Novo
                      </Button>
                    </Box>
                  </Grid>

                  {clienteSelecionado && (
                    <>
                      {carregandoCliente && <Grid item xs={12}><Typography role="status">Carregando endereços...</Typography></Grid>}
                      {erroCliente && <Grid item xs={12}><Alert severity="error" action={<Button color="inherit" onClick={() => recarregarCliente()}>Tentar novamente</Button>}>Não foi possível carregar os endereços do cliente.</Alert></Grid>}
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

                      {clienteCompleto && clienteCompleto.id === clienteSelecionado.id && clienteCompleto.enderecos.length > 0 && (
                        <Grid item xs={12}>
                          <FormControl fullWidth size="small">
                            <InputLabel id="pdv-endereco-label">Endereço de Entrega</InputLabel>
                            <Select labelId="pdv-endereco-label"
                              value={enderecoSelecionado?.id || ''}
                              label="Endereço de Entrega"
                              renderValue={() => enderecoSelecionado ? enderecoSelecionado.principal ? 'Endereço principal' : 'Outro endereço selecionado' : 'Sem endereço'}
                              sx={{ '& .MuiSelect-select': { whiteSpace: 'normal', overflowWrap: 'anywhere' } }}
                              onChange={(e) => {
                                const endereco = clienteCompleto.enderecos.find((end) => end.id === e.target.value);
                                setEnderecoSelecionado(endereco ?? null);
                                setPedidoAtual({ endereco_id: e.target.value });
                              }}
                              startAdornment={
                                <InputAdornment position="start">
                                  <LocationOn fontSize="small" />
                                </InputAdornment>
                              }
                            >
                              {enderecosDisponiveis.map((endereco) => (
                                <MenuItem key={endereco.id} value={endereco.id} sx={{ whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
                                  {formatarEndereco(endereco)}
                                  {endereco.principal && ' (Principal)'}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          {enderecoSelecionado && <Typography variant="body2" sx={{ mt: 1, overflowWrap: 'anywhere' }}>{formatarEndereco(enderecoSelecionado)}</Typography>}
                        </Grid>
                      )}
                    </>
                  )}
                </Grid>

            </SaleSection>

            {/* Tipo de Atendimento e Pagamento */}
            <SaleSection compact={isMobile} expanded={accordionExpandido === 'atendimento'} onChange={open => setAccordionExpandido(open ? 'atendimento' : false)} title={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Category color="primary" />
                  <Typography fontWeight="bold">Tipo de Atendimento e Pagamento</Typography>
                </Box>}>

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="pdv-tipo-label">Tipo de Atendimento *</InputLabel>
                      <Select labelId="pdv-tipo-label"
                        value={tipoAtendimentoId}
                        label="Tipo de Atendimento *"
                        onChange={(e) => {
                          setTipoAtendimentoId(e.target.value);
                          setPedidoAtual({ tipo_atendimento_id: e.target.value });
                        }}
                      >
                        {tiposAtendimento?.map((tipo) => (
                          <MenuItem key={tipo.id} value={tipo.id}>
                            {tipo.nome} {tipo.tipo && `(${tipo.tipo})`}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="pdv-pagamento-label">Forma de Pagamento *</InputLabel>
                      <Select labelId="pdv-pagamento-label"
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
                        {formasPagamento?.map((forma) => (
                          <MenuItem key={forma.id} value={forma.id}>
                            {forma.nome}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

            </SaleSection>

            {/* Observações */}
            <SaleSection compact={isMobile} expanded={accordionExpandido === 'observacoes'} onChange={open => setAccordionExpandido(open ? 'observacoes' : false)} title={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Notes color="primary" />
                  <Typography fontWeight="bold">Observações</Typography>
                </Box>}>

                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Observações sobre o pedido"
                  placeholder="Digite aqui observações adicionais..."
                  value={observacoes}
                  onChange={(e) => {
                    setObservacoes(e.target.value);
                    setPedidoAtual({ observacao: e.target.value });
                  }}
                />

            </SaleSection>

            {/* Desconto Geral */}
            <Box sx={{ bgcolor: 'background.default', borderRadius: '12px', p: 1.5 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Percent /> Desconto Geral
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={4}>
                  <TextField
                    fullWidth
                    select
                    size="small"
                    label="Tipo"
                    value={tipoDescontoGeral}
                    onChange={(e) => setTipoDescontoGeral(e.target.value === 'percentual' ? 'percentual' : 'valor')}
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
                    label="Desconto"
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
                    aria-label="Aplicar desconto geral" onClick={handleAplicarDescontoGeral}
                  >
                    OK
                  </Button>
                </Grid>
              </Grid>
            </Box>

          </Card>
        </Grid>
      </Grid>

      <Box component="section" aria-label="Resumo financeiro e ações do pedido" sx={{ position: 'fixed', bottom: 0, left: { xs: 0, md: 240 }, right: 0, zIndex: theme.zIndex.appBar + 1, bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider', px: { xs: 2, sm: 3 }, py: 1.5, pb: 'max(12px, env(safe-area-inset-bottom))', display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', boxShadow: '0 -4px 16px rgb(15 23 42 / 0.06)' }}>
        <Box sx={{ flex: 1, minWidth: 180 }}>
          <Typography variant="caption" color="text.secondary">{pedidoAtual.itens.length} itens · {pedidoAtual.itens.reduce((acc, item) => acc + item.quantidade, 0)} unidades</Typography>
          <Typography variant="body2" color="text.secondary">Subtotal {formatCurrency(pedidoAtual.subtotal)} · Desconto geral {formatCurrency(pedidoAtual.desconto_valor)}</Typography>
        </Box>
        <Box sx={{ minWidth: 130 }}><Typography variant="caption" fontWeight={600}>Total</Typography><Typography variant="h5" color="primary.main" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(pedidoAtual.total)}</Typography></Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', width: { xs: '100%', lg: 'auto' } }}>
          <Button variant="contained" startIcon={<Check />} onClick={handleFinalizarPedido} disabled={salvando || redeDisponivel === false || pedidoAtual.itens.length === 0}>{modoEdicao ? 'Salvar alterações' : 'Salvar pedido'}</Button>
          <Button sx={{ display: { xs: 'none', sm: 'inline-flex' } }} variant="outlined" startIcon={<Print />} onClick={() => { void handleImprimirPedido('print'); }} disabled={pedidoAtual.itens.length === 0}>{modoEdicao ? 'Imprimir prévia' : 'Imprimir rascunho'}</Button>
          <Button sx={{ display: { xs: 'none', sm: 'inline-flex' } }} color="error" onClick={() => { if (confirm('Descartar o rascunho deste pedido?')) { limparCarrinho(); limparCamposVenda(); } }} disabled={salvando || pedidoAtual.itens.length === 0}>Descartar</Button>
          <Tooltip title={modoEdicao ? 'Imprimir prévia' : 'Imprimir rascunho'}><span><IconButton sx={{ display: { xs: 'inline-flex', sm: 'none' } }} aria-label={modoEdicao ? 'Imprimir prévia' : 'Imprimir rascunho'} onClick={() => { void handleImprimirPedido('print'); }} disabled={pedidoAtual.itens.length === 0}><Print /></IconButton></span></Tooltip>
          <Tooltip title="Descartar rascunho"><span><IconButton color="error" sx={{ display: { xs: 'inline-flex', sm: 'none' } }} aria-label="Descartar rascunho" onClick={() => { if (confirm('Descartar o rascunho deste pedido?')) { limparCarrinho(); limparCamposVenda(); } }} disabled={salvando || pedidoAtual.itens.length === 0}><Delete /></IconButton></span></Tooltip>
        </Box>
      </Box>

      <Menu anchorEl={itemMenu?.anchor} open={!!itemMenu} onClose={() => setItemMenu(null)}>
        <MenuItem onClick={() => { if (itemMenu) handleDuplicarLinha(itemMenu.index); setItemMenu(null); }}><ContentCopy fontSize="small" sx={{ mr: 1 }} />Duplicar item</MenuItem>
        <MenuItem sx={{ color: 'error.main' }} onClick={() => { if (itemMenu) removerItem(itemMenu.index); setItemMenu(null); }}><Delete fontSize="small" sx={{ mr: 1 }} />Remover item</MenuItem>
      </Menu>
      <Dialog open={!!pedidoSalvo} onClose={() => setPedidoSalvo(null)} fullWidth maxWidth="sm" aria-labelledby="pdv-pedido-salvo-titulo">
        <DialogTitle id="pdv-pedido-salvo-titulo">Pedido #{pedidoSalvo?.numero} salvo</DialogTitle>
        <DialogContent><Alert severity="success">Pedido salvo como Pendente. A finalização está disponível em Pedidos.</Alert></DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1, flexWrap: 'wrap' }}>
          <Button onClick={() => { if (pedidoSalvo) router.push('/pedidos?id=' + pedidoSalvo.id); }}>Abrir pedido e imprimir</Button>
          <Button variant="contained" onClick={() => { setPedidoSalvo(null); setActiveStep(0); produtoInputRef.current?.focus(); }}>Nova venda</Button>
        </DialogActions>
      </Dialog>
      {/* Dialog de Finalização */}
      <Dialog aria-labelledby="pdv-conferir-titulo" open={dialogFinalizar} onClose={() => { if (!salvandoRef.current) setDialogFinalizar(false); }} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle id="pdv-conferir-titulo" sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Receipt />
            Conferir pedido
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 3 }}>
            {!modoEdicao && <Alert severity="info" sx={{ mb: 2 }}>O pedido será salvo como Pendente. Você poderá finalizá-lo em Pedidos.</Alert>}
            {/* Valor Total */}
            <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', p: 3, borderRadius: 2, mb: 3, textAlign: 'center' }}>
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
                      {formatarEndereco(enderecoSelecionado)}
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
                      {tiposAtendimento?.find((t) => t.id === tipoAtendimentoId)?.nome || '-'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Forma de Pagamento:
                    </Typography>
                    <Typography fontWeight="bold">
                      {formasPagamento?.find((f) => f.id === formaPagamentoId)?.nome || '-'}
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
            <Button disabled={salvando} onClick={() => setDialogFinalizar(false)} variant="outlined" size="large">
              Voltar
            </Button>
            <Button
              disabled={salvando}
              onClick={handleConfirmarPedido}
              variant="contained"
              size="large"
              startIcon={<Check />}
              autoFocus
            >
              Salvar pedido
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      <Dialog open={itemEdicaoMovel!==null} onClose={()=>setItemEdicaoMovel(null)} fullWidth maxWidth="xs">
        <DialogTitle>Editar item</DialogTitle><DialogContent><Box sx={{display:'grid',gap:2,pt:2}}>
          <TextField label="Quantidade" type="number" inputProps={{min:0.001,step:0.001}} value={valoresItem.quantidade} onChange={e=>setValoresItem(v=>({...v,quantidade:e.target.value}))} />
          <TextField label="Preço unitário (R$)" type="number" inputProps={{min:0,step:0.01}} value={valoresItem.valor_unitario} onChange={e=>setValoresItem(v=>({...v,valor_unitario:e.target.value}))} />
          <TextField label="Desconto do item (R$)" type="number" inputProps={{min:0,step:0.01}} value={valoresItem.desconto_valor} onChange={e=>setValoresItem(v=>({...v,desconto_valor:e.target.value}))} />
        </Box></DialogContent><DialogActions><Button onClick={()=>setItemEdicaoMovel(null)}>Cancelar</Button><Button variant="contained" onClick={()=>{if(itemEdicaoMovel===null)return;try{atualizarItemStore(itemEdicaoMovel,{quantidade:Number(valoresItem.quantidade),valor_unitario:Number(valoresItem.valor_unitario),desconto_valor:Number(valoresItem.desconto_valor)});setItemEdicaoMovel(null);}catch(e){toast.error(e instanceof Error?e.message:'Confira os valores do item.');}}}>Salvar item</Button></DialogActions>
      </Dialog>
      {/* Dialog de Criar Novo Cliente */}
      <Dialog open={dialogNovoCliente} onClose={() => setDialogNovoCliente(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
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
              <Grid item xs={12}><ClienteDadosFields value={{nome:novoClienteNome,cpf:novoClienteCPF,telefone:novoClienteTelefone,email:novoClienteEmail}} onChange={v=>{setNovoClienteNome(v.nome);setNovoClienteCPF(v.cpf);setNovoClienteTelefone(v.telefone);setNovoClienteEmail(v.email);}} /></Grid>
              <Grid item xs={12}>
                <EnderecoFields value={novoClienteEndereco} onChange={setNovoClienteEndereco} />
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
              setNovoClienteTelefone(''); setNovoClienteEmail('');
              setNovoClienteEndereco({ ...enderecoVazio });
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

      {/* Dialog de Cadastrar Novo Produto */}
      <Dialog open={dialogNovoProduto} onClose={() => setDialogNovoProduto(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Category color="primary" />
          Cadastrar Novo Produto (Ctrl+P)
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              Cadastro rápido de produto. Você pode completar os dados depois na página de Produtos.
            </Alert>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nome do Produto *"
                  value={novoProdutoNome}
                  onChange={(e) => setNovoProdutoNome(e.target.value)}
                  placeholder="Ex: Camiseta Polo"
                  autoFocus
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Category fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Código / SKU"
                  value={novoProdutoCodigo}
                  onChange={(e) => setNovoProdutoCodigo(e.target.value)}
                  placeholder="Ex: POLO-001"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        #
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Unidade"
                  value={novoProdutoUnidade}
                  onChange={(e) => setNovoProdutoUnidade(e.target.value)}
                >
                  <MenuItem value="UN">Unidade</MenuItem>
                  <MenuItem value="PC">Peça</MenuItem>
                  <MenuItem value="KG">Quilograma</MenuItem>
                  <MenuItem value="M">Metro</MenuItem>
                  <MenuItem value="CX">Caixa</MenuItem>
                  <MenuItem value="PAR">Par</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="number"
                  label="Valor Base *"
                  value={novoProdutoValor}
                  onChange={(e) => setNovoProdutoValor(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0,00"
                  required
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
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => {
              setDialogNovoProduto(false);
              setNovoProdutoNome('');
              setNovoProdutoCodigo('');
              setNovoProdutoValor(0);
              setNovoProdutoUnidade('UN');
            }}
            variant="outlined"
            size="large"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCriarProduto}
            variant="contained"
            size="large"
            disabled={!novoProdutoNome.trim() || novoProdutoValor <= 0}
            startIcon={<Check />}
          >
            Cadastrar e Adicionar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Atalhos */}
      <Dialog open={dialogAtalhos} onClose={() => setDialogAtalhos(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'primary.main', color: 'white' }}>
          <Keyboard />
          Atalhos de Teclado
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
              Use estes atalhos para aumentar sua produtividade no PDV:
            </Typography>

            <Grid container spacing={2}>
              {/* F2 */}
              <Grid item xs={4}>
                <Chip
                  label="F2"
                  color="primary"
                  sx={{ fontWeight: 'bold', fontSize: '0.9rem', width: '100%' }}
                />
              </Grid>
              <Grid item xs={8}>
                <Typography variant="body2">
                  <strong>Buscar Produtos</strong><br />
                  <Typography variant="caption" color="text.secondary">
                    Foca no campo de busca de produtos
                  </Typography>
                </Typography>
              </Grid>

              {/* F3 */}
              <Grid item xs={4}>
                <Chip
                  label="F3"
                  color="primary"
                  sx={{ fontWeight: 'bold', fontSize: '0.9rem', width: '100%' }}
                />
              </Grid>
              <Grid item xs={8}>
                <Typography variant="body2">
                  <strong>Buscar Clientes</strong><br />
                  <Typography variant="caption" color="text.secondary">
                    Foca no campo de busca de clientes
                  </Typography>
                </Typography>
              </Grid>

              {/* F12 */}
              <Grid item xs={4}>
                <Chip
                  label="F12"
                  color="success"
                  sx={{ fontWeight: 'bold', fontSize: '0.9rem', width: '100%' }}
                />
              </Grid>
              <Grid item xs={8}>
                <Typography variant="body2">
                  <strong>Salvar pedido</strong><br />
                  <Typography variant="caption" color="text.secondary">
                    Abre a tela de finalização
                  </Typography>
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
              </Grid>

              {/* Enter */}
              <Grid item xs={4}>
                <Chip
                  label="Enter"
                  color="default"
                  sx={{ fontWeight: 'bold', fontSize: '0.9rem', width: '100%' }}
                />
              </Grid>
              <Grid item xs={8}>
                <Typography variant="body2">
                  <strong>Adicionar Produto</strong><br />
                  <Typography variant="caption" color="text.secondary">
                    Adiciona produto selecionado ao carrinho
                  </Typography>
                </Typography>
              </Grid>

              {/* Esc */}
              <Grid item xs={4}>
                <Chip
                  label="Esc"
                  color="default"
                  sx={{ fontWeight: 'bold', fontSize: '0.9rem', width: '100%' }}
                />
              </Grid>
              <Grid item xs={8}>
                <Typography variant="body2">
                  <strong>Cancelar</strong><br />
                  <Typography variant="caption" color="text.secondary">
                    Limpa a seleção atual
                  </Typography>
                </Typography>
              </Grid>

              {/* Ctrl+P */}
              <Grid item xs={4}>
                <Chip
                  label="Ctrl+P"
                  color="secondary"
                  sx={{ fontWeight: 'bold', fontSize: '0.9rem', width: '100%' }}
                />
              </Grid>
              <Grid item xs={8}>
                <Typography variant="body2">
                  <strong>Novo Produto</strong><br />
                  <Typography variant="caption" color="text.secondary">
                    Abre cadastro rápido de produto
                  </Typography>
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => setDialogAtalhos(false)}
            variant="contained"
            size="large"
            fullWidth
          >
            Entendi
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
