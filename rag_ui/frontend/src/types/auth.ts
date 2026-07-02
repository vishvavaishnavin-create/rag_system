// Shapes of data sent to and received from /auth/* endpoints

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  is_active: boolean;
  has_seen_tour: boolean;
  avatar_url: string | null;
  auth_provider: string;
}
