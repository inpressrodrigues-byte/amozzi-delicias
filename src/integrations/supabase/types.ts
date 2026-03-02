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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      billing_settings: {
        Row: {
          billing_enabled: boolean
          billing_message: string | null
          created_at: string
          id: string
          phone_number_id: string | null
          pix_key: string | null
          pix_name: string | null
          updated_at: string
          whatsapp_token: string | null
        }
        Insert: {
          billing_enabled?: boolean
          billing_message?: string | null
          created_at?: string
          id?: string
          phone_number_id?: string | null
          pix_key?: string | null
          pix_name?: string | null
          updated_at?: string
          whatsapp_token?: string | null
        }
        Update: {
          billing_enabled?: boolean
          billing_message?: string | null
          created_at?: string
          id?: string
          phone_number_id?: string | null
          pix_key?: string | null
          pix_name?: string | null
          updated_at?: string
          whatsapp_token?: string | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          max_uses: number | null
          min_order_value: number
          uses_count: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          min_order_value?: number
          uses_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          min_order_value?: number
          uses_count?: number
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          date: string
          description: string
          id: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          date?: string
          description: string
          id?: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          date?: string
          description?: string
          id?: string
        }
        Relationships: []
      }
      loyalty: {
        Row: {
          created_at: string
          customer_whatsapp: string
          discount_available: boolean
          id: string
          purchase_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_whatsapp: string
          discount_available?: boolean
          id?: string
          purchase_count?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_whatsapp?: string
          discount_available?: boolean
          id?: string
          purchase_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string
          customer_address: string
          customer_cep: string
          customer_lat: number | null
          customer_lng: number | null
          customer_name: string
          customer_whatsapp: string
          delivery_fee: number
          id: string
          items: Json
          payment_method: string | null
          status: string
          stripe_payment_id: string | null
          total: number
          tracking_code: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_address: string
          customer_cep: string
          customer_lat?: number | null
          customer_lng?: number | null
          customer_name: string
          customer_whatsapp: string
          delivery_fee?: number
          id?: string
          items?: Json
          payment_method?: string | null
          status?: string
          stripe_payment_id?: string | null
          total?: number
          tracking_code?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_address?: string
          customer_cep?: string
          customer_lat?: number | null
          customer_lng?: number | null
          customer_name?: string
          customer_whatsapp?: string
          delivery_fee?: number
          id?: string
          items?: Json
          payment_method?: string | null
          status?: string
          stripe_payment_id?: string | null
          total?: number
          tracking_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      product_nutrition: {
        Row: {
          calories: number | null
          cholesterol: number | null
          created_at: string
          dietary_fiber: number | null
          id: string
          product_id: string
          protein: number | null
          saturated_fat: number | null
          serving_size: string | null
          sodium: number | null
          total_carbs: number | null
          total_fat: number | null
          total_sugars: number | null
          trans_fat: number | null
          updated_at: string
        }
        Insert: {
          calories?: number | null
          cholesterol?: number | null
          created_at?: string
          dietary_fiber?: number | null
          id?: string
          product_id: string
          protein?: number | null
          saturated_fat?: number | null
          serving_size?: string | null
          sodium?: number | null
          total_carbs?: number | null
          total_fat?: number | null
          total_sugars?: number | null
          trans_fat?: number | null
          updated_at?: string
        }
        Update: {
          calories?: number | null
          cholesterol?: number | null
          created_at?: string
          dietary_fiber?: number | null
          id?: string
          product_id?: string
          protein?: number | null
          saturated_fat?: number | null
          serving_size?: string | null
          sodium?: number | null
          total_carbs?: number | null
          total_fat?: number | null
          total_sugars?: number | null
          trans_fat?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_nutrition_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          available: boolean
          category: string
          cost: number
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number
          profit_margin_type: string | null
          profit_margin_value: number | null
          updated_at: string
        }
        Insert: {
          available?: boolean
          category?: string
          cost?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price?: number
          profit_margin_type?: string | null
          profit_margin_value?: number | null
          updated_at?: string
        }
        Update: {
          available?: boolean
          category?: string
          cost?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          profit_margin_type?: string | null
          profit_margin_value?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      remote_orders: {
        Row: {
          billing_date: string | null
          billing_sent: boolean
          billing_status: string
          created_at: string
          customer_name: string
          customer_whatsapp: string | null
          delivered: boolean
          id: string
          items: Json
          notes: string | null
          paid: boolean
          payment_status: string
          sector: string
          separated: boolean
          updated_at: string
        }
        Insert: {
          billing_date?: string | null
          billing_sent?: boolean
          billing_status?: string
          created_at?: string
          customer_name: string
          customer_whatsapp?: string | null
          delivered?: boolean
          id?: string
          items?: Json
          notes?: string | null
          paid?: boolean
          payment_status?: string
          sector?: string
          separated?: boolean
          updated_at?: string
        }
        Update: {
          billing_date?: string | null
          billing_sent?: boolean
          billing_status?: string
          created_at?: string
          customer_name?: string
          customer_whatsapp?: string | null
          delivered?: boolean
          id?: string
          items?: Json
          notes?: string | null
          paid?: boolean
          payment_status?: string
          sector?: string
          separated?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          about_text: string | null
          accent_color: string | null
          background_color: string | null
          created_at: string
          delivery_zones: Json | null
          hero_image_url: string | null
          hero_subtitle: string | null
          hero_title: string | null
          id: string
          ifood_url: string | null
          instagram_url: string | null
          logo_url: string | null
          payment_methods: Json | null
          primary_color: string | null
          secondary_color: string | null
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          about_text?: string | null
          accent_color?: string | null
          background_color?: string | null
          created_at?: string
          delivery_zones?: Json | null
          hero_image_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          ifood_url?: string | null
          instagram_url?: string | null
          logo_url?: string | null
          payment_methods?: Json | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          about_text?: string | null
          accent_color?: string | null
          background_color?: string | null
          created_at?: string
          delivery_zones?: Json | null
          hero_image_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          ifood_url?: string | null
          instagram_url?: string | null
          logo_url?: string | null
          payment_methods?: Json | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_loyalty_by_whatsapp: {
        Args: { p_whatsapp: string }
        Returns: {
          discount_available: boolean
          purchase_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_loyalty: {
        Args: { p_whatsapp: string }
        Returns: {
          discount_available: boolean
          purchase_count: number
        }[]
      }
      use_loyalty_discount: { Args: { p_whatsapp: string }; Returns: undefined }
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
