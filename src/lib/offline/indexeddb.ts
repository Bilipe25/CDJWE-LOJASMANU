import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface PDVDatabase extends DBSchema {
  produtos: {
    key: string;
    value: {
      id: string;
      nome: string;
      codigo?: string;
      categoria_id?: string;
      categoria_nome?: string;
      valor_base: number;
      unidade: string;
      ativo: boolean;
      synced_at: number;
    };
    indexes: { 'by-nome': string };
  };
  clientes: {
    key: string;
    value: {
      id: string;
      nome: string;
      cpf?: string;
      telefone?: string;
      ativo: boolean;
      synced_at: number;
    };
    indexes: { 'by-nome': string };
  };
  pedidos_pendentes: {
    key: string;
    value: {
      id: string;
      data: string;
      cliente_id?: string;
      itens: any[];
      total: number;
      created_at: number;
      synced: boolean;
    };
  };
}

const DB_NAME = 'pdv-lojasmanu';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<PDVDatabase> | null = null;

export async function getDB(): Promise<IDBPDatabase<PDVDatabase>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<PDVDatabase>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Store de produtos
      if (!db.objectStoreNames.contains('produtos')) {
        const produtosStore = db.createObjectStore('produtos', { keyPath: 'id' });
        produtosStore.createIndex('by-nome', 'nome');
      }

      // Store de clientes
      if (!db.objectStoreNames.contains('clientes')) {
        const clientesStore = db.createObjectStore('clientes', { keyPath: 'id' });
        clientesStore.createIndex('by-nome', 'nome');
      }

      // Store de pedidos pendentes (não sincronizados)
      if (!db.objectStoreNames.contains('pedidos_pendentes')) {
        db.createObjectStore('pedidos_pendentes', { keyPath: 'id' });
      }
    },
  });

  return dbInstance;
}

// ============================================
// PRODUTOS
// ============================================
export async function syncProdutos(produtos: any[]) {
  const db = await getDB();
  const tx = db.transaction('produtos', 'readwrite');
  const store = tx.objectStore('produtos');

  const now = Date.now();
  for (const produto of produtos) {
    await store.put({
      ...produto,
      synced_at: now,
    });
  }

  await tx.done;
}

export async function getProdutosOffline(search?: string) {
  const db = await getDB();
  const produtos = await db.getAll('produtos');

  if (!search) return produtos;

  const searchLower = search.toLowerCase();
  return produtos.filter((p) => p.nome.toLowerCase().includes(searchLower));
}

// ============================================
// CLIENTES
// ============================================
export async function syncClientes(clientes: any[]) {
  const db = await getDB();
  const tx = db.transaction('clientes', 'readwrite');
  const store = tx.objectStore('clientes');

  const now = Date.now();
  for (const cliente of clientes) {
    await store.put({
      ...cliente,
      synced_at: now,
    });
  }

  await tx.done;
}

export async function getClientesOffline(search?: string) {
  const db = await getDB();
  const clientes = await db.getAll('clientes');

  if (!search) return clientes;

  const searchLower = search.toLowerCase();
  return clientes.filter(
    (c) =>
      c.nome.toLowerCase().includes(searchLower) ||
      c.cpf?.includes(searchLower) ||
      c.telefone?.includes(searchLower)
  );
}

// ============================================
// PEDIDOS PENDENTES (não sincronizados)
// ============================================
export async function savePedidoPendente(pedido: any) {
  const db = await getDB();
  await db.put('pedidos_pendentes', {
    ...pedido,
    created_at: Date.now(),
    synced: false,
  });
}

export async function getPedidosPendentes() {
  const db = await getDB();
  return await db.getAll('pedidos_pendentes');
}

export async function markPedidoSynced(id: string) {
  const db = await getDB();
  const pedido = await db.get('pedidos_pendentes', id);
  if (pedido) {
    pedido.synced = true;
    await db.put('pedidos_pendentes', pedido);
  }
}

export async function removePedidoPendente(id: string) {
  const db = await getDB();
  await db.delete('pedidos_pendentes', id);
}

// ============================================
// SYNC STATUS
// ============================================
export async function getLastSyncTime(store: 'produtos' | 'clientes'): Promise<number> {
  const db = await getDB();
  const items = await db.getAll(store as any);
  if (items.length === 0) return 0;

  return Math.max(...items.map((item: any) => item.synced_at || 0));
}

export async function clearAllData() {
  const db = await getDB();
  await db.clear('produtos');
  await db.clear('clientes');
  await db.clear('pedidos_pendentes');
}
