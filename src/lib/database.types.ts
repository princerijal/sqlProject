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
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          is_developer: boolean
          is_validator: boolean
          is_db_admin: boolean
          is_admin: boolean
          is_approved: boolean
          is_change_user: boolean
          is_change_admin: boolean
          is_change_tester: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id: string
          email: string
          full_name: string
          is_developer?: boolean
          is_validator?: boolean
          is_db_admin?: boolean
          is_admin?: boolean
          is_approved?: boolean
          is_change_user?: boolean
          is_change_admin?: boolean
          is_change_tester?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          is_developer?: boolean
          is_validator?: boolean
          is_db_admin?: boolean
          is_admin?: boolean
          is_approved?: boolean
          is_change_user?: boolean
          is_change_admin?: boolean
          is_change_tester?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      queries: {
        Row: {
          id: string
          developer_id: string | null
          title: string
          database_name: string
          environment: 'DEV' | 'UAT' | 'LIVE'
          sql_content: string
          status: 'pending' | 'approved' | 'rejected' | 'executed'
          rejection_reason: string | null
          legacy_approved_by: string | null
          legacy_approved_at: string | null
          legacy_rejected_by: string | null
          legacy_rejected_at: string | null
          validated_by: string | null
          validated_at: string | null
          executed_by: string | null
          executed_at: string | null
          email_sent_to: string | null
          version: number
          created_at: string
          updated_at: string
          developer_name: string | null
          validator_name: string | null
          executor_name: string | null
        }
        Insert: {
          id?: string
          developer_id: string
          title: string
          database_name?: string
          environment?: 'DEV' | 'UAT' | 'LIVE'
          sql_content: string
          status?: 'pending' | 'approved' | 'rejected' | 'executed'
          rejection_reason?: string | null
          legacy_approved_by?: string | null
          legacy_approved_at?: string | null
          legacy_rejected_by?: string | null
          legacy_rejected_at?: string | null
          validated_by?: string | null
          validated_at?: string | null
          executed_by?: string | null
          executed_at?: string | null
          email_sent_to?: string | null
          version?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          developer_id?: string
          title?: string
          database_name?: string
          environment?: 'DEV' | 'UAT' | 'LIVE'
          sql_content?: string
          status?: 'pending' | 'approved' | 'rejected' | 'executed'
          rejection_reason?: string | null
          legacy_approved_by?: string | null
          legacy_approved_at?: string | null
          legacy_rejected_by?: string | null
          legacy_rejected_at?: string | null
          validated_by?: string | null
          validated_at?: string | null
          executed_by?: string | null
          executed_at?: string | null
          email_sent_to?: string | null
          version?: number
          created_at?: string
          updated_at?: string
        }
      }
      query_history: {
        Row: {
          id: string
          query_id: string
          action: 'created' | 'edited' | 'approved' | 'rejected' | 'resubmitted' | 'deleted'
          performed_by: string | null
          old_content: string | null
          new_content: string | null
          notes: string | null
          created_at: string
          performer_name: string | null
        }
        Insert: {
          id?: string
          query_id: string
          action: 'created' | 'edited' | 'approved' | 'rejected' | 'resubmitted' | 'deleted'
          performed_by?: string | null
          old_content?: string | null
          new_content?: string | null
          notes?: string | null
          created_at?: string
          performer_name?: string | null
        }
        Update: {
          id?: string
          query_id?: string
          action?: 'created' | 'edited' | 'approved' | 'rejected' | 'resubmitted' | 'deleted'
          performed_by?: string | null
          old_content?: string | null
          new_content?: string | null
          notes?: string | null
          created_at?: string
          performer_name?: string | null
        }
      }
      query_templates: {
        Row: {
          id: string
          title: string
          description: string
          category: string
          database_name: string
          sql_content: string
          created_by: string | null
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          category: string
          database_name: string
          sql_content: string
          created_by?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          category?: string
          database_name?: string
          sql_content?: string
          created_by?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      query_notifications: {
        Row: {
          id: string
          query_id: string
          user_id: string
          notification_type: string
          message: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          query_id: string
          user_id: string
          notification_type: string
          message: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          query_id?: string
          user_id?: string
          notification_type?: string
          message?: string
          is_read?: boolean
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          message: string
          query_id: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          message: string
          query_id?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          message?: string
          query_id?: string | null
          is_read?: boolean
          created_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string
          action_type: string
          target_type: string
          target_id: string
          details: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action_type: string
          target_type: string
          target_id: string
          details?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action_type?: string
          target_type?: string
          target_id?: string
          details?: Json
          created_at?: string
        }
      }
      change_requests: {
        Row: {
          id: string
          title: string
          description: string
          priority: 'Low' | 'Medium' | 'High'
          status: 'draft' | 'pending_approval' | 'approved' | 'in_testing' | 'test_passed' | 'test_failed' | 'scheduled' | 'completed' | 'rejected'
          start_date: string
          end_date: string
          created_by: string
          approved_by: string | null
          approved_at: string | null
          tested_by: string | null
          tested_at: string | null
          test_result: 'pass' | 'fail' | null
          test_notes: string | null
          completed_by: string | null
          completed_at: string | null
          rejection_reason: string | null
          rejected_by: string | null
          rejected_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          priority: 'Low' | 'Medium' | 'High'
          status?: 'draft' | 'pending_approval' | 'approved' | 'in_testing' | 'test_passed' | 'test_failed' | 'scheduled' | 'completed' | 'rejected'
          start_date: string
          end_date: string
          created_by: string
          approved_by?: string | null
          approved_at?: string | null
          tested_by?: string | null
          tested_at?: string | null
          test_result?: 'pass' | 'fail' | null
          test_notes?: string | null
          completed_by?: string | null
          completed_at?: string | null
          rejection_reason?: string | null
          rejected_by?: string | null
          rejected_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          priority?: 'Low' | 'Medium' | 'High'
          status?: 'draft' | 'pending_approval' | 'approved' | 'in_testing' | 'test_passed' | 'test_failed' | 'scheduled' | 'completed' | 'rejected'
          start_date?: string
          end_date?: string
          created_by?: string
          approved_by?: string | null
          approved_at?: string | null
          tested_by?: string | null
          tested_at?: string | null
          test_result?: 'pass' | 'fail' | null
          test_notes?: string | null
          completed_by?: string | null
          completed_at?: string | null
          rejection_reason?: string | null
          rejected_by?: string | null
          rejected_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      change_history: {
        Row: {
          id: string
          change_request_id: string
          action: 'created' | 'submitted' | 'approved' | 'rejected' | 'testing_started' | 'test_passed' | 'test_failed' | 'scheduled' | 'completed'
          performed_by: string | null
          performer_name: string | null
          old_status: string | null
          new_status: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          change_request_id: string
          action: 'created' | 'submitted' | 'approved' | 'rejected' | 'testing_started' | 'test_passed' | 'test_failed' | 'scheduled' | 'completed'
          performed_by?: string | null
          performer_name?: string | null
          old_status?: string | null
          new_status?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          change_request_id?: string
          action?: 'created' | 'submitted' | 'approved' | 'rejected' | 'testing_started' | 'test_passed' | 'test_failed' | 'scheduled' | 'completed'
          performed_by?: string | null
          performer_name?: string | null
          old_status?: string | null
          new_status?: string | null
          notes?: string | null
          created_at?: string
        }
      }
    }
  }
}

export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
export type Query = Database['public']['Tables']['queries']['Row'];
export type QueryHistory = Database['public']['Tables']['query_history']['Row'];
export type QueryTemplate = Database['public']['Tables']['query_templates']['Row'];
export type QueryNotification = Database['public']['Tables']['query_notifications']['Row'];
export type AuditLog = Database['public']['Tables']['audit_logs']['Row'];
export type ChangeRequest = Database['public']['Tables']['change_requests']['Row'];
export type ChangeHistory = Database['public']['Tables']['change_history']['Row'];
