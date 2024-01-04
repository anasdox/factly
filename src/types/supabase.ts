export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      conclusion: {
        Row: {
          createdAt: string | null
          description: string
          id: number
        }
        Insert: {
          createdAt?: string | null
          description: string
          id?: number
        }
        Update: {
          createdAt?: string | null
          description?: string
          id?: number
        }
        Relationships: []
      }
      data: {
        Row: {
          createdAt: string | null
          id: number
          name: string
          projectId: number | null
          url: string | null
        }
        Insert: {
          createdAt?: string | null
          id?: number
          name: string
          projectId?: number | null
          url?: string | null
        }
        Update: {
          createdAt?: string | null
          id?: number
          name?: string
          projectId?: number | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_projectId_fkey"
            columns: ["projectId"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          }
        ]
      }
      dataFact: {
        Row: {
          createdAt: string | null
          dataId: number | null
          factId: number | null
          id: number
        }
        Insert: {
          createdAt?: string | null
          dataId?: number | null
          factId?: number | null
          id?: number
        }
        Update: {
          createdAt?: string | null
          dataId?: number | null
          factId?: number | null
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "dataFact_dataId_fkey"
            columns: ["dataId"]
            isOneToOne: false
            referencedRelation: "data"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dataFact_factId_fkey"
            columns: ["factId"]
            isOneToOne: false
            referencedRelation: "fact"
            referencedColumns: ["id"]
          }
        ]
      }
      fact: {
        Row: {
          content: string
          createdAt: string | null
          id: number
        }
        Insert: {
          content?: string
          createdAt?: string | null
          id?: number
        }
        Update: {
          content?: string
          createdAt?: string | null
          id?: number
        }
        Relationships: []
      }
      factInsight: {
        Row: {
          createdAt: string | null
          factId: number | null
          id: number
          insightId: number | null
        }
        Insert: {
          createdAt?: string | null
          factId?: number | null
          id?: number
          insightId?: number | null
        }
        Update: {
          createdAt?: string | null
          factId?: number | null
          id?: number
          insightId?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "factInsight_factId_fkey"
            columns: ["factId"]
            isOneToOne: false
            referencedRelation: "fact"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factInsight_insightId_fkey"
            columns: ["insightId"]
            isOneToOne: false
            referencedRelation: "insight"
            referencedColumns: ["id"]
          }
        ]
      }
      insight: {
        Row: {
          content: string
          createdAt: string | null
          id: number
        }
        Insert: {
          content: string
          createdAt?: string | null
          id?: number
        }
        Update: {
          content?: string
          createdAt?: string | null
          id?: number
        }
        Relationships: []
      }
      insightConclusion: {
        Row: {
          conclusionId: number | null
          createdAt: string | null
          id: number
          insightId: number | null
        }
        Insert: {
          conclusionId?: number | null
          createdAt?: string | null
          id?: number
          insightId?: number | null
        }
        Update: {
          conclusionId?: number | null
          createdAt?: string | null
          id?: number
          insightId?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "insightConclusion_conclusionId_fkey"
            columns: ["conclusionId"]
            isOneToOne: false
            referencedRelation: "conclusion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insightConclusion_insightId_fkey"
            columns: ["insightId"]
            isOneToOne: false
            referencedRelation: "insight"
            referencedColumns: ["id"]
          }
        ]
      }
      project: {
        Row: {
          createdAt: string | null
          description: string | null
          id: number
        }
        Insert: {
          createdAt?: string | null
          description?: string | null
          id?: number
        }
        Update: {
          createdAt?: string | null
          description?: string | null
          id?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never
