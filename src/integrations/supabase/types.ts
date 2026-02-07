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
      accounts_payable: {
        Row: {
          acrescimo: number
          categoria: string
          centro_custo: string | null
          comprovante_url: string | null
          created_at: string
          data_emissao: string
          data_pagamento: string | null
          data_vencimento: string | null
          desconto: number
          descricao: string | null
          empresa_id: string
          forma_pagamento: string
          id: string
          metodo_pagamento: string | null
          numero_documento: string | null
          observacoes: string | null
          projeto: string | null
          status: string
          supplier_id: string
          tipo_lancamento: string
          updated_at: string
          valor_bruto: number
          valor_liquido: number
          vincular_estoque: boolean
        }
        Insert: {
          acrescimo?: number
          categoria: string
          centro_custo?: string | null
          comprovante_url?: string | null
          created_at?: string
          data_emissao?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          desconto?: number
          descricao?: string | null
          empresa_id: string
          forma_pagamento: string
          id?: string
          metodo_pagamento?: string | null
          numero_documento?: string | null
          observacoes?: string | null
          projeto?: string | null
          status?: string
          supplier_id: string
          tipo_lancamento: string
          updated_at?: string
          valor_bruto?: number
          valor_liquido?: number
          vincular_estoque?: boolean
        }
        Update: {
          acrescimo?: number
          categoria?: string
          centro_custo?: string | null
          comprovante_url?: string | null
          created_at?: string
          data_emissao?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          desconto?: number
          descricao?: string | null
          empresa_id?: string
          forma_pagamento?: string
          id?: string
          metodo_pagamento?: string | null
          numero_documento?: string | null
          observacoes?: string | null
          projeto?: string | null
          status?: string
          supplier_id?: string
          tipo_lancamento?: string
          updated_at?: string
          valor_bruto?: number
          valor_liquido?: number
          vincular_estoque?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "accounts_payable_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_payable_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      backups: {
        Row: {
          backup_data: Json
          backup_timestamp: string
          id: string
          services_count: number
        }
        Insert: {
          backup_data: Json
          backup_timestamp?: string
          id?: string
          services_count?: number
        }
        Update: {
          backup_data?: Json
          backup_timestamp?: string
          id?: string
          services_count?: number
        }
        Relationships: []
      }
      clientes: {
        Row: {
          created_at: string
          email: string | null
          id: string
          morada_codigo_postal: string | null
          morada_complemento: string | null
          morada_concelho: string | null
          morada_distrito: string | null
          morada_numero: string | null
          morada_pais: string | null
          morada_rua: string | null
          nif: string | null
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          morada_codigo_postal?: string | null
          morada_complemento?: string | null
          morada_concelho?: string | null
          morada_distrito?: string | null
          morada_numero?: string | null
          morada_pais?: string | null
          morada_rua?: string | null
          nif?: string | null
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          morada_codigo_postal?: string | null
          morada_complemento?: string | null
          morada_concelho?: string | null
          morada_distrito?: string | null
          morada_numero?: string | null
          morada_pais?: string | null
          morada_rua?: string | null
          nif?: string | null
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      empresas: {
        Row: {
          cor_accent: string | null
          cor_primaria: string
          cor_secundaria: string | null
          created_at: string
          id: string
          logo_path: string | null
          nome: string
          nome_legal: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          cor_accent?: string | null
          cor_primaria?: string
          cor_secundaria?: string | null
          created_at?: string
          id?: string
          logo_path?: string | null
          nome: string
          nome_legal?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          cor_accent?: string | null
          cor_primaria?: string
          cor_secundaria?: string | null
          created_at?: string
          id?: string
          logo_path?: string | null
          nome?: string
          nome_legal?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      liquidacoes: {
        Row: {
          created_at: string
          data_pagamento: string
          forma_pagamento: string | null
          id: string
          observacoes: string | null
          service_id: string
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          data_pagamento: string
          forma_pagamento?: string | null
          id?: string
          observacoes?: string | null
          service_id: string
          updated_at?: string
          valor?: number
        }
        Update: {
          created_at?: string
          data_pagamento?: string
          forma_pagamento?: string | null
          id?: string
          observacoes?: string | null
          service_id?: string
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          empresa_id: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          empresa_id?: string | null
          id: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          empresa_id?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          a_realizar: boolean
          cliente: string
          cliente_id: string | null
          contrato: string | null
          contrato_id: string | null
          created_at: string
          data: string
          email: string | null
          empresa_id: string
          fatura: string | null
          id: string
          liquidado: number
          numero_fatura: string | null
          proposta: string | null
          resumo: string | null
          service_id: string
          servico: string
          telefone: string | null
          tipo_servico: string
          updated_at: string
          valor_com_iva: number
          valor_faturado: number | null
          valor_sem_iva: number
        }
        Insert: {
          a_realizar?: boolean
          cliente: string
          cliente_id?: string | null
          contrato?: string | null
          contrato_id?: string | null
          created_at?: string
          data: string
          email?: string | null
          empresa_id: string
          fatura?: string | null
          id?: string
          liquidado?: number
          numero_fatura?: string | null
          proposta?: string | null
          resumo?: string | null
          service_id: string
          servico: string
          telefone?: string | null
          tipo_servico?: string
          updated_at?: string
          valor_com_iva?: number
          valor_faturado?: number | null
          valor_sem_iva?: number
        }
        Update: {
          a_realizar?: boolean
          cliente?: string
          cliente_id?: string | null
          contrato?: string | null
          contrato_id?: string | null
          created_at?: string
          data?: string
          email?: string | null
          empresa_id?: string
          fatura?: string | null
          id?: string
          liquidado?: number
          numero_fatura?: string | null
          proposta?: string | null
          resumo?: string | null
          service_id?: string
          servico?: string
          telefone?: string | null
          tipo_servico?: string
          updated_at?: string
          valor_com_iva?: number
          valor_faturado?: number | null
          valor_sem_iva?: number
        }
        Relationships: [
          {
            foreignKeyName: "services_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          agencia: string | null
          bairro: string | null
          banco: string | null
          categoria: string
          cep: string | null
          cidade: string | null
          cnpj_cpf: string
          complemento: string | null
          conta: string | null
          contato_principal: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          empresa_id: string
          estado: string | null
          id: string
          logradouro: string | null
          nome_fantasia: string | null
          numero: string | null
          observacoes: string | null
          razao_social: string
          status: string
          telefone: string | null
          telefone_secundario: string | null
          tipo_pessoa: string
          updated_at: string
        }
        Insert: {
          agencia?: string | null
          bairro?: string | null
          banco?: string | null
          categoria?: string
          cep?: string | null
          cidade?: string | null
          cnpj_cpf: string
          complemento?: string | null
          conta?: string | null
          contato_principal?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          empresa_id: string
          estado?: string | null
          id?: string
          logradouro?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          razao_social: string
          status?: string
          telefone?: string | null
          telefone_secundario?: string | null
          tipo_pessoa?: string
          updated_at?: string
        }
        Update: {
          agencia?: string | null
          bairro?: string | null
          banco?: string | null
          categoria?: string
          cep?: string | null
          cidade?: string | null
          cnpj_cpf?: string
          complemento?: string | null
          conta?: string | null
          contato_principal?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          empresa_id?: string
          estado?: string | null
          id?: string
          logradouro?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          razao_social?: string
          status?: string
          telefone?: string | null
          telefone_secundario?: string | null
          tipo_pessoa?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calcular_valor_faturado: {
        Args: { contrato_service_id: string }
        Returns: number
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

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
