export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  audit: {
    Tables: {
      logs: {
        Row: {
          account_id: string | null
          action: Database["audit"]["Enums"]["action_type"]
          actor_id: string | null
          actor_type: string | null
          created_at: string | null
          id: number
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
        }
        Insert: {
          account_id?: string | null
          action: Database["audit"]["Enums"]["action_type"]
          actor_id?: string | null
          actor_type?: string | null
          created_at?: string | null
          id?: never
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
        }
        Update: {
          account_id?: string | null
          action?: Database["audit"]["Enums"]["action_type"]
          actor_id?: string | null
          actor_type?: string | null
          created_at?: string | null
          id?: never
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      v_recent_activity: {
        Row: {
          account_id: string | null
          action: Database["audit"]["Enums"]["action_type"] | null
          actor_id: string | null
          actor_name: string | null
          actor_type: string | null
          avatar_url: string | null
          created_at: string | null
          id: number | null
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      action_type:
        | "create"
        | "update"
        | "delete"
        | "login"
        | "logout"
        | "invite"
        | "role_change"
        | "subscription_change"
        | "payment"
        | "export"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  billing: {
    Tables: {
      customers: {
        Row: {
          account_id: string
          created_at: string | null
          external_id: string | null
          id: string
          provider: string
          updated_at: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          external_id?: string | null
          id?: string
          provider?: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          external_id?: string | null
          id?: string
          provider?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string | null
          customer_id: string | null
          event_type: string
          external_event_id: string | null
          id: number
          payload: Json
          processed_at: string | null
          provider: string
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          event_type: string
          external_event_id?: string | null
          id?: never
          payload?: Json
          processed_at?: string | null
          provider?: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          event_type?: string
          external_event_id?: string | null
          id?: never
          payload?: Json
          processed_at?: string | null
          provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          amount: number
          created_at: string | null
          description: string
          id: string
          invoice_id: string
          quantity: number | null
          unit_price: number
        }
        Insert: {
          amount: number
          created_at?: string | null
          description: string
          id?: string
          invoice_id: string
          quantity?: number | null
          unit_price: number
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number | null
          created_at: string | null
          currency: string
          customer_id: string
          external_invoice_id: string | null
          hosted_url: string | null
          id: string
          number: string | null
          paid_at: string | null
          pdf_url: string | null
          period_end: string | null
          period_start: string | null
          status: Database["billing"]["Enums"]["invoice_status"] | null
          subscription_id: string | null
          subtotal: number | null
          tax: number | null
          total: number | null
          updated_at: string | null
        }
        Insert: {
          amount_paid?: number | null
          created_at?: string | null
          currency?: string
          customer_id: string
          external_invoice_id?: string | null
          hosted_url?: string | null
          id?: string
          number?: string | null
          paid_at?: string | null
          pdf_url?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: Database["billing"]["Enums"]["invoice_status"] | null
          subscription_id?: string | null
          subtotal?: number | null
          tax?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          amount_paid?: number | null
          created_at?: string | null
          currency?: string
          customer_id?: string
          external_invoice_id?: string | null
          hosted_url?: string | null
          id?: string
          number?: string | null
          paid_at?: string | null
          pdf_url?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: Database["billing"]["Enums"]["invoice_status"] | null
          subscription_id?: string | null
          subtotal?: number | null
          tax?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          brand: string | null
          created_at: string | null
          customer_id: string
          exp_month: number | null
          exp_year: number | null
          external_id: string | null
          id: string
          is_default: boolean | null
          last_four: string | null
          provider: string
          type: Database["billing"]["Enums"]["payment_method_type"]
          updated_at: string | null
        }
        Insert: {
          brand?: string | null
          created_at?: string | null
          customer_id: string
          exp_month?: number | null
          exp_year?: number | null
          external_id?: string | null
          id?: string
          is_default?: boolean | null
          last_four?: string | null
          provider?: string
          type?: Database["billing"]["Enums"]["payment_method_type"]
          updated_at?: string | null
        }
        Update: {
          brand?: string | null
          created_at?: string | null
          customer_id?: string
          exp_month?: number | null
          exp_year?: number | null
          external_id?: string | null
          id?: string
          is_default?: boolean | null
          last_four?: string | null
          provider?: string
          type?: Database["billing"]["Enums"]["payment_method_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string | null
          currency: string
          description: string | null
          features: Json | null
          id: string
          interval: Database["billing"]["Enums"]["plan_interval"]
          is_active: boolean | null
          limits: Json | null
          name: string
          price: number
          slug: string
          sort_order: number | null
          trial_days: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string
          description?: string | null
          features?: Json | null
          id?: string
          interval?: Database["billing"]["Enums"]["plan_interval"]
          is_active?: boolean | null
          limits?: Json | null
          name: string
          price?: number
          slug: string
          sort_order?: number | null
          trial_days?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string
          description?: string | null
          features?: Json | null
          id?: string
          interval?: Database["billing"]["Enums"]["plan_interval"]
          is_active?: boolean | null
          limits?: Json | null
          name?: string
          price?: number
          slug?: string
          sort_order?: number | null
          trial_days?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscription_items: {
        Row: {
          created_at: string | null
          currency: string | null
          description: string
          id: string
          quantity: number | null
          subscription_id: string
          type: Database["billing"]["Enums"]["subscription_item_type"]
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          description: string
          id?: string
          quantity?: number | null
          subscription_id: string
          type?: Database["billing"]["Enums"]["subscription_item_type"]
          unit_price?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          description?: string
          id?: string
          quantity?: number | null
          subscription_id?: string
          type?: Database["billing"]["Enums"]["subscription_item_type"]
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_items_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          customer_id: string
          external_subscription_id: string | null
          id: string
          metadata: Json | null
          plan_id: string
          provider: string
          status: Database["billing"]["Enums"]["subscription_status"]
          trial_end: string | null
          trial_start: string | null
          updated_at: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          customer_id: string
          external_subscription_id?: string | null
          id?: string
          metadata?: Json | null
          plan_id: string
          provider?: string
          status?: Database["billing"]["Enums"]["subscription_status"]
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          customer_id?: string
          external_subscription_id?: string | null
          id?: string
          metadata?: Json | null
          plan_id?: string
          provider?: string
          status?: Database["billing"]["Enums"]["subscription_status"]
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_mrr_by_plan: {
        Row: {
          active_count: number | null
          currency: string | null
          interval: Database["billing"]["Enums"]["plan_interval"] | null
          mrr_cents: number | null
          plan_name: string | null
          slug: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      invoice_status: "draft" | "open" | "paid" | "void" | "uncollectible"
      payment_method_type: "card" | "bank_transfer" | "wallet" | "other"
      plan_interval: "month" | "year" | "one_time"
      subscription_item_type: "flat" | "per_seat" | "metered" | "tiered"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "paused"
        | "unpaid"
        | "incomplete"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          billing_email: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          id: string
          logo_url: string | null
          metadata: Json | null
          name: string
          slug: string
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string | null
        }
        Insert: {
          billing_email?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          logo_url?: string | null
          metadata?: Json | null
          name: string
          slug: string
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string | null
        }
        Update: {
          billing_email?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          logo_url?: string | null
          metadata?: Json | null
          name?: string
          slug?: string
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts_memberships: {
        Row: {
          account_id: string
          created_at: string | null
          invited_by: string | null
          role: Database["public"]["Enums"]["membership_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string | null
          invited_by?: string | null
          role?: Database["public"]["Enums"]["membership_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string | null
          invited_by?: string | null
          role?: Database["public"]["Enums"]["membership_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_memberships_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_memberships_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          account_id: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
        }
        Insert: {
          account_id: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_recovery_codes: {
        Row: {
          code_hash: string
          created_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          account_id: string
          content: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          project_id: string
          updated_at: string
        }
        Insert: {
          account_id: string
          content?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          project_id: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flag_overrides: {
        Row: {
          account_id: string
          created_at: string
          enabled: boolean
          flag_name: string
          id: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          enabled: boolean
          flag_name: string
          id?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          enabled?: boolean
          flag_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_flag_overrides_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_overrides_flag_name_fkey"
            columns: ["flag_name"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["name"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string
          enabled: boolean
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          enabled?: boolean
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          enabled?: boolean
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          account_id: string
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["membership_role"]
          status: Database["public"]["Enums"]["invitation_status"] | null
          token_hash: string
          updated_at: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["membership_role"]
          status?: Database["public"]["Enums"]["invitation_status"] | null
          token_hash: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["membership_role"]
          status?: Database["public"]["Enums"]["invitation_status"] | null
          token_hash?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships_history: {
        Row: {
          account_id: string
          action: string
          actor_id: string | null
          created_at: string
          id: number
          metadata: Json | null
          role: Database["public"]["Enums"]["membership_role"]
          user_id: string
        }
        Insert: {
          account_id: string
          action: string
          actor_id?: string | null
          created_at?: string
          id?: never
          metadata?: Json | null
          role: Database["public"]["Enums"]["membership_role"]
          user_id: string
        }
        Update: {
          account_id?: string
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: never
          metadata?: Json | null
          role?: Database["public"]["Enums"]["membership_role"]
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          birth_date: string | null
          company: string | null
          created_at: string | null
          deleted_at: string | null
          display_name: string | null
          family_name: string | null
          given_name: string | null
          id: string
          locale: string | null
          metadata: Json | null
          onboarding_completed: boolean | null
          pending_deletion: boolean
          phone_number: string | null
          timezone: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          company?: string | null
          created_at?: string | null
          deleted_at?: string | null
          display_name?: string | null
          family_name?: string | null
          given_name?: string | null
          id: string
          locale?: string | null
          metadata?: Json | null
          onboarding_completed?: boolean | null
          pending_deletion?: boolean
          phone_number?: string | null
          timezone?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          company?: string | null
          created_at?: string | null
          deleted_at?: string | null
          display_name?: string | null
          family_name?: string | null
          given_name?: string | null
          id?: string
          locale?: string | null
          metadata?: Json | null
          onboarding_completed?: boolean | null
          pending_deletion?: boolean
          phone_number?: string | null
          timezone?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          account_id: string
          color: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          name: string
          slug: string
          status: Database["public"]["Enums"]["project_status"]
          type: Database["public"]["Enums"]["project_type"]
          updated_at: string | null
        }
        Insert: {
          account_id: string
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name: string
          slug: string
          status?: Database["public"]["Enums"]["project_status"]
          type?: Database["public"]["Enums"]["project_type"]
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          slug?: string
          status?: Database["public"]["Enums"]["project_status"]
          type?: Database["public"]["Enums"]["project_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      robot_contacts: {
        Row: {
          account_id: string
          created_at: string
          id: string
          name: string
          phone: string
          priority: number
          relationship: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          name: string
          phone: string
          priority?: number
          relationship?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          name?: string
          phone?: string
          priority?: number
          relationship?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "robot_contacts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      robot_memories: {
        Row: {
          account_id: string
          created_at: string
          entity: string
          id: string
          key_fact: string
          name: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          entity: string
          id?: string
          key_fact: string
          name: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          entity?: string
          id?: string
          key_fact?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "robot_memories_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      robot_routines: {
        Row: {
          account_id: string
          activity_type: string
          created_at: string
          description: string | null
          id: string
          message: string | null
          time: string
          updated_at: string
        }
        Insert: {
          account_id: string
          activity_type: string
          created_at?: string
          description?: string | null
          id?: string
          message?: string | null
          time: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          activity_type?: string
          created_at?: string
          description?: string | null
          id?: string
          message?: string | null
          time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "robot_routines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          account_id: string
          attempts: number
          created_at: string
          delivered_at: string | null
          endpoint_id: string
          event_type: string
          id: string
          last_error: string | null
          last_status_code: number | null
          next_retry_at: string | null
          payload: Json
          request_id: number | null
          status: Database["public"]["Enums"]["webhook_delivery_status"]
        }
        Insert: {
          account_id: string
          attempts?: number
          created_at?: string
          delivered_at?: string | null
          endpoint_id: string
          event_type: string
          id?: string
          last_error?: string | null
          last_status_code?: number | null
          next_retry_at?: string | null
          payload?: Json
          request_id?: number | null
          status?: Database["public"]["Enums"]["webhook_delivery_status"]
        }
        Update: {
          account_id?: string
          attempts?: number
          created_at?: string
          delivered_at?: string | null
          endpoint_id?: string
          event_type?: string
          id?: string
          last_error?: string | null
          last_status_code?: number | null
          next_retry_at?: string | null
          payload?: Json
          request_id?: number | null
          status?: Database["public"]["Enums"]["webhook_delivery_status"]
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_deliveries_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          account_id: string
          created_at: string
          description: string | null
          enabled: boolean
          events: string[]
          id: string
          secret: string
          updated_at: string
          url: string
        }
        Insert: {
          account_id: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          events: string[]
          id?: string
          secret: string
          updated_at?: string
          url: string
        }
        Update: {
          account_id?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          events?: string[]
          id?: string
          secret?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_endpoints_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: { Args: { p_token: string }; Returns: string }
      check_request: { Args: never; Returns: undefined }
      consume_recovery_code: { Args: { p_code: string }; Returns: boolean }
      count_unused_recovery_codes: { Args: never; Returns: number }
      create_api_key: {
        Args: { p_account_id: string; p_expires_at?: string; p_name: string }
        Returns: {
          id: string
          key: string
        }[]
      }
      create_webhook_endpoint: {
        Args: {
          p_account_id: string
          p_description?: string
          p_events: string[]
          p_url: string
        }
        Returns: {
          id: string
          secret: string
        }[]
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      delete_webhook_endpoint: {
        Args: { p_endpoint_id: string }
        Returns: undefined
      }
      generate_recovery_codes: { Args: never; Returns: string[] }
      get_account_audit_logs: {
        Args: {
          p_account_id: string
          p_action?: Database["audit"]["Enums"]["action_type"]
          p_cursor_created_at?: string
          p_cursor_id?: number
          p_limit?: number
          p_resource_type?: string
        }
        Returns: {
          action: Database["audit"]["Enums"]["action_type"]
          actor_id: string
          actor_name: string
          avatar_url: string
          created_at: string
          id: number
          resource_id: string
          resource_type: string
        }[]
      }
      get_account_entitlements: {
        Args: { p_account_id: string }
        Returns: {
          features: Json
          limits: Json
          plan_slug: string
        }[]
      }
      get_account_subscription: {
        Args: { p_account_id: string }
        Returns: {
          cancel_at_period_end: boolean
          current_period_end: string
          features: Json
          plan_name: string
          plan_slug: string
          status: Database["billing"]["Enums"]["subscription_status"]
        }[]
      }
      get_active_plans: {
        Args: never
        Returns: {
          currency: string
          description: string
          features: Json
          interval: Database["billing"]["Enums"]["plan_interval"]
          limits: Json
          name: string
          price: number
          slug: string
          trial_days: number
        }[]
      }
      get_billing_overview: {
        Args: { p_account_id: string }
        Returns: {
          cancel_at_period_end: boolean
          current_period_end: string
          plan_interval: Database["billing"]["Enums"]["plan_interval"]
          plan_name: string
          plan_slug: string
          status: Database["billing"]["Enums"]["subscription_status"]
          trial_end: string
        }[]
      }
      get_my_account_id: { Args: never; Returns: string }
      get_my_accounts: {
        Args: never
        Returns: {
          account_id: string
          logo_url: string
          name: string
          role: Database["public"]["Enums"]["membership_role"]
          slug: string
          type: Database["public"]["Enums"]["account_type"]
        }[]
      }
      invite_members: {
        Args: {
          p_account_id: string
          p_emails: string[]
          p_role?: Database["public"]["Enums"]["membership_role"]
        }
        Returns: {
          email: string
          token: string
        }[]
      }
      is_flag_enabled: {
        Args: { p_account_id: string; p_flag_name: string }
        Returns: boolean
      }
      list_account_invoices: {
        Args: {
          p_account_id: string
          p_cursor_created_at?: string
          p_cursor_id?: string
          p_limit?: number
        }
        Returns: {
          amount_paid: number
          created_at: string
          currency: string
          hosted_url: string
          id: string
          number: string
          pdf_url: string
          status: Database["billing"]["Enums"]["invoice_status"]
          total: number
        }[]
      }
      list_api_keys: {
        Args: { p_account_id: string }
        Returns: {
          created_at: string
          expires_at: string
          id: string
          key_prefix: string
          last_used_at: string
          name: string
          revoked_at: string
        }[]
      }
      list_my_sessions: {
        Args: never
        Returns: {
          aal: string
          created_at: string
          id: string
          ip: string
          not_after: string
          updated_at: string
          user_agent: string
        }[]
      }
      list_team_members: {
        Args: { p_account_id: string }
        Returns: {
          avatar_url: string
          display_name: string
          email: string
          family_name: string
          given_name: string
          joined_at: string
          role: string
          status: string
          user_id: string
        }[]
      }
      list_webhook_deliveries: {
        Args: {
          p_account_id: string
          p_cursor_created_at?: string
          p_cursor_id?: string
          p_endpoint_id?: string
          p_limit?: number
        }
        Returns: {
          attempts: number
          created_at: string
          delivered_at: string
          endpoint_id: string
          event_type: string
          id: string
          last_error: string
          last_status_code: number
          status: Database["public"]["Enums"]["webhook_delivery_status"]
        }[]
      }
      list_webhook_endpoints: {
        Args: { p_account_id: string }
        Returns: {
          created_at: string
          description: string
          enabled: boolean
          events: string[]
          id: string
          updated_at: string
          url: string
        }[]
      }
      mark_notifications_read: { Args: { p_ids: string[] }; Returns: undefined }
      remove_member: {
        Args: { p_account_id: string; p_user_id: string }
        Returns: boolean
      }
      replace_robot_config: {
        Args: {
          p_account_id: string
          p_contacts: Json
          p_memories: Json
          p_routines: Json
        }
        Returns: undefined
      }
      request_account_deletion: { Args: never; Returns: undefined }
      revoke_api_key: { Args: { p_key_id: string }; Returns: undefined }
      revoke_my_session: { Args: { p_session_id: string }; Returns: undefined }
      update_my_profile: {
        Args: {
          p_avatar_url?: string
          p_bio?: string
          p_birth_date?: string
          p_company?: string
          p_family_name?: string
          p_given_name?: string
          p_locale?: string
          p_phone_number?: string
          p_timezone?: string
          p_website_url?: string
        }
        Returns: {
          avatar_url: string | null
          bio: string | null
          birth_date: string | null
          company: string | null
          created_at: string | null
          deleted_at: string | null
          display_name: string | null
          family_name: string | null
          given_name: string | null
          id: string
          locale: string | null
          metadata: Json | null
          onboarding_completed: boolean | null
          pending_deletion: boolean
          phone_number: string | null
          timezone: string | null
          updated_at: string | null
          website_url: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_webhook_endpoint: {
        Args: {
          p_description?: string
          p_enabled: boolean
          p_endpoint_id: string
          p_events: string[]
          p_url: string
        }
        Returns: undefined
      }
      verify_api_key: { Args: { p_key_hash: string }; Returns: string }
    }
    Enums: {
      account_type: "personal" | "team"
      invitation_status: "pending" | "accepted" | "revoked" | "expired"
      membership_role: "owner" | "admin" | "member" | "viewer"
      project_status: "active" | "paused" | "draft"
      project_type: "docs" | "automation" | "agent"
      webhook_delivery_status: "pending" | "success" | "failed" | "exhausted"
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
  audit: {
    Enums: {
      action_type: [
        "create",
        "update",
        "delete",
        "login",
        "logout",
        "invite",
        "role_change",
        "subscription_change",
        "payment",
        "export",
      ],
    },
  },
  billing: {
    Enums: {
      invoice_status: ["draft", "open", "paid", "void", "uncollectible"],
      payment_method_type: ["card", "bank_transfer", "wallet", "other"],
      plan_interval: ["month", "year", "one_time"],
      subscription_item_type: ["flat", "per_seat", "metered", "tiered"],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "canceled",
        "paused",
        "unpaid",
        "incomplete",
      ],
    },
  },
  public: {
    Enums: {
      account_type: ["personal", "team"],
      invitation_status: ["pending", "accepted", "revoked", "expired"],
      membership_role: ["owner", "admin", "member", "viewer"],
      project_status: ["active", "paused", "draft"],
      project_type: ["docs", "automation", "agent"],
      webhook_delivery_status: ["pending", "success", "failed", "exhausted"],
    },
  },
} as const

