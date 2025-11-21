export type UserType = 'merchant' | 'buyer';

export interface User {
  user_id: string;
  email: string;
  user_type: UserType;
  email_verified: boolean;
  full_name?: string;
  created_at: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  user_type: UserType;
  full_name?: string;
}

export interface VerifyEmailRequest {
  email: string;
  otp: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  status: string;
  message: string;
  data: User;
}
