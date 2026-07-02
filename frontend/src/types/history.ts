// History endpoint response shapes

export interface HistoryMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Session {
  session_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface SessionsResponse {
  sessions: Session[];
}

export interface SessionDetail {
  session_id: string;
  title: string;
  messages: HistoryMessage[];
}

// Kept for backward compatibility
export interface HistoryResponse {
  history: HistoryMessage[];
}
