import api from '@/lib/axios';
import type { User } from '@/types/auth';

export interface UserProfileResponse {
  status: string;
  message: string;
  data: User;
}

export const userService = {
  getProfile: async () => {
    const response = await api.get<UserProfileResponse>('/user/profile');
    return response.data;
  }
};
