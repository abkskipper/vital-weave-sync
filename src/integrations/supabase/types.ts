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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          body: string | null
          category: string
          created_at: string
          id: string
          patient_id: string | null
          severity: string
          source: string | null
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          body?: string | null
          category: string
          created_at?: string
          id?: string
          patient_id?: string | null
          severity?: string
          source?: string | null
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          body?: string | null
          category?: string
          created_at?: string
          id?: string
          patient_id?: string | null
          severity?: string
          source?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      antenatal_visits: {
        Row: {
          created_at: string
          diastolic_bp: number | null
          fetal_heart_rate: number | null
          fundal_height_cm: number | null
          gestational_age_weeks: number | null
          id: string
          maternal_id: string
          notes: string | null
          patient_id: string
          recorded_by: string | null
          systolic_bp: number | null
          visit_date: string
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          diastolic_bp?: number | null
          fetal_heart_rate?: number | null
          fundal_height_cm?: number | null
          gestational_age_weeks?: number | null
          id?: string
          maternal_id: string
          notes?: string | null
          patient_id: string
          recorded_by?: string | null
          systolic_bp?: number | null
          visit_date?: string
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          diastolic_bp?: number | null
          fetal_heart_rate?: number | null
          fundal_height_cm?: number | null
          gestational_age_weeks?: number | null
          id?: string
          maternal_id?: string
          notes?: string | null
          patient_id?: string
          recorded_by?: string | null
          systolic_bp?: number | null
          visit_date?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "antenatal_visits_maternal_id_fkey"
            columns: ["maternal_id"]
            isOneToOne: false
            referencedRelation: "maternal_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "antenatal_visits_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          clinician_id: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          location: string | null
          patient_id: string
          starts_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          clinician_id?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          location?: string | null
          patient_id: string
          starts_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          clinician_id?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          location?: string | null
          patient_id?: string
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      care_plans: {
        Row: {
          author_id: string | null
          created_at: string
          goals: string | null
          id: string
          interventions: string | null
          patient_id: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          goals?: string | null
          id?: string
          interventions?: string | null
          patient_id: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          created_at?: string
          goals?: string | null
          id?: string
          interventions?: string | null
          patient_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      caregiver_links: {
        Row: {
          caregiver_id: string
          created_at: string
          id: string
          patient_id: string
          relationship: string | null
        }
        Insert: {
          caregiver_id: string
          created_at?: string
          id?: string
          patient_id: string
          relationship?: string | null
        }
        Update: {
          caregiver_id?: string
          created_at?: string
          id?: string
          patient_id?: string
          relationship?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "caregiver_links_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      child_records: {
        Row: {
          age_months: number | null
          created_at: string
          head_circumference_cm: number | null
          height_cm: number | null
          id: string
          milestone_notes: string | null
          muac_cm: number | null
          patient_id: string
          recorded_by: string | null
          visit_date: string
          weight_kg: number | null
        }
        Insert: {
          age_months?: number | null
          created_at?: string
          head_circumference_cm?: number | null
          height_cm?: number | null
          id?: string
          milestone_notes?: string | null
          muac_cm?: number | null
          patient_id: string
          recorded_by?: string | null
          visit_date?: string
          weight_kg?: number | null
        }
        Update: {
          age_months?: number | null
          created_at?: string
          head_circumference_cm?: number | null
          height_cm?: number | null
          id?: string
          milestone_notes?: string | null
          muac_cm?: number | null
          patient_id?: string
          recorded_by?: string | null
          visit_date?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "child_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          patient_id: string
          phone: string
          relationship: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          patient_id: string
          phone: string
          relationship?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          patient_id?: string
          phone?: string
          relationship?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emergency_contacts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      home_care_visits: {
        Row: {
          clinician_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          patient_id: string
          scheduled_for: string
          started_at: string | null
          status: string
          summary: string | null
          tasks: Json | null
          updated_at: string
        }
        Insert: {
          clinician_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          patient_id: string
          scheduled_for: string
          started_at?: string | null
          status?: string
          summary?: string | null
          tasks?: Json | null
          updated_at?: string
        }
        Update: {
          clinician_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          patient_id?: string
          scheduled_for?: string
          started_at?: string | null
          status?: string
          summary?: string | null
          tasks?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_care_visits_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      immunizations: {
        Row: {
          administered_on: string | null
          created_at: string
          dose_label: string | null
          id: string
          lot_number: string | null
          next_due_on: string | null
          notes: string | null
          patient_id: string
          recorded_by: string | null
          site: string | null
          vaccine: string
        }
        Insert: {
          administered_on?: string | null
          created_at?: string
          dose_label?: string | null
          id?: string
          lot_number?: string | null
          next_due_on?: string | null
          notes?: string | null
          patient_id: string
          recorded_by?: string | null
          site?: string | null
          vaccine: string
        }
        Update: {
          administered_on?: string | null
          created_at?: string
          dose_label?: string | null
          id?: string
          lot_number?: string | null
          next_due_on?: string | null
          notes?: string | null
          patient_id?: string
          recorded_by?: string | null
          site?: string | null
          vaccine?: string
        }
        Relationships: [
          {
            foreignKeyName: "immunizations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      maternal_records: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          edd: string | null
          gravida: number | null
          id: string
          lmp: string | null
          notes: string | null
          para: number | null
          patient_id: string
          risk_level: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          edd?: string | null
          gravida?: number | null
          id?: string
          lmp?: string | null
          notes?: string | null
          para?: number | null
          patient_id: string
          risk_level?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          edd?: string | null
          gravida?: number | null
          id?: string
          lmp?: string | null
          notes?: string | null
          para?: number | null
          patient_id?: string
          risk_level?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maternal_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_administrations: {
        Row: {
          administered_at: string
          administered_by: string | null
          id: string
          medication_id: string
          notes: string | null
          patient_id: string
          scheduled_for: string | null
          status: string
        }
        Insert: {
          administered_at?: string
          administered_by?: string | null
          id?: string
          medication_id: string
          notes?: string | null
          patient_id: string
          scheduled_for?: string | null
          status?: string
        }
        Update: {
          administered_at?: string
          administered_by?: string | null
          id?: string
          medication_id?: string
          notes?: string | null
          patient_id?: string
          scheduled_for?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_administrations_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_administrations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          dosage: string
          end_date: string | null
          frequency: string
          id: string
          instructions: string | null
          name: string
          patient_id: string
          route: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          dosage: string
          end_date?: string | null
          frequency: string
          id?: string
          instructions?: string | null
          name: string
          patient_id: string
          route?: string | null
          start_date?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          dosage?: string
          end_date?: string | null
          frequency?: string
          id?: string
          instructions?: string | null
          name?: string
          patient_id?: string
          route?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medications_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      mental_health_screenings: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          patient_id: string
          recorded_by: string | null
          responses: Json | null
          score: number
          severity: string
          tool: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          patient_id: string
          recorded_by?: string | null
          responses?: Json | null
          score: number
          severity: string
          tool: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          patient_id?: string
          recorded_by?: string | null
          responses?: Json | null
          score?: number
          severity?: string
          tool?: string
        }
        Relationships: [
          {
            foreignKeyName: "mental_health_screenings_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      nursing_notes: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          patient_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          patient_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nursing_notes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_assignments: {
        Row: {
          clinician_id: string
          created_at: string
          id: string
          patient_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          clinician_id: string
          created_at?: string
          id?: string
          patient_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          clinician_id?: string
          created_at?: string
          id?: string
          patient_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "patient_assignments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          allergies: string | null
          blood_type: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          full_name: string
          id: string
          medical_history: string | null
          mrn: string | null
          phone: string | null
          sex: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          allergies?: string | null
          blood_type?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          full_name: string
          id?: string
          medical_history?: string | null
          mrn?: string | null
          phone?: string | null
          sex?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          allergies?: string | null
          blood_type?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          full_name?: string
          id?: string
          medical_history?: string | null
          mrn?: string | null
          phone?: string | null
          sex?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount_ngn: number
          channel: string | null
          created_at: string
          currency: string
          id: string
          paystack_event: string | null
          plan_code: string | null
          raw: Json | null
          reference: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_ngn: number
          channel?: string | null
          created_at?: string
          currency?: string
          id?: string
          paystack_event?: string | null
          plan_code?: string | null
          raw?: Json | null
          reference: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_ngn?: number
          channel?: string | null
          created_at?: string
          currency?: string
          id?: string
          paystack_event?: string | null
          plan_code?: string | null
          raw?: Json | null
          reference?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_plan_code_fkey"
            columns: ["plan_code"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["code"]
          },
        ]
      }
      plans: {
        Row: {
          code: string
          created_at: string
          description: string | null
          features: Json
          id: string
          interval: string
          is_active: boolean
          max_clinicians: number | null
          max_patients: number | null
          name: string
          price_ngn: number
          sort_order: number
          trial_days: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          interval?: string
          is_active?: boolean
          max_clinicians?: number | null
          max_patients?: number | null
          name: string
          price_ngn?: number
          sort_order?: number
          trial_days?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          interval?: string
          is_active?: boolean
          max_clinicians?: number | null
          max_patients?: number | null
          name?: string
          price_ngn?: number
          sort_order?: number
          trial_days?: number
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
          organization: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          organization?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          organization?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          code: string
          created_at: string
          id: string
          redeemed_at: string | null
          referred_user_id: string | null
          referrer_id: string
          reward_ngn: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          redeemed_at?: string | null
          referred_user_id?: string | null
          referrer_id: string
          reward_ngn?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          redeemed_at?: string | null
          referred_user_id?: string | null
          referrer_id?: string
          reward_ngn?: number
        }
        Relationships: []
      }
      shift_handovers: {
        Row: {
          created_at: string
          from_user: string | null
          id: string
          patient_id: string
          shift_at: string
          summary: string
          to_user: string | null
        }
        Insert: {
          created_at?: string
          from_user?: string | null
          id?: string
          patient_id: string
          shift_at?: string
          summary: string
          to_user?: string | null
        }
        Update: {
          created_at?: string
          from_user?: string | null
          id?: string
          patient_id?: string
          shift_at?: string
          summary?: string
          to_user?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_handovers_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          last_reference: string | null
          paystack_authorization_code: string | null
          paystack_customer_code: string | null
          paystack_subscription_code: string | null
          plan_code: string
          status: string
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          last_reference?: string | null
          paystack_authorization_code?: string | null
          paystack_customer_code?: string | null
          paystack_subscription_code?: string | null
          plan_code: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          last_reference?: string | null
          paystack_authorization_code?: string | null
          paystack_customer_code?: string | null
          paystack_subscription_code?: string | null
          plan_code?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_code_fkey"
            columns: ["plan_code"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["code"]
          },
        ]
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
          role: Database["public"]["Enums"]["app_role"]
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
      vitals: {
        Row: {
          blood_sugar_mgdl: number | null
          diastolic_bp: number | null
          heart_rate: number | null
          id: string
          notes: string | null
          patient_id: string
          recorded_at: string
          recorded_by: string | null
          respiratory_rate: number | null
          spo2: number | null
          systolic_bp: number | null
          temperature_c: number | null
        }
        Insert: {
          blood_sugar_mgdl?: number | null
          diastolic_bp?: number | null
          heart_rate?: number | null
          id?: string
          notes?: string | null
          patient_id: string
          recorded_at?: string
          recorded_by?: string | null
          respiratory_rate?: number | null
          spo2?: number | null
          systolic_bp?: number | null
          temperature_c?: number | null
        }
        Update: {
          blood_sugar_mgdl?: number | null
          diastolic_bp?: number | null
          heart_rate?: number | null
          id?: string
          notes?: string | null
          patient_id?: string
          recorded_at?: string
          recorded_by?: string | null
          respiratory_rate?: number | null
          spo2?: number | null
          systolic_bp?: number | null
          temperature_c?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vitals_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_accounts: {
        Row: {
          balance_ngn: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_ngn?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_ngn?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount_ngn: number
          created_at: string
          direction: string
          id: string
          reason: string
          reference: string | null
          user_id: string
        }
        Insert: {
          amount_ngn: number
          created_at?: string
          direction: string
          id?: string
          reason: string
          reference?: string | null
          user_id: string
        }
        Update: {
          amount_ngn?: number
          created_at?: string
          direction?: string
          id?: string
          reason?: string
          reference?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_patient: {
        Args: { _patient_id: string; _user_id: string }
        Returns: boolean
      }
      claim_referral: { Args: { _code: string }; Returns: boolean }
      current_plan_code: { Args: { _user_id: string }; Returns: string }
      has_active_subscription: {
        Args: { _min_plan?: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_clinician: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "nurse" | "doctor" | "patient" | "caregiver" | "admin"
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
      app_role: ["nurse", "doctor", "patient", "caregiver", "admin"],
    },
  },
} as const
