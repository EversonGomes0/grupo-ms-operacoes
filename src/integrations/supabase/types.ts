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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      ajudantes: {
        Row: {
          created_at: string
          data: string
          hora_final: string | null
          hora_inicial: string | null
          id: string
          local: string | null
          nome: string
          observacao: string | null
          registro_operacoes_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data: string
          hora_final?: string | null
          hora_inicial?: string | null
          id?: string
          local?: string | null
          nome: string
          observacao?: string | null
          registro_operacoes_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: string
          hora_final?: string | null
          hora_inicial?: string | null
          id?: string
          local?: string | null
          nome?: string
          observacao?: string | null
          registro_operacoes_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ajudantes_registro_operacoes_id_fkey"
            columns: ["registro_operacoes_id"]
            isOneToOne: false
            referencedRelation: "registro_operacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      ausencias: {
        Row: {
          created_at: string
          data: string
          hora_final: string | null
          hora_inicial: string | null
          id: string
          justificado: boolean | null
          local: string | null
          nome: string
          obs: string | null
          registro_operacoes_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data: string
          hora_final?: string | null
          hora_inicial?: string | null
          id?: string
          justificado?: boolean | null
          local?: string | null
          nome: string
          obs?: string | null
          registro_operacoes_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: string
          hora_final?: string | null
          hora_inicial?: string | null
          id?: string
          justificado?: boolean | null
          local?: string | null
          nome?: string
          obs?: string | null
          registro_operacoes_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ausencias_registro_operacoes_id_fkey"
            columns: ["registro_operacoes_id"]
            isOneToOne: false
            referencedRelation: "registro_operacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      equipamentos: {
        Row: {
          carga: string | null
          created_at: string
          horas_operando: number | null
          id: string
          local: string
          motorista_operador: string | null
          registro_operacoes_id: string
          tag: string
          updated_at: string
        }
        Insert: {
          carga?: string | null
          created_at?: string
          horas_operando?: number | null
          id?: string
          local: string
          motorista_operador?: string | null
          registro_operacoes_id: string
          tag: string
          updated_at?: string
        }
        Update: {
          carga?: string | null
          created_at?: string
          horas_operando?: number | null
          id?: string
          local?: string
          motorista_operador?: string | null
          registro_operacoes_id?: string
          tag?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipamentos_registro_operacoes_id_fkey"
            columns: ["registro_operacoes_id"]
            isOneToOne: false
            referencedRelation: "registro_operacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      navios: {
        Row: {
          berco: string | null
          carga: string
          cbs: number | null
          concluido: boolean | null
          created_at: string
          final: string | null
          id: string
          inicio: string | null
          media_cb: number | null
          nome_navio: string
          quantidade: number | null
          updated_at: string
        }
        Insert: {
          berco?: string | null
          carga: string
          cbs?: number | null
          concluido?: boolean | null
          created_at?: string
          final?: string | null
          id?: string
          inicio?: string | null
          media_cb?: number | null
          nome_navio: string
          quantidade?: number | null
          updated_at?: string
        }
        Update: {
          berco?: string | null
          carga?: string
          cbs?: number | null
          concluido?: boolean | null
          created_at?: string
          final?: string | null
          id?: string
          inicio?: string | null
          media_cb?: number | null
          nome_navio?: string
          quantidade?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      registro_operacoes: {
        Row: {
          created_at: string
          data: string
          hora_final: string | null
          hora_inicial: string | null
          id: string
          op: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data: string
          hora_final?: string | null
          hora_inicial?: string | null
          id?: string
          op: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: string
          hora_final?: string | null
          hora_inicial?: string | null
          id?: string
          op?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
