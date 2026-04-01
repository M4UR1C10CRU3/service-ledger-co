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
      account_payments: {
        Row: {
          account_payable_id: string
          comprovante_url: string | null
          created_at: string
          data_pagamento: string
          desconto: number
          empresa_id: string
          id: string
          juros: number
          metodo_pagamento: string | null
          multa: number
          observacoes: string | null
          updated_at: string
          valor_original: number
          valor_pago: number
        }
        Insert: {
          account_payable_id: string
          comprovante_url?: string | null
          created_at?: string
          data_pagamento?: string
          desconto?: number
          empresa_id: string
          id?: string
          juros?: number
          metodo_pagamento?: string | null
          multa?: number
          observacoes?: string | null
          updated_at?: string
          valor_original?: number
          valor_pago?: number
        }
        Update: {
          account_payable_id?: string
          comprovante_url?: string | null
          created_at?: string
          data_pagamento?: string
          desconto?: number
          empresa_id?: string
          id?: string
          juros?: number
          metodo_pagamento?: string | null
          multa?: number
          observacoes?: string | null
          updated_at?: string
          valor_original?: number
          valor_pago?: number
        }
        Relationships: [
          {
            foreignKeyName: "account_payments_account_payable_id_fkey"
            columns: ["account_payable_id"]
            isOneToOne: false
            referencedRelation: "accounts_payable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_payments_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts_payable: {
        Row: {
          acrescimo: number
          alert_sent: boolean | null
          alert_sent_at: string | null
          article_id: string | null
          categoria: string
          centro_custo: string | null
          comprovante_url: string | null
          cost_center_id: string | null
          created_at: string
          data_emissao: string
          data_pagamento: string | null
          data_vencimento: string | null
          days_before_alert: number | null
          desconto: number
          descricao: string | null
          empresa_id: string
          forma_pagamento: string
          id: string
          items: Json | null
          iva_rate: number | null
          iva_value: number | null
          metodo_pagamento: string | null
          numero_documento: string | null
          observacoes: string | null
          projeto: string | null
          quantity: number | null
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
          alert_sent?: boolean | null
          alert_sent_at?: string | null
          article_id?: string | null
          categoria: string
          centro_custo?: string | null
          comprovante_url?: string | null
          cost_center_id?: string | null
          created_at?: string
          data_emissao?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          days_before_alert?: number | null
          desconto?: number
          descricao?: string | null
          empresa_id: string
          forma_pagamento: string
          id?: string
          items?: Json | null
          iva_rate?: number | null
          iva_value?: number | null
          metodo_pagamento?: string | null
          numero_documento?: string | null
          observacoes?: string | null
          projeto?: string | null
          quantity?: number | null
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
          alert_sent?: boolean | null
          alert_sent_at?: string | null
          article_id?: string | null
          categoria?: string
          centro_custo?: string | null
          comprovante_url?: string | null
          cost_center_id?: string | null
          created_at?: string
          data_emissao?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          days_before_alert?: number | null
          desconto?: number
          descricao?: string | null
          empresa_id?: string
          forma_pagamento?: string
          id?: string
          items?: Json | null
          iva_rate?: number | null
          iva_value?: number | null
          metodo_pagamento?: string | null
          numero_documento?: string | null
          observacoes?: string | null
          projeto?: string | null
          quantity?: number | null
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
            foreignKeyName: "accounts_payable_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_payable_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
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
      alert_logs: {
        Row: {
          account_payable_id: string | null
          alert_type: string
          channel: string
          empresa_id: string
          error_message: string | null
          id: string
          message: string | null
          recipient: string
          sent_at: string | null
          status: string
          subject: string | null
        }
        Insert: {
          account_payable_id?: string | null
          alert_type: string
          channel: string
          empresa_id: string
          error_message?: string | null
          id?: string
          message?: string | null
          recipient: string
          sent_at?: string | null
          status?: string
          subject?: string | null
        }
        Update: {
          account_payable_id?: string | null
          alert_type?: string
          channel?: string
          empresa_id?: string
          error_message?: string | null
          id?: string
          message?: string | null
          recipient?: string
          sent_at?: string | null
          status?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_logs_account_payable_id_fkey"
            columns: ["account_payable_id"]
            isOneToOne: false
            referencedRelation: "accounts_payable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_logs_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_settings: {
        Row: {
          alert_email: string
          alert_whatsapp: string | null
          created_at: string | null
          days_before_due: number | null
          email_enabled: boolean | null
          empresa_id: string
          id: string
          send_after_overdue: boolean | null
          send_on_due_date: boolean | null
          updated_at: string | null
          whatsapp_enabled: boolean | null
        }
        Insert: {
          alert_email: string
          alert_whatsapp?: string | null
          created_at?: string | null
          days_before_due?: number | null
          email_enabled?: boolean | null
          empresa_id: string
          id?: string
          send_after_overdue?: boolean | null
          send_on_due_date?: boolean | null
          updated_at?: string | null
          whatsapp_enabled?: boolean | null
        }
        Update: {
          alert_email?: string
          alert_whatsapp?: string | null
          created_at?: string | null
          days_before_due?: number | null
          email_enabled?: boolean | null
          empresa_id?: string
          id?: string
          send_after_overdue?: boolean | null
          send_on_due_date?: boolean | null
          updated_at?: string | null
          whatsapp_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_settings_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          cost_price: number
          created_at: string
          current_stock: number
          description: string
          empresa_id: string
          id: string
          reference_code: string
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          cost_price?: number
          created_at?: string
          current_stock?: number
          description: string
          empresa_id: string
          id?: string
          reference_code: string
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          cost_price?: number
          created_at?: string
          current_stock?: number
          description?: string
          empresa_id?: string
          id?: string
          reference_code?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "articles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_supplier_id_fkey"
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
      cash_flows: {
        Row: {
          amount: number
          balance_after: number | null
          created_at: string
          deleted_at: string | null
          description: string
          empresa_id: string
          flow_type: string
          id: string
          movement_type: string
          notes: string | null
          reference: string | null
          source_id: string | null
          source_type: string
          transaction_date: string
          updated_at: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          created_at?: string
          deleted_at?: string | null
          description: string
          empresa_id: string
          flow_type: string
          id?: string
          movement_type: string
          notes?: string | null
          reference?: string | null
          source_id?: string | null
          source_type: string
          transaction_date?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          created_at?: string
          deleted_at?: string | null
          description?: string
          empresa_id?: string
          flow_type?: string
          id?: string
          movement_type?: string
          notes?: string | null
          reference?: string | null
          source_id?: string | null
          source_type?: string
          transaction_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_flows_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
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
      cost_centers: {
        Row: {
          created_at: string | null
          description: string | null
          empresa_id: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          empresa_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          empresa_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      email_history: {
        Row: {
          cliente_email: string
          cliente_nome: string
          created_at: string | null
          dias_atraso: number | null
          email_subject: string | null
          email_type: string | null
          empresa_id: string
          id: string
          sent_at: string | null
          service_id: string
          valor_debito: number | null
        }
        Insert: {
          cliente_email: string
          cliente_nome: string
          created_at?: string | null
          dias_atraso?: number | null
          email_subject?: string | null
          email_type?: string | null
          empresa_id: string
          id?: string
          sent_at?: string | null
          service_id: string
          valor_debito?: number | null
        }
        Update: {
          cliente_email?: string
          cliente_nome?: string
          created_at?: string | null
          dias_atraso?: number | null
          email_subject?: string | null
          email_type?: string | null
          empresa_id?: string
          id?: string
          sent_at?: string | null
          service_id?: string
          valor_debito?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "email_history_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          activities_summary: string | null
          admission_date: string | null
          autorizacao_residencia: string | null
          benefits: Json | null
          birth_date: string | null
          cartao_cidadao: string | null
          codigo_postal: string | null
          complemento: string | null
          concelho: string | null
          created_at: string
          daily_hours: number | null
          daily_hours_schedule: Json | null
          default_entry_time: string | null
          default_exit_time: string | null
          default_lunch_exit_time: string | null
          default_lunch_return_time: string | null
          department: string | null
          email: string | null
          empresa_id: string
          facebook: string | null
          freguesia: string | null
          full_name: string
          id: string
          instagram: string | null
          job_position_id: string | null
          linkedin: string | null
          monthly_salary: number | null
          nacionalidade: string | null
          nif: string | null
          niss: string | null
          pais: string | null
          passaporte: string | null
          phone: string | null
          photo_url: string | null
          status: string
          street: string | null
          street_number: string | null
          updated_at: string
          utente: string | null
          utilizador_id: string | null
          whatsapp: string | null
          work_schedule: Json | null
          workdays_per_week: number | null
        }
        Insert: {
          activities_summary?: string | null
          admission_date?: string | null
          autorizacao_residencia?: string | null
          benefits?: Json | null
          birth_date?: string | null
          cartao_cidadao?: string | null
          codigo_postal?: string | null
          complemento?: string | null
          concelho?: string | null
          created_at?: string
          daily_hours?: number | null
          daily_hours_schedule?: Json | null
          default_entry_time?: string | null
          default_exit_time?: string | null
          default_lunch_exit_time?: string | null
          default_lunch_return_time?: string | null
          department?: string | null
          email?: string | null
          empresa_id: string
          facebook?: string | null
          freguesia?: string | null
          full_name: string
          id?: string
          instagram?: string | null
          job_position_id?: string | null
          linkedin?: string | null
          monthly_salary?: number | null
          nacionalidade?: string | null
          nif?: string | null
          niss?: string | null
          pais?: string | null
          passaporte?: string | null
          phone?: string | null
          photo_url?: string | null
          status?: string
          street?: string | null
          street_number?: string | null
          updated_at?: string
          utente?: string | null
          utilizador_id?: string | null
          whatsapp?: string | null
          work_schedule?: Json | null
          workdays_per_week?: number | null
        }
        Update: {
          activities_summary?: string | null
          admission_date?: string | null
          autorizacao_residencia?: string | null
          benefits?: Json | null
          birth_date?: string | null
          cartao_cidadao?: string | null
          codigo_postal?: string | null
          complemento?: string | null
          concelho?: string | null
          created_at?: string
          daily_hours?: number | null
          daily_hours_schedule?: Json | null
          default_entry_time?: string | null
          default_exit_time?: string | null
          default_lunch_exit_time?: string | null
          default_lunch_return_time?: string | null
          department?: string | null
          email?: string | null
          empresa_id?: string
          facebook?: string | null
          freguesia?: string | null
          full_name?: string
          id?: string
          instagram?: string | null
          job_position_id?: string | null
          linkedin?: string | null
          monthly_salary?: number | null
          nacionalidade?: string | null
          nif?: string | null
          niss?: string | null
          pais?: string | null
          passaporte?: string | null
          phone?: string | null
          photo_url?: string | null
          status?: string
          street?: string | null
          street_number?: string | null
          updated_at?: string
          utente?: string | null
          utilizador_id?: string | null
          whatsapp?: string | null
          work_schedule?: Json | null
          workdays_per_week?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_job_position_id_fkey"
            columns: ["job_position_id"]
            isOneToOne: false
            referencedRelation: "job_positions"
            referencedColumns: ["id"]
          },
        ]
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
      feriados: {
        Row: {
          created_at: string
          data: string
          descricao: string
          empresa_id: string
          id: string
        }
        Insert: {
          created_at?: string
          data: string
          descricao: string
          empresa_id: string
          id?: string
        }
        Update: {
          created_at?: string
          data?: string
          descricao?: string
          empresa_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feriados_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      followup_contactos: {
        Row: {
          created_at: string
          data_contacto: string
          empresa_id: string
          fase_anterior: string | null
          fase_nova: string | null
          feedback_cliente: string | null
          id: string
          oportunidade_id: string
          probabilidade_apos: number | null
          proximo_followup_data: string | null
          proximo_followup_notas: string | null
          proximo_followup_tipo: string | null
          resultado: string | null
          sentimento: string | null
          tipo_contacto: string
          utilizador_id: string | null
          utilizador_nome: string | null
        }
        Insert: {
          created_at?: string
          data_contacto?: string
          empresa_id: string
          fase_anterior?: string | null
          fase_nova?: string | null
          feedback_cliente?: string | null
          id?: string
          oportunidade_id: string
          probabilidade_apos?: number | null
          proximo_followup_data?: string | null
          proximo_followup_notas?: string | null
          proximo_followup_tipo?: string | null
          resultado?: string | null
          sentimento?: string | null
          tipo_contacto: string
          utilizador_id?: string | null
          utilizador_nome?: string | null
        }
        Update: {
          created_at?: string
          data_contacto?: string
          empresa_id?: string
          fase_anterior?: string | null
          fase_nova?: string | null
          feedback_cliente?: string | null
          id?: string
          oportunidade_id?: string
          probabilidade_apos?: number | null
          proximo_followup_data?: string | null
          proximo_followup_notas?: string | null
          proximo_followup_tipo?: string | null
          resultado?: string | null
          sentimento?: string | null
          tipo_contacto?: string
          utilizador_id?: string | null
          utilizador_nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "followup_contactos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_contactos_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "followup_oportunidades"
            referencedColumns: ["id"]
          },
        ]
      }
      followup_historico_fases: {
        Row: {
          contacto_id: string | null
          data_transicao: string | null
          empresa_id: string
          fase_anterior: string | null
          fase_nova: string
          id: string
          notas: string | null
          oportunidade_id: string
          utilizador_id: string | null
          utilizador_nome: string | null
        }
        Insert: {
          contacto_id?: string | null
          data_transicao?: string | null
          empresa_id: string
          fase_anterior?: string | null
          fase_nova: string
          id?: string
          notas?: string | null
          oportunidade_id: string
          utilizador_id?: string | null
          utilizador_nome?: string | null
        }
        Update: {
          contacto_id?: string | null
          data_transicao?: string | null
          empresa_id?: string
          fase_anterior?: string | null
          fase_nova?: string
          id?: string
          notas?: string | null
          oportunidade_id?: string
          utilizador_id?: string | null
          utilizador_nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "followup_historico_fases_contacto_id_fkey"
            columns: ["contacto_id"]
            isOneToOne: false
            referencedRelation: "followup_contactos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_historico_fases_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_historico_fases_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "followup_oportunidades"
            referencedColumns: ["id"]
          },
        ]
      }
      followup_oportunidades: {
        Row: {
          cliente_id: string | null
          cliente_nome: string | null
          created_at: string
          data_adjudicacao_esperada: string | null
          data_adjudicacao_real: string | null
          data_ultimo_contacto: string | null
          empresa_id: string
          fase: string
          id: string
          motivo_arquivo: string | null
          notas_internas: string | null
          probabilidade: number | null
          proposta_id: string | null
          proximo_followup_data: string | null
          proximo_followup_notas: string | null
          proximo_followup_tipo: string | null
          responsavel_id: string | null
          responsavel_nome: string | null
          sentimento_atual: string | null
          titulo: string
          updated_at: string
          valor_estimado: number | null
        }
        Insert: {
          cliente_id?: string | null
          cliente_nome?: string | null
          created_at?: string
          data_adjudicacao_esperada?: string | null
          data_adjudicacao_real?: string | null
          data_ultimo_contacto?: string | null
          empresa_id: string
          fase?: string
          id?: string
          motivo_arquivo?: string | null
          notas_internas?: string | null
          probabilidade?: number | null
          proposta_id?: string | null
          proximo_followup_data?: string | null
          proximo_followup_notas?: string | null
          proximo_followup_tipo?: string | null
          responsavel_id?: string | null
          responsavel_nome?: string | null
          sentimento_atual?: string | null
          titulo: string
          updated_at?: string
          valor_estimado?: number | null
        }
        Update: {
          cliente_id?: string | null
          cliente_nome?: string | null
          created_at?: string
          data_adjudicacao_esperada?: string | null
          data_adjudicacao_real?: string | null
          data_ultimo_contacto?: string | null
          empresa_id?: string
          fase?: string
          id?: string
          motivo_arquivo?: string | null
          notas_internas?: string | null
          probabilidade?: number | null
          proposta_id?: string | null
          proximo_followup_data?: string | null
          proximo_followup_notas?: string | null
          proximo_followup_tipo?: string | null
          responsavel_id?: string | null
          responsavel_nome?: string | null
          sentimento_atual?: string | null
          titulo?: string
          updated_at?: string
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "followup_oportunidades_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_oportunidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_oportunidades_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "propostas"
            referencedColumns: ["id"]
          },
        ]
      }
      job_positions: {
        Row: {
          created_at: string
          description: string | null
          empresa_id: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          empresa_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          empresa_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_positions_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      liberty_atividades: {
        Row: {
          acao: string
          criado_em: string | null
          data_hora: string
          descricao: string
          empresa_id: string
          entidade_id: string | null
          entidade_ref: string | null
          entidade_tipo: string | null
          id: string
          metadata: Json | null
          modulo: string
          utilizador_id: string
          utilizador_nome: string
        }
        Insert: {
          acao: string
          criado_em?: string | null
          data_hora?: string
          descricao: string
          empresa_id: string
          entidade_id?: string | null
          entidade_ref?: string | null
          entidade_tipo?: string | null
          id?: string
          metadata?: Json | null
          modulo: string
          utilizador_id: string
          utilizador_nome: string
        }
        Update: {
          acao?: string
          criado_em?: string | null
          data_hora?: string
          descricao?: string
          empresa_id?: string
          entidade_id?: string | null
          entidade_ref?: string | null
          entidade_tipo?: string | null
          id?: string
          metadata?: Json | null
          modulo?: string
          utilizador_id?: string
          utilizador_nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "liberty_atividades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      liberty_configuracoes_utilizador: {
        Row: {
          alertas_ativos: Json | null
          atualizado_em: string | null
          dashboard_cards: Json | null
          densidade: string | null
          id: string
          notif_alertas_email: boolean | null
          notif_email_destino: string | null
          notif_hora_resumo: string | null
          notif_resumo_diario: boolean | null
          sidebar_expandida: boolean | null
          tamanho_fonte: number | null
          tema: string | null
          utilizador_id: string
        }
        Insert: {
          alertas_ativos?: Json | null
          atualizado_em?: string | null
          dashboard_cards?: Json | null
          densidade?: string | null
          id?: string
          notif_alertas_email?: boolean | null
          notif_email_destino?: string | null
          notif_hora_resumo?: string | null
          notif_resumo_diario?: boolean | null
          sidebar_expandida?: boolean | null
          tamanho_fonte?: number | null
          tema?: string | null
          utilizador_id: string
        }
        Update: {
          alertas_ativos?: Json | null
          atualizado_em?: string | null
          dashboard_cards?: Json | null
          densidade?: string | null
          id?: string
          notif_alertas_email?: boolean | null
          notif_email_destino?: string | null
          notif_hora_resumo?: string | null
          notif_resumo_diario?: boolean | null
          sidebar_expandida?: boolean | null
          tamanho_fonte?: number | null
          tema?: string | null
          utilizador_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "liberty_configuracoes_utilizador_utilizador_id_fkey"
            columns: ["utilizador_id"]
            isOneToOne: true
            referencedRelation: "liberty_utilizadores"
            referencedColumns: ["id"]
          },
        ]
      }
      liberty_empresas_config: {
        Row: {
          atualizado_em: string | null
          capital_social: string | null
          codigo_postal: string | null
          criado_em: string | null
          email_comercial: string | null
          email_geral: string | null
          email_internacional: string | null
          empresa_id: string
          id: string
          localidade: string | null
          moeda_padrao: string | null
          morada: string | null
          nif: string | null
          nome_fantasia: string | null
          nome_razao_social: string | null
          pais: string | null
          prefixo_propostas: string | null
          registo_comercial: string | null
          taxa_iva_padrao: number | null
          telefone: string | null
          texto_condicoes: string | null
          texto_pagamento: string | null
          texto_validade: string | null
          website: string | null
        }
        Insert: {
          atualizado_em?: string | null
          capital_social?: string | null
          codigo_postal?: string | null
          criado_em?: string | null
          email_comercial?: string | null
          email_geral?: string | null
          email_internacional?: string | null
          empresa_id: string
          id?: string
          localidade?: string | null
          moeda_padrao?: string | null
          morada?: string | null
          nif?: string | null
          nome_fantasia?: string | null
          nome_razao_social?: string | null
          pais?: string | null
          prefixo_propostas?: string | null
          registo_comercial?: string | null
          taxa_iva_padrao?: number | null
          telefone?: string | null
          texto_condicoes?: string | null
          texto_pagamento?: string | null
          texto_validade?: string | null
          website?: string | null
        }
        Update: {
          atualizado_em?: string | null
          capital_social?: string | null
          codigo_postal?: string | null
          criado_em?: string | null
          email_comercial?: string | null
          email_geral?: string | null
          email_internacional?: string | null
          empresa_id?: string
          id?: string
          localidade?: string | null
          moeda_padrao?: string | null
          morada?: string | null
          nif?: string | null
          nome_fantasia?: string | null
          nome_razao_social?: string | null
          pais?: string | null
          prefixo_propostas?: string | null
          registo_comercial?: string | null
          taxa_iva_padrao?: number | null
          telefone?: string | null
          texto_condicoes?: string | null
          texto_pagamento?: string | null
          texto_validade?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "liberty_empresas_config_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      liberty_utilizador_empresas: {
        Row: {
          criado_em: string | null
          empresa_id: string
          id: string
          utilizador_id: string
        }
        Insert: {
          criado_em?: string | null
          empresa_id: string
          id?: string
          utilizador_id: string
        }
        Update: {
          criado_em?: string | null
          empresa_id?: string
          id?: string
          utilizador_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "liberty_utilizador_empresas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liberty_utilizador_empresas_utilizador_id_fkey"
            columns: ["utilizador_id"]
            isOneToOne: false
            referencedRelation: "liberty_utilizadores"
            referencedColumns: ["id"]
          },
        ]
      }
      liberty_utilizador_permissoes: {
        Row: {
          atualizado_em: string | null
          empresa_id: string
          id: string
          modulo: string
          perm_criar: boolean | null
          perm_editar: boolean | null
          perm_eliminar: boolean | null
          perm_ver: boolean | null
          utilizador_id: string
        }
        Insert: {
          atualizado_em?: string | null
          empresa_id: string
          id?: string
          modulo: string
          perm_criar?: boolean | null
          perm_editar?: boolean | null
          perm_eliminar?: boolean | null
          perm_ver?: boolean | null
          utilizador_id: string
        }
        Update: {
          atualizado_em?: string | null
          empresa_id?: string
          id?: string
          modulo?: string
          perm_criar?: boolean | null
          perm_editar?: boolean | null
          perm_eliminar?: boolean | null
          perm_ver?: boolean | null
          utilizador_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "liberty_utilizador_permissoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liberty_utilizador_permissoes_utilizador_id_fkey"
            columns: ["utilizador_id"]
            isOneToOne: false
            referencedRelation: "liberty_utilizadores"
            referencedColumns: ["id"]
          },
        ]
      }
      liberty_utilizadores: {
        Row: {
          ativo: boolean | null
          atualizado_em: string | null
          auth_user_id: string
          cargo: string | null
          criado_em: string | null
          criado_por: string | null
          eliminado: boolean | null
          email: string
          empresa_padrao: string | null
          id: string
          nome: string
          perfil: string
          telefone: string | null
          ultimo_acesso: string | null
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string | null
          auth_user_id: string
          cargo?: string | null
          criado_em?: string | null
          criado_por?: string | null
          eliminado?: boolean | null
          email: string
          empresa_padrao?: string | null
          id?: string
          nome: string
          perfil?: string
          telefone?: string | null
          ultimo_acesso?: string | null
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string | null
          auth_user_id?: string
          cargo?: string | null
          criado_em?: string | null
          criado_por?: string | null
          eliminado?: boolean | null
          email?: string
          empresa_padrao?: string | null
          id?: string
          nome?: string
          perfil?: string
          telefone?: string | null
          ultimo_acesso?: string | null
        }
        Relationships: []
      }
      liberty_webhooks: {
        Row: {
          ativo: boolean | null
          criado_em: string | null
          empresa_id: string
          evento: string
          id: string
          secret: string | null
          ultimo_envio: string | null
          ultimo_estado: string | null
          url: string
        }
        Insert: {
          ativo?: boolean | null
          criado_em?: string | null
          empresa_id: string
          evento: string
          id?: string
          secret?: string | null
          ultimo_envio?: string | null
          ultimo_estado?: string | null
          url: string
        }
        Update: {
          ativo?: boolean | null
          criado_em?: string | null
          empresa_id?: string
          evento?: string
          id?: string
          secret?: string | null
          ultimo_envio?: string | null
          ultimo_estado?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "liberty_webhooks_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
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
      produtos: {
        Row: {
          categoria: string
          created_at: string
          descricao: string
          empresa_id: string
          id: string
          origem: string | null
          ref_fornecedor: string | null
          ref_interna: string
          unidade: string | null
          updated_at: string
        }
        Insert: {
          categoria: string
          created_at?: string
          descricao: string
          empresa_id: string
          id?: string
          origem?: string | null
          ref_fornecedor?: string | null
          ref_interna: string
          unidade?: string | null
          updated_at?: string
        }
        Update: {
          categoria?: string
          created_at?: string
          descricao?: string
          empresa_id?: string
          id?: string
          origem?: string | null
          ref_fornecedor?: string | null
          ref_interna?: string
          unidade?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
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
      propostas: {
        Row: {
          ano: number
          cliente_id: string | null
          cliente_morada: string | null
          cliente_nif: string | null
          cliente_nome: string | null
          condicoes_gerais: string | null
          condicoes_pagamento: string | null
          created_at: string
          data_emissao: string
          data_validade: string | null
          descricao_geral: string | null
          duracao: string | null
          empresa_id: string
          estado: string
          hora_emissao: string
          id: string
          numero_proposta: string
          numero_sequencial: number
          observacoes: string | null
          taxa_iva: number | null
          titulo: string | null
          total_com_iva: number | null
          total_sem_iva: number | null
          updated_at: string
          validade_dias: number | null
          validade_texto: string | null
          valor_iva: number | null
          vendedor_id: string | null
          vendedor_nome: string | null
        }
        Insert: {
          ano: number
          cliente_id?: string | null
          cliente_morada?: string | null
          cliente_nif?: string | null
          cliente_nome?: string | null
          condicoes_gerais?: string | null
          condicoes_pagamento?: string | null
          created_at?: string
          data_emissao?: string
          data_validade?: string | null
          descricao_geral?: string | null
          duracao?: string | null
          empresa_id: string
          estado?: string
          hora_emissao?: string
          id?: string
          numero_proposta: string
          numero_sequencial: number
          observacoes?: string | null
          taxa_iva?: number | null
          titulo?: string | null
          total_com_iva?: number | null
          total_sem_iva?: number | null
          updated_at?: string
          validade_dias?: number | null
          validade_texto?: string | null
          valor_iva?: number | null
          vendedor_id?: string | null
          vendedor_nome?: string | null
        }
        Update: {
          ano?: number
          cliente_id?: string | null
          cliente_morada?: string | null
          cliente_nif?: string | null
          cliente_nome?: string | null
          condicoes_gerais?: string | null
          condicoes_pagamento?: string | null
          created_at?: string
          data_emissao?: string
          data_validade?: string | null
          descricao_geral?: string | null
          duracao?: string | null
          empresa_id?: string
          estado?: string
          hora_emissao?: string
          id?: string
          numero_proposta?: string
          numero_sequencial?: number
          observacoes?: string | null
          taxa_iva?: number | null
          titulo?: string | null
          total_com_iva?: number | null
          total_sem_iva?: number | null
          updated_at?: string
          validade_dias?: number | null
          validade_texto?: string | null
          valor_iva?: number | null
          vendedor_id?: string | null
          vendedor_nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "propostas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      propostas_linhas: {
        Row: {
          created_at: string
          desconto_pct: number | null
          designacao: string | null
          empresa_id: string
          id: string
          ordem: number
          preco_unitario: number | null
          produto_id: string | null
          proposta_id: string
          quantidade: number | null
          referencia: string | null
          tipo_linha: string
          total_linha: number | null
          unidade: string | null
        }
        Insert: {
          created_at?: string
          desconto_pct?: number | null
          designacao?: string | null
          empresa_id: string
          id?: string
          ordem: number
          preco_unitario?: number | null
          produto_id?: string | null
          proposta_id: string
          quantidade?: number | null
          referencia?: string | null
          tipo_linha: string
          total_linha?: number | null
          unidade?: string | null
        }
        Update: {
          created_at?: string
          desconto_pct?: number | null
          designacao?: string | null
          empresa_id?: string
          id?: string
          ordem?: number
          preco_unitario?: number | null
          produto_id?: string | null
          proposta_id?: string
          quantidade?: number | null
          referencia?: string | null
          tipo_linha?: string
          total_linha?: number | null
          unidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "propostas_linhas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_linhas_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "propostas"
            referencedColumns: ["id"]
          },
        ]
      }
      rh_avaliacoes: {
        Row: {
          areas_melhoria: string | null
          atualizado_em: string | null
          avaliador_confirmou: boolean | null
          avaliador_id: string | null
          avaliador_nome: string | null
          classificacao: string | null
          colaborador_id: string
          colaborador_nome: string | null
          colaborador_notificado: boolean | null
          criado_em: string | null
          data_avaliacao: string | null
          data_comunicacao: string | null
          data_efetivacao: string | null
          data_prevista: string | null
          empresa_id: string
          estado: string | null
          id: string
          media_grupo_a: number | null
          media_grupo_b: number | null
          media_grupo_c: number | null
          media_grupo_d: number | null
          motivo_desligamento: string | null
          nova_remuneracao: number | null
          novo_cargo: string | null
          obj_melhoria: string | null
          objetivos_proximo: string | null
          obs_colaborador: string | null
          observacoes: string | null
          periodo_fim: string | null
          periodo_inicio: string | null
          plano_desenvolvimento: string | null
          pontos_fortes: string | null
          pontuacao_final: number | null
          prazo_revisao: string | null
          qa_conhecimento: number | null
          qa_produtividade: number | null
          qa_qualidade: number | null
          qa_resolucao: number | null
          qb_comunicacao: number | null
          qb_pontualidade: number | null
          qb_postura: number | null
          qb_relacionamento: number | null
          qc_adaptacao: number | null
          qc_aprendizagem: number | null
          qc_proatividade: number | null
          qd_cuidado_equip: number | null
          qd_seguranca: number | null
          recomendacao: string | null
          responsavel_acomp: string | null
          tipo_avaliacao: string
        }
        Insert: {
          areas_melhoria?: string | null
          atualizado_em?: string | null
          avaliador_confirmou?: boolean | null
          avaliador_id?: string | null
          avaliador_nome?: string | null
          classificacao?: string | null
          colaborador_id: string
          colaborador_nome?: string | null
          colaborador_notificado?: boolean | null
          criado_em?: string | null
          data_avaliacao?: string | null
          data_comunicacao?: string | null
          data_efetivacao?: string | null
          data_prevista?: string | null
          empresa_id: string
          estado?: string | null
          id?: string
          media_grupo_a?: number | null
          media_grupo_b?: number | null
          media_grupo_c?: number | null
          media_grupo_d?: number | null
          motivo_desligamento?: string | null
          nova_remuneracao?: number | null
          novo_cargo?: string | null
          obj_melhoria?: string | null
          objetivos_proximo?: string | null
          obs_colaborador?: string | null
          observacoes?: string | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          plano_desenvolvimento?: string | null
          pontos_fortes?: string | null
          pontuacao_final?: number | null
          prazo_revisao?: string | null
          qa_conhecimento?: number | null
          qa_produtividade?: number | null
          qa_qualidade?: number | null
          qa_resolucao?: number | null
          qb_comunicacao?: number | null
          qb_pontualidade?: number | null
          qb_postura?: number | null
          qb_relacionamento?: number | null
          qc_adaptacao?: number | null
          qc_aprendizagem?: number | null
          qc_proatividade?: number | null
          qd_cuidado_equip?: number | null
          qd_seguranca?: number | null
          recomendacao?: string | null
          responsavel_acomp?: string | null
          tipo_avaliacao: string
        }
        Update: {
          areas_melhoria?: string | null
          atualizado_em?: string | null
          avaliador_confirmou?: boolean | null
          avaliador_id?: string | null
          avaliador_nome?: string | null
          classificacao?: string | null
          colaborador_id?: string
          colaborador_nome?: string | null
          colaborador_notificado?: boolean | null
          criado_em?: string | null
          data_avaliacao?: string | null
          data_comunicacao?: string | null
          data_efetivacao?: string | null
          data_prevista?: string | null
          empresa_id?: string
          estado?: string | null
          id?: string
          media_grupo_a?: number | null
          media_grupo_b?: number | null
          media_grupo_c?: number | null
          media_grupo_d?: number | null
          motivo_desligamento?: string | null
          nova_remuneracao?: number | null
          novo_cargo?: string | null
          obj_melhoria?: string | null
          objetivos_proximo?: string | null
          obs_colaborador?: string | null
          observacoes?: string | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          plano_desenvolvimento?: string | null
          pontos_fortes?: string | null
          pontuacao_final?: number | null
          prazo_revisao?: string | null
          qa_conhecimento?: number | null
          qa_produtividade?: number | null
          qa_qualidade?: number | null
          qa_resolucao?: number | null
          qb_comunicacao?: number | null
          qb_pontualidade?: number | null
          qb_postura?: number | null
          qb_relacionamento?: number | null
          qc_adaptacao?: number | null
          qc_aprendizagem?: number | null
          qc_proatividade?: number | null
          qd_cuidado_equip?: number | null
          qd_seguranca?: number | null
          recomendacao?: string | null
          responsavel_acomp?: string | null
          tipo_avaliacao?: string
        }
        Relationships: [
          {
            foreignKeyName: "rh_avaliacoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_avaliacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      rh_candidatos: {
        Row: {
          atualizado_em: string | null
          criado_em: string | null
          cv_url: string | null
          data_nascimento: string | null
          email: string | null
          empresa_id: string
          estado: string | null
          fonte: string | null
          ia_adequacao_vaga: string | null
          ia_anos_experiencia: number | null
          ia_competencias_tec: Json | null
          ia_competencias_trans: Json | null
          ia_erro: string | null
          ia_experiencia: Json | null
          ia_formacao: string | null
          ia_idiomas: Json | null
          ia_justificacao: string | null
          ia_pontos_atencao: Json | null
          ia_pontos_fortes: Json | null
          ia_processado_em: string | null
          ia_resumo_perfil: string | null
          id: string
          localidade: string | null
          nome: string
          notas_iniciais: string | null
          pontuacao_media_entrev: number | null
          telefone: string | null
          vaga_id: string | null
        }
        Insert: {
          atualizado_em?: string | null
          criado_em?: string | null
          cv_url?: string | null
          data_nascimento?: string | null
          email?: string | null
          empresa_id: string
          estado?: string | null
          fonte?: string | null
          ia_adequacao_vaga?: string | null
          ia_anos_experiencia?: number | null
          ia_competencias_tec?: Json | null
          ia_competencias_trans?: Json | null
          ia_erro?: string | null
          ia_experiencia?: Json | null
          ia_formacao?: string | null
          ia_idiomas?: Json | null
          ia_justificacao?: string | null
          ia_pontos_atencao?: Json | null
          ia_pontos_fortes?: Json | null
          ia_processado_em?: string | null
          ia_resumo_perfil?: string | null
          id?: string
          localidade?: string | null
          nome: string
          notas_iniciais?: string | null
          pontuacao_media_entrev?: number | null
          telefone?: string | null
          vaga_id?: string | null
        }
        Update: {
          atualizado_em?: string | null
          criado_em?: string | null
          cv_url?: string | null
          data_nascimento?: string | null
          email?: string | null
          empresa_id?: string
          estado?: string | null
          fonte?: string | null
          ia_adequacao_vaga?: string | null
          ia_anos_experiencia?: number | null
          ia_competencias_tec?: Json | null
          ia_competencias_trans?: Json | null
          ia_erro?: string | null
          ia_experiencia?: Json | null
          ia_formacao?: string | null
          ia_idiomas?: Json | null
          ia_justificacao?: string | null
          ia_pontos_atencao?: Json | null
          ia_pontos_fortes?: Json | null
          ia_processado_em?: string | null
          ia_resumo_perfil?: string | null
          id?: string
          localidade?: string | null
          nome?: string
          notas_iniciais?: string | null
          pontuacao_media_entrev?: number | null
          telefone?: string | null
          vaga_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rh_candidatos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_candidatos_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "rh_vagas"
            referencedColumns: ["id"]
          },
        ]
      }
      rh_entrevistas: {
        Row: {
          candidato_id: string | null
          classificacao: string | null
          criado_em: string | null
          data_hora: string
          duracao_min: number | null
          empresa_id: string
          entrevistador_id: string | null
          entrevistador_nome: string | null
          estado: string | null
          id: string
          local_link: string | null
          notas: string | null
          p_adaptabilidade: number | null
          p_apresentacao: number | null
          p_comunicacao: number | null
          p_conhecimento: number | null
          p_disponibilidade: number | null
          p_experiencia: number | null
          p_informatica: number | null
          p_lideranca: number | null
          p_organizacao: number | null
          p_referencias: number | null
          p_resolucao: number | null
          p_seguranca: number | null
          pontuacao_final: number | null
          proxima_fase: string | null
          recomendacao: string | null
          tipo: string | null
          vaga_id: string | null
        }
        Insert: {
          candidato_id?: string | null
          classificacao?: string | null
          criado_em?: string | null
          data_hora: string
          duracao_min?: number | null
          empresa_id: string
          entrevistador_id?: string | null
          entrevistador_nome?: string | null
          estado?: string | null
          id?: string
          local_link?: string | null
          notas?: string | null
          p_adaptabilidade?: number | null
          p_apresentacao?: number | null
          p_comunicacao?: number | null
          p_conhecimento?: number | null
          p_disponibilidade?: number | null
          p_experiencia?: number | null
          p_informatica?: number | null
          p_lideranca?: number | null
          p_organizacao?: number | null
          p_referencias?: number | null
          p_resolucao?: number | null
          p_seguranca?: number | null
          pontuacao_final?: number | null
          proxima_fase?: string | null
          recomendacao?: string | null
          tipo?: string | null
          vaga_id?: string | null
        }
        Update: {
          candidato_id?: string | null
          classificacao?: string | null
          criado_em?: string | null
          data_hora?: string
          duracao_min?: number | null
          empresa_id?: string
          entrevistador_id?: string | null
          entrevistador_nome?: string | null
          estado?: string | null
          id?: string
          local_link?: string | null
          notas?: string | null
          p_adaptabilidade?: number | null
          p_apresentacao?: number | null
          p_comunicacao?: number | null
          p_conhecimento?: number | null
          p_disponibilidade?: number | null
          p_experiencia?: number | null
          p_informatica?: number | null
          p_lideranca?: number | null
          p_organizacao?: number | null
          p_referencias?: number | null
          p_resolucao?: number | null
          p_seguranca?: number | null
          pontuacao_final?: number | null
          proxima_fase?: string | null
          recomendacao?: string | null
          tipo?: string | null
          vaga_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rh_entrevistas_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "rh_candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_entrevistas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_entrevistas_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "rh_vagas"
            referencedColumns: ["id"]
          },
        ]
      }
      rh_vagas: {
        Row: {
          area: string | null
          atualizado_em: string | null
          cargo: string
          criado_em: string | null
          criado_por: string | null
          data_abertura: string | null
          data_limite: string | null
          descricao: string | null
          empresa_id: string
          estado: string | null
          id: string
          motivo_encerr: string | null
          num_vagas: number | null
          regime: string | null
          requisitos_obrig: string | null
          requisitos_pref: string | null
          salario_base: number | null
          tipo_contrato: string | null
        }
        Insert: {
          area?: string | null
          atualizado_em?: string | null
          cargo: string
          criado_em?: string | null
          criado_por?: string | null
          data_abertura?: string | null
          data_limite?: string | null
          descricao?: string | null
          empresa_id: string
          estado?: string | null
          id?: string
          motivo_encerr?: string | null
          num_vagas?: number | null
          regime?: string | null
          requisitos_obrig?: string | null
          requisitos_pref?: string | null
          salario_base?: number | null
          tipo_contrato?: string | null
        }
        Update: {
          area?: string | null
          atualizado_em?: string | null
          cargo?: string
          criado_em?: string | null
          criado_por?: string | null
          data_abertura?: string | null
          data_limite?: string | null
          descricao?: string | null
          empresa_id?: string
          estado?: string | null
          id?: string
          motivo_encerr?: string | null
          num_vagas?: number | null
          regime?: string | null
          requisitos_obrig?: string | null
          requisitos_pref?: string | null
          salario_base?: number | null
          tipo_contrato?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rh_vagas_empresa_id_fkey"
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
          nota_credito: string | null
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
          nota_credito?: string | null
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
          nota_credito?: string | null
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
      stock_atual: {
        Row: {
          categoria: string | null
          created_at: string
          empresa_id: string
          id: string
          produto_desc: string | null
          produto_ref: string
          quantidade_atual: number | null
          stock_minimo: number | null
          ultima_entrada: string | null
          ultima_saida: string | null
          ultimo_preco: number | null
          unidade: string | null
          updated_at: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          empresa_id: string
          id?: string
          produto_desc?: string | null
          produto_ref: string
          quantidade_atual?: number | null
          stock_minimo?: number | null
          ultima_entrada?: string | null
          ultima_saida?: string | null
          ultimo_preco?: number | null
          unidade?: string | null
          updated_at?: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          empresa_id?: string
          id?: string
          produto_desc?: string | null
          produto_ref?: string
          quantidade_atual?: number | null
          stock_minimo?: number | null
          ultima_entrada?: string | null
          ultima_saida?: string | null
          ultimo_preco?: number | null
          unidade?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_atual_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          account_payable_id: string | null
          article_id: string
          created_at: string
          empresa_id: string
          id: string
          movement_type: string
          notes: string | null
          quantity: number
          unit_cost: number
        }
        Insert: {
          account_payable_id?: string | null
          article_id: string
          created_at?: string
          empresa_id: string
          id?: string
          movement_type?: string
          notes?: string | null
          quantity: number
          unit_cost?: number
        }
        Update: {
          account_payable_id?: string | null
          article_id?: string
          created_at?: string
          empresa_id?: string
          id?: string
          movement_type?: string
          notes?: string | null
          quantity?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_account_payable_id_fkey"
            columns: ["account_payable_id"]
            isOneToOne: false
            referencedRelation: "accounts_payable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movimentos: {
        Row: {
          compra_id: string | null
          created_at: string
          custo_unitario: number | null
          empresa_id: string
          id: string
          observacoes: string | null
          origem: string | null
          produto_desc: string | null
          produto_ref: string
          quantidade: number
          referencia_doc: string | null
          tipo: string
          utilizador_id: string | null
          venda_id: string | null
        }
        Insert: {
          compra_id?: string | null
          created_at?: string
          custo_unitario?: number | null
          empresa_id: string
          id?: string
          observacoes?: string | null
          origem?: string | null
          produto_desc?: string | null
          produto_ref: string
          quantidade: number
          referencia_doc?: string | null
          tipo: string
          utilizador_id?: string | null
          venda_id?: string | null
        }
        Update: {
          compra_id?: string | null
          created_at?: string
          custo_unitario?: number | null
          empresa_id?: string
          id?: string
          observacoes?: string | null
          origem?: string | null
          produto_desc?: string | null
          produto_ref?: string
          quantidade?: number
          referencia_doc?: string | null
          tipo?: string
          utilizador_id?: string | null
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movimentos_compra_id_fkey"
            columns: ["compra_id"]
            isOneToOne: false
            referencedRelation: "accounts_payable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movimentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movimentos_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "services"
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
          gamas: string[] | null
          iban: string | null
          id: string
          logradouro: string | null
          nome_fantasia: string | null
          numero: string | null
          observacoes: string | null
          pais: string | null
          razao_social: string
          status: string
          swift_bic: string | null
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
          gamas?: string[] | null
          iban?: string | null
          id?: string
          logradouro?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          pais?: string | null
          razao_social: string
          status?: string
          swift_bic?: string | null
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
          gamas?: string[] | null
          iban?: string | null
          id?: string
          logradouro?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          pais?: string | null
          razao_social?: string
          status?: string
          swift_bic?: string | null
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
      time_records: {
        Row: {
          balance: number | null
          created_at: string
          day_type: string
          employee_id: string
          empresa_id: string
          entry_time: string | null
          exit_time: string | null
          expected_hours: number | null
          folga_tipo: string | null
          id: string
          lunch_exit_time: string | null
          lunch_return_time: string | null
          observations: string | null
          overtime_hours: number | null
          record_date: string
          updated_at: string
          worked_hours: number | null
        }
        Insert: {
          balance?: number | null
          created_at?: string
          day_type?: string
          employee_id: string
          empresa_id: string
          entry_time?: string | null
          exit_time?: string | null
          expected_hours?: number | null
          folga_tipo?: string | null
          id?: string
          lunch_exit_time?: string | null
          lunch_return_time?: string | null
          observations?: string | null
          overtime_hours?: number | null
          record_date?: string
          updated_at?: string
          worked_hours?: number | null
        }
        Update: {
          balance?: number | null
          created_at?: string
          day_type?: string
          employee_id?: string
          empresa_id?: string
          entry_time?: string | null
          exit_time?: string | null
          expected_hours?: number | null
          folga_tipo?: string | null
          id?: string
          lunch_exit_time?: string | null
          lunch_return_time?: string | null
          observations?: string | null
          overtime_hours?: number | null
          record_date?: string
          updated_at?: string
          worked_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "time_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_records_empresa_id_fkey"
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
      calculate_flow_balance: {
        Args: { p_date?: string; p_empresa_id: string; p_flow_type: string }
        Returns: number
      }
      liberty_check_permission: {
        Args: { p_acao: string; p_modulo: string }
        Returns: boolean
      }
      soft_delete_supplier: {
        Args: { p_supplier_id: string }
        Returns: boolean
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
