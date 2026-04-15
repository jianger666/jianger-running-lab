import { http } from '../request';
import { UserProfile, UpdateProfileParams } from './types';

const get = () => {
  return http.get<UserProfile>('/api/profile');
};

const update = (params: UpdateProfileParams) => {
  return http.put<UserProfile>(
    '/api/profile',
    params as Record<string, unknown>,
  );
};

export const profileApi = { get, update };
