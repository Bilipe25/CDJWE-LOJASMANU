export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
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
          id: string
          nome: string
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cpf?: string | null
          created_at?: string | null
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cpf?: string | null
          created_at?: string | null
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
          endereco_principal: string | null
          endereco_principal_cep: string | null
          endereco_principal_id: string | null
          id: string | null
          nome: string | null
          telefone: string | null
          total_enderecos: number | null
        }
        Relationships: []
      }
      vw_itens_pedido_completos: {
        Row: {
          categoria_nome: string | null
          cor_codigo: string | null
          cor_descricao: string | null
          cor_id: string | null
          cor_linha: string | null
          desconto_percentual: number | null
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
        Relationships: []
      }
      vw_pedidos_completos: {
        Row: {
          atualizado_em: string | null
          cliente_cpf: string | null
          cliente_id: string | null
          cliente_nome: string | null
          cliente_telefone: string | null
          criado_em: string | null
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
        }
        Relationships: []
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
        Relationships: []
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
          total_despesas: number
          total_vendas: number
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never
