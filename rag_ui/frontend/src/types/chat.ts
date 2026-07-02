// Chat message shapes — used by the UI and the /chat/ask endpoint

/** A message displayed in the chat window. id is a sequential integer for React keys. */
export interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

/** The request body sent to POST /chat/ask */
export interface AskRequest {
  question: string;
  history: HistoryItem[];
  session_id: string;
}

/** A single history entry sent as context with each question */
export interface HistoryItem {
  role: string;
  content: string;
}

/** The response body from POST /chat/ask */
export interface AskResponse {
  question: string;
  answer: string;
}
