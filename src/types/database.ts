export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_insights: {
        Row: {
          confidence_level: string | null
          created_at: string
          fact_text: string | null
          id: string
          insight_type: string
          interpretation_text: string | null
          monitoring_point_id: string | null
          period_end: string | null
          period_start: string | null
          priority: string | null
          recommendation_text: string | null
          source_data_ref: Json | null
          yacht_id: string
        }
        Insert: {
          confidence_level?: string | null
          created_at?: string
          fact_text?: string | null
          id?: string
          insight_type: string
          interpretation_text?: string | null
          monitoring_point_id?: string | null
          period_end?: string | null
          period_start?: string | null
          priority?: string | null
          recommendation_text?: string | null
          source_data_ref?: Json | null
          yacht_id: string
        }
        Update: {
          confidence_level?: string | null
          created_at?: string
          fact_text?: string | null
          id?: string
          insight_type?: string
          interpretation_text?: string | null
          monitoring_point_id?: string | null
          period_end?: string | null
          period_start?: string | null
          priority?: string | null
          recommendation_text?: string | null
          source_data_ref?: Json | null
          yacht_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_monitoring_point_id_fkey"
            columns: ["monitoring_point_id"]
            isOneToOne: false
            referencedRelation: "monitoring_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_insights_yacht_id_fkey"
            columns: ["yacht_id"]
            isOneToOne: false
            referencedRelation: "yachts"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          created_at: string
          current_value: number | null
          first_detected_at: string
          id: string
          last_detected_at: string
          monitoring_point_id: string | null
          parameter: string
          recommended_action: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          status: Database["public"]["Enums"]["alert_status"]
          threshold_id: string | null
          yacht_id: string
        }
        Insert: {
          created_at?: string
          current_value?: number | null
          first_detected_at?: string
          id?: string
          last_detected_at?: string
          monitoring_point_id?: string | null
          parameter: string
          recommended_action?: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          status?: Database["public"]["Enums"]["alert_status"]
          threshold_id?: string | null
          yacht_id: string
        }
        Update: {
          created_at?: string
          current_value?: number | null
          first_detected_at?: string
          id?: string
          last_detected_at?: string
          monitoring_point_id?: string | null
          parameter?: string
          recommended_action?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          status?: Database["public"]["Enums"]["alert_status"]
          threshold_id?: string | null
          yacht_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_monitoring_point_id_fkey"
            columns: ["monitoring_point_id"]
            isOneToOne: false
            referencedRelation: "monitoring_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_threshold_id_fkey"
            columns: ["threshold_id"]
            isOneToOne: false
            referencedRelation: "thresholds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_yacht_id_fkey"
            columns: ["yacht_id"]
            isOneToOne: false
            referencedRelation: "yachts"
            referencedColumns: ["id"]
          },
        ]
      }
      app_users: {
        Row: {
          captain_mode_default: boolean
          company_id: string
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          captain_mode_default?: boolean
          company_id: string
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          captain_mode_default?: boolean
          company_id?: string
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      areas: {
        Row: {
          created_at: string
          deck_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          deck_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          deck_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "areas_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          after_json: Json | null
          before_json: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          after_json?: Json | null
          before_json?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          after_json?: Json | null
          before_json?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          branding: Json | null
          company_id: string
          created_at: string
          id: string
          logo_url: string | null
          updated_at: string
        }
        Insert: {
          branding?: Json | null
          company_id: string
          created_at?: string
          id?: string
          logo_url?: string | null
          updated_at?: string
        }
        Update: {
          branding?: Json | null
          company_id?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      decks: {
        Row: {
          created_at: string
          deck_order: number
          id: string
          name: string
          yacht_id: string
        }
        Insert: {
          created_at?: string
          deck_order?: number
          id?: string
          name: string
          yacht_id: string
        }
        Update: {
          created_at?: string
          deck_order?: number
          id?: string
          name?: string
          yacht_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decks_yacht_id_fkey"
            columns: ["yacht_id"]
            isOneToOne: false
            referencedRelation: "yachts"
            referencedColumns: ["id"]
          },
        ]
      }
      ga_plan_pins: {
        Row: {
          created_at: string
          ga_plan_id: string
          id: string
          monitoring_point_id: string
          updated_at: string
          x_coord: number
          y_coord: number
        }
        Insert: {
          created_at?: string
          ga_plan_id: string
          id?: string
          monitoring_point_id: string
          updated_at?: string
          x_coord: number
          y_coord: number
        }
        Update: {
          created_at?: string
          ga_plan_id?: string
          id?: string
          monitoring_point_id?: string
          updated_at?: string
          x_coord?: number
          y_coord?: number
        }
        Relationships: [
          {
            foreignKeyName: "ga_plan_pins_ga_plan_id_fkey"
            columns: ["ga_plan_id"]
            isOneToOne: false
            referencedRelation: "ga_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ga_plan_pins_monitoring_point_id_fkey"
            columns: ["monitoring_point_id"]
            isOneToOne: false
            referencedRelation: "monitoring_points"
            referencedColumns: ["id"]
          },
        ]
      }
      ga_plans: {
        Row: {
          deck_id: string | null
          file_type: string
          file_url: string
          id: string
          label: string | null
          page_number: number | null
          uploaded_at: string
          yacht_id: string
        }
        Insert: {
          deck_id?: string | null
          file_type: string
          file_url: string
          id?: string
          label?: string | null
          page_number?: number | null
          uploaded_at?: string
          yacht_id: string
        }
        Update: {
          deck_id?: string | null
          file_type?: string
          file_url?: string
          id?: string
          label?: string | null
          page_number?: number | null
          uploaded_at?: string
          yacht_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ga_plans_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ga_plans_yacht_id_fkey"
            columns: ["yacht_id"]
            isOneToOne: false
            referencedRelation: "yachts"
            referencedColumns: ["id"]
          },
        ]
      }
      import_errors: {
        Row: {
          created_at: string
          error_type: string
          id: string
          import_job_id: string
          message: string | null
          raw_data: Json | null
          row_number: number | null
        }
        Insert: {
          created_at?: string
          error_type: string
          id?: string
          import_job_id: string
          message?: string | null
          raw_data?: Json | null
          row_number?: number | null
        }
        Update: {
          created_at?: string
          error_type?: string
          id?: string
          import_job_id?: string
          message?: string | null
          raw_data?: Json | null
          row_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "import_errors_import_job_id_fkey"
            columns: ["import_job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      import_jobs: {
        Row: {
          created_at: string
          date_range_end: string | null
          date_range_start: string | null
          file_name: string
          file_type: string
          id: string
          mapping_profile: Json | null
          monitoring_points_detected: number | null
          parameters_detected: string[] | null
          records_imported: number
          records_rejected: number
          status: Database["public"]["Enums"]["import_job_status"]
          uploaded_by: string | null
          yacht_id: string
        }
        Insert: {
          created_at?: string
          date_range_end?: string | null
          date_range_start?: string | null
          file_name: string
          file_type: string
          id?: string
          mapping_profile?: Json | null
          monitoring_points_detected?: number | null
          parameters_detected?: string[] | null
          records_imported?: number
          records_rejected?: number
          status?: Database["public"]["Enums"]["import_job_status"]
          uploaded_by?: string | null
          yacht_id: string
        }
        Update: {
          created_at?: string
          date_range_end?: string | null
          date_range_start?: string | null
          file_name?: string
          file_type?: string
          id?: string
          mapping_profile?: Json | null
          monitoring_points_detected?: number | null
          parameters_detected?: string[] | null
          records_imported?: number
          records_rejected?: number
          status?: Database["public"]["Enums"]["import_job_status"]
          uploaded_by?: string | null
          yacht_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_jobs_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_jobs_yacht_id_fkey"
            columns: ["yacht_id"]
            isOneToOne: false
            referencedRelation: "yachts"
            referencedColumns: ["id"]
          },
        ]
      }
      measurements: {
        Row: {
          created_at: string
          id: string
          import_job_id: string | null
          monitoring_point_id: string
          parameter: string
          sensor_id: string | null
          timestamp: string
          unit: string | null
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          import_job_id?: string | null
          monitoring_point_id: string
          parameter: string
          sensor_id?: string | null
          timestamp: string
          unit?: string | null
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          import_job_id?: string | null
          monitoring_point_id?: string
          parameter?: string
          sensor_id?: string | null
          timestamp?: string
          unit?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "measurements_import_job_id_fkey"
            columns: ["import_job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurements_monitoring_point_id_fkey"
            columns: ["monitoring_point_id"]
            isOneToOne: false
            referencedRelation: "monitoring_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurements_sensor_id_fkey"
            columns: ["sensor_id"]
            isOneToOne: false
            referencedRelation: "sensors"
            referencedColumns: ["id"]
          },
        ]
      }
      monitoring_points: {
        Row: {
          active: boolean
          area_id: string | null
          code: string | null
          created_at: string
          id: string
          name: string
          room_location: string | null
          status: Database["public"]["Enums"]["monitoring_point_status"]
          updated_at: string
          yacht_id: string
        }
        Insert: {
          active?: boolean
          area_id?: string | null
          code?: string | null
          created_at?: string
          id?: string
          name: string
          room_location?: string | null
          status?: Database["public"]["Enums"]["monitoring_point_status"]
          updated_at?: string
          yacht_id: string
        }
        Update: {
          active?: boolean
          area_id?: string | null
          code?: string | null
          created_at?: string
          id?: string
          name?: string
          room_location?: string | null
          status?: Database["public"]["Enums"]["monitoring_point_status"]
          updated_at?: string
          yacht_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monitoring_points_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitoring_points_yacht_id_fkey"
            columns: ["yacht_id"]
            isOneToOne: false
            referencedRelation: "yachts"
            referencedColumns: ["id"]
          },
        ]
      }
      report_snapshots: {
        Row: {
          created_at: string
          id: string
          json_snapshot: Json
          report_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          json_snapshot: Json
          report_id: string
        }
        Update: {
          created_at?: string
          id?: string
          json_snapshot?: Json
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_snapshots_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          generated_by: string | null
          id: string
          overall_score: number | null
          pdf_url: string | null
          period_end: string
          period_start: string
          status: Database["public"]["Enums"]["report_status"]
          yacht_id: string
        }
        Insert: {
          created_at?: string
          generated_by?: string | null
          id?: string
          overall_score?: number | null
          pdf_url?: string | null
          period_end: string
          period_start: string
          status?: Database["public"]["Enums"]["report_status"]
          yacht_id: string
        }
        Update: {
          created_at?: string
          generated_by?: string | null
          id?: string
          overall_score?: number | null
          pdf_url?: string | null
          period_end?: string
          period_start?: string
          status?: Database["public"]["Enums"]["report_status"]
          yacht_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_yacht_id_fkey"
            columns: ["yacht_id"]
            isOneToOne: false
            referencedRelation: "yachts"
            referencedColumns: ["id"]
          },
        ]
      }
      scoring_configurations: {
        Row: {
          active: boolean
          company_id: string | null
          config_type: Database["public"]["Enums"]["scoring_config_type"]
          created_at: string
          id: string
          version: number
          weights: Json
          yacht_id: string | null
        }
        Insert: {
          active?: boolean
          company_id?: string | null
          config_type: Database["public"]["Enums"]["scoring_config_type"]
          created_at?: string
          id?: string
          version?: number
          weights: Json
          yacht_id?: string | null
        }
        Update: {
          active?: boolean
          company_id?: string | null
          config_type?: Database["public"]["Enums"]["scoring_config_type"]
          created_at?: string
          id?: string
          version?: number
          weights?: Json
          yacht_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scoring_configurations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scoring_configurations_yacht_id_fkey"
            columns: ["yacht_id"]
            isOneToOne: false
            referencedRelation: "yachts"
            referencedColumns: ["id"]
          },
        ]
      }
      sensors: {
        Row: {
          created_at: string
          external_sensor_id: string | null
          id: string
          installation_date: string | null
          manufacturer: string | null
          model: string | null
          monitoring_point_id: string
          serial_number: string | null
          status: string | null
        }
        Insert: {
          created_at?: string
          external_sensor_id?: string | null
          id?: string
          installation_date?: string | null
          manufacturer?: string | null
          model?: string | null
          monitoring_point_id: string
          serial_number?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string
          external_sensor_id?: string | null
          id?: string
          installation_date?: string | null
          manufacturer?: string | null
          model?: string | null
          monitoring_point_id?: string
          serial_number?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sensors_monitoring_point_id_fkey"
            columns: ["monitoring_point_id"]
            isOneToOne: false
            referencedRelation: "monitoring_points"
            referencedColumns: ["id"]
          },
        ]
      }
      thresholds: {
        Row: {
          company_id: string | null
          created_at: string
          critical_threshold: number | null
          id: string
          notes: string | null
          parameter: string
          persistence_minutes: number
          preferred_max: number | null
          preferred_min: number | null
          source_reference: string | null
          updated_at: string
          warning_threshold: number | null
          yacht_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          critical_threshold?: number | null
          id?: string
          notes?: string | null
          parameter: string
          persistence_minutes?: number
          preferred_max?: number | null
          preferred_min?: number | null
          source_reference?: string | null
          updated_at?: string
          warning_threshold?: number | null
          yacht_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          critical_threshold?: number | null
          id?: string
          notes?: string | null
          parameter?: string
          persistence_minutes?: number
          preferred_max?: number | null
          preferred_min?: number | null
          source_reference?: string | null
          updated_at?: string
          warning_threshold?: number | null
          yacht_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "thresholds_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thresholds_yacht_id_fkey"
            columns: ["yacht_id"]
            isOneToOne: false
            referencedRelation: "yachts"
            referencedColumns: ["id"]
          },
        ]
      }
      yachts: {
        Row: {
          build_year: number | null
          captain_name: string | null
          company_id: string
          created_at: string
          flag: string | null
          gross_tonnage: number | null
          id: string
          imo_number: string | null
          length_m: number | null
          management_company: string | null
          monitoring_end_date: string | null
          monitoring_frequency: string | null
          monitoring_provider: string | null
          monitoring_start_date: string | null
          name: string
          owner_name: string | null
          shipyard: string | null
          updated_at: string
          yacht_type: string | null
        }
        Insert: {
          build_year?: number | null
          captain_name?: string | null
          company_id: string
          created_at?: string
          flag?: string | null
          gross_tonnage?: number | null
          id?: string
          imo_number?: string | null
          length_m?: number | null
          management_company?: string | null
          monitoring_end_date?: string | null
          monitoring_frequency?: string | null
          monitoring_provider?: string | null
          monitoring_start_date?: string | null
          name: string
          owner_name?: string | null
          shipyard?: string | null
          updated_at?: string
          yacht_type?: string | null
        }
        Update: {
          build_year?: number | null
          captain_name?: string | null
          company_id?: string
          created_at?: string
          flag?: string | null
          gross_tonnage?: number | null
          id?: string
          imo_number?: string | null
          length_m?: number | null
          management_company?: string | null
          monitoring_end_date?: string | null
          monitoring_frequency?: string | null
          monitoring_provider?: string | null
          monitoring_start_date?: string | null
          name?: string
          owner_name?: string | null
          shipyard?: string | null
          updated_at?: string
          yacht_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "yachts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_company_id: { Args: never; Returns: string }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      alert_severity: "info" | "warning" | "critical"
      alert_status: "open" | "acknowledged" | "resolved"
      import_job_status:
        | "processing"
        | "completed"
        | "completed_with_errors"
        | "failed"
      monitoring_point_status: "active" | "inactive" | "maintenance"
      report_status: "draft" | "final"
      scoring_config_type:
        | "comfort"
        | "mould_risk"
        | "biological_safety"
        | "luxury_perception"
        | "overall"
      user_role: "admin" | "technical" | "captain" | "viewer"
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
      alert_severity: ["info", "warning", "critical"],
      alert_status: ["open", "acknowledged", "resolved"],
      import_job_status: [
        "processing",
        "completed",
        "completed_with_errors",
        "failed",
      ],
      monitoring_point_status: ["active", "inactive", "maintenance"],
      report_status: ["draft", "final"],
      scoring_config_type: [
        "comfort",
        "mould_risk",
        "biological_safety",
        "luxury_perception",
        "overall",
      ],
      user_role: ["admin", "technical", "captain", "viewer"],
    },
  },
} as const
