export interface UserStats {
  total_sessions: number;
  total_messages: number;
  total_questions: number;
  pdfs_uploaded: number;
  avg_messages_per_session: number;
  most_active_day: string;
  member_since: string;
}

export interface DailyActivity {
  date: string;
  messages: number;
  questions: number;
}

export interface ActivityResponse {
  activity: DailyActivity[];
}

export interface TopTopic {
  topic: string;
  count: number;
}

export interface TopicsResponse {
  topics: TopTopic[];
}
