export interface UserTopic {
  name: string;
  wiki_title: string;
  added_at: string;
  chunks_count: number;
}

export interface TopicsAvailableResponse {
  default_topics: string[];
  user_topics: UserTopic[];
  all_topics: string[];
}

export interface AddTopicResponse {
  message: string;
  chunks_added: number;
  wiki_title: string;
}
