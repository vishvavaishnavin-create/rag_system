export interface AdminStats {
  total_users: number;
  active_users: number;
  total_sessions: number;
  total_messages: number;
  total_pdfs: number;
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  session_count: number;
  message_count: number;
}

export interface AdminUsersResponse {
  users: AdminUser[];
}

export interface AdminPDF {
  filename: string;
  uploaded_by: string;
  chunk_count: number;
}

export interface AdminPDFsResponse {
  pdfs: AdminPDF[];
}

export interface DailyActivity {
  date: string;
  messages: number;
}

export interface AdminActivityResponse {
  activity: DailyActivity[];
}
