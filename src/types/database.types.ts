export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      categorias: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      clientes: {
        Row: {
          ativo: boolean | null
          cpf: string | null
          created_at: string | null
          email: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      configuracoes_empresa: {
        Row: {
          ativo: boolean | null
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          complemento: string | null
          cor_primaria: string | null
          cor_secundaria: string | null
          created_at: string | null
          email: string | null
          estado: string | null
          facebook: string | null
          id: string
          instagram: string | null
          logo_pequeno_url: string | null
          logo_url: string | null
          logradouro: string | null
          mostrar_logo_relatorio: boolean | null
          nome_empresa: string
          nome_sistema: string | null
          numero: string | null
          razao_social: string | null
          rodape_relatorio: string | null
          site: string | null
          telefone: string | null
          updated_at: string | null
          versao_sistema: string | null
        }
        Insert: {
          ativo?: boolean | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string | null
          email?: string | null
          estado?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          logo_pequeno_url?: string | null
          logo_url?: string | null
          logradouro?: string | null
          mostrar_logo_relatorio?: boolean | null
          nome_empresa: string
          nome_sistema?: string | null
          numero?: string | null
          razao_social?: string | null
          rodape_relatorio?: string | null
          site?: string | null
          telefone?: string | null
          updated_at?: string | null
          versao_sistema?: string | null
        }
        Update: {
          ativo?: boolean | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string | null
          email?: string | null
          estado?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          logo_pequeno_url?: string | null
          logo_url?: string | null
          logradouro?: string | null
          mostrar_logo_relatorio?: boolean | null
          nome_empresa?: string
          nome_sistema?: string | null
          numero?: string | null
          razao_social?: string | null
          rodape_relatorio?: string | null
          site?: string | null
          telefone?: string | null
          updated_at?: string | null
          versao_sistema?: string | null
        }
        Relationships: []
      }
      cores: {
        Row: {
          ativo: boolean | null
          codigo: string | null
          created_at: string | null
          descricao: string
          id: string
          linha: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          codigo?: string | null
          created_at?: string | null
          descricao: string
          id?: string
          linha?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          codigo?: string | null
          created_at?: string | null
          descricao?: string
          id?: string
          linha?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      enderecos: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          cliente_id: string
          complemento: string | null
          created_at: string | null
          estado: string | null
          id: string
          logradouro: string
          numero: string | null
          principal: boolean | null
          updated_at: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cliente_id: string
          complemento?: string | null
          created_at?: string | null
          estado?: string | null
          id?: string
          logradouro: string
          numero?: string | null
          principal?: boolean | null
          updated_at?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cliente_id?: string
          complemento?: string | null
          created_at?: string | null
          estado?: string | null
          id?: string
          logradouro?: string
          numero?: string | null
          principal?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enderecos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          }
        ]
      }
      formas_pagamento: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      itens_pedido: {
        Row: {
          cor_id: string | null
          created_at: string | null
          desconto_percentual: number | null
          desconto_valor: number | null
          id: string
          ordem: number | null
          pedido_id: string
          produto_id: string
          quantidade: number
          updated_at: string | null
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          cor_id?: string | null
          created_at?: string | null
          desconto_percentual?: number | null
          desconto_valor?: number | null
          id?: string
          ordem?: number | null
          pedido_id: string
          produto_id: string
          quantidade?: number
          updated_at?: string | null
          valor_total?: number
          valor_unitario?: number
        }
        Update: {
          cor_id?: string | null
          created_at?: string | null
          desconto_percentual?: number | null
          desconto_valor?: number | null
          id?: string
          ordem?: number | null
          pedido_id?: string
          produto_id?: string
          quantidade?: number
          updated_at?: string | null
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "itens_pedido_cor_id_fkey"
            columns: ["cor_id"]
            isOneToOne: false
            referencedRelation: "cores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_pedido_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_pedido_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          }
        ]
      }
      pedidos: {
        Row: {
          cliente_id: string | null
          created_at: string | null
          created_by: string | null
          data: string
          desconto_percentual: number | null
          desconto_valor: number | null
          descricao: string | null
          endereco_id: string | null
          forma_pagamento_id: string | null
          id: string
          numero: number | null
          observacao: string | null
          status: string | null
          subtotal: number | null
          tipo_atendimento_id: string | null
          total: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string | null
          created_by?: string | null
          data: string
          desconto_percentual?: number | null
          desconto_valor?: number | null
          descricao?: string | null
          endereco_id?: string | null
          forma_pagamento_id?: string | null
          id?: string
          numero?: number | null
          observacao?: string | null
          status?: string | null
          subtotal?: number | null
          tipo_atendimento_id?: string | null
          total?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string | null
          created_by?: string | null
          data?: string
          desconto_percentual?: number | null
          desconto_valor?: number | null
          descricao?: string | null
          endereco_id?: string | null
          forma_pagamento_id?: string | null
          id?: string
          numero?: number | null
          observacao?: string | null
          status?: string | null
          subtotal?: number | null
          tipo_atendimento_id?: string | null
          total?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_endereco_id_fkey"
            columns: ["endereco_id"]
            isOneToOne: false
            referencedRelation: "enderecos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_forma_pagamento_id_fkey"
            columns: ["forma_pagamento_id"]
            isOneToOne: false
            referencedRelation: "formas_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_tipo_atendimento_id_fkey"
            columns: ["tipo_atendimento_id"]
            isOneToOne: false
            referencedRelation: "tipos_atendimento"
            referencedColumns: ["id"]
          }
        ]
      }
      produtos: {
        Row: {
          ativo: boolean | null
          categoria_id: string | null
          codigo: string | null
          created_at: string | null
          id: string
          nome: string
          unidade: string | null
          updated_at: string | null
          valor_base: number
        }
        Insert: {
          ativo?: boolean | null
          categoria_id?: string | null
          codigo?: string | null
          created_at?: string | null
          id?: string
          nome: string
          unidade?: string | null
          updated_at?: string | null
          valor_base?: number
        }
        Update: {
          ativo?: boolean | null
          categoria_id?: string | null
          codigo?: string | null
          created_at?: string | null
          id?: string
          nome?: string
          unidade?: string | null
          updated_at?: string | null
          valor_base?: number
        }
        Relationships: [
          {
            foreignKeyName: "produtos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          }
        ]
      }
      tipos_atendimento: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: string
          nome: string
          tipo: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome: string
          tipo: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      vw_clientes_completos: {
        Row: {
          ativo: boolean | null
          cpf: string | null
          created_at: string | null
          endereco_principal_cep: string | null
          endereco_principal_id: string | null
          endereco_principal_logradouro: string | null
          id: string | null
          nome: string | null
          telefone: string | null
          total_pedidos: number | null
          valor_total_compras: number | null
        }
      }
      vw_itens_pedido_completos: {
        Row: {
          categoria_id: string | null
          categoria_nome: string | null
          cor_codigo: string | null
          cor_descricao: string | null
          cor_id: string | null
          cor_linha: string | null
          desconto_valor: number | null
          id: string | null
          ordem: number | null
          pedido_id: string | null
          produto_codigo: string | null
          produto_id: string | null
          produto_nome: string | null
          produto_unidade: string | null
          produto_valor_base: number | null
          quantidade: number | null
          valor_total: number | null
          valor_unitario: number | null
        }
      }
      vw_pedidos_completos: {
        Row: {
          cliente_cpf: string | null
          cliente_id: string | null
          cliente_nome: string | null
          cliente_telefone: string | null
          created_at: string | null
          data: string | null
          desconto_valor: number | null
          descricao: string | null
          endereco_cep: string | null
          endereco_id: string | null
          endereco_logradouro: string | null
          forma_pagamento_id: string | null
          forma_pagamento_nome: string | null
          id: string | null
          numero: number | null
          observacao: string | null
          status: string | null
          subtotal: number | null
          tipo_atendimento_id: string | null
          tipo_atendimento_nome: string | null
          tipo_atendimento_tipo: string | null
          total: number | null
          total_itens: number | null
          total_quantidade: number | null
          updated_at: string | null
        }
      }
      vw_produtos_completos: {
        Row: {
          ativo: boolean | null
          categoria_id: string | null
          categoria_nome: string | null
          codigo: string | null
          cores_usadas: string[] | null
          id: string | null
          nome: string | null
          unidade: string | null
          valor_base: number | null
        }
      }
    }
    Functions: {
      converter_valor_monetario: {
        Args: { valor: string }
        Returns: number
      }
      duplicar_pedido: {
        Args: { pedido_original_id: string }
        Returns: string
      }
      obter_proximo_numero_pedido: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      relatorio_vendas_anual: {
        Args: { ano: number }
        Returns: {
          forma_pagamento_nome: string
          mes: number
          total_vendas: number
          total_despesas: number
        }[]
      }
      relatorio_vendas_periodo: {
        Args: { data_fim: string; data_inicio: string }
        Returns: {
          data: string
          total_itens: number
          total_pedidos: number
          valor_total: number
        }[]
      }
      top_produtos_vendidos: {
        Args: { data_fim?: string; data_inicio?: string; limite?: number }
        Returns: {
          categoria_nome: string
          produto_id: string
          produto_nome: string
          quantidade_vendida: number
          total_vendas: number
          valor_total: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
