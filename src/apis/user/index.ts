import { http } from '../request';
import { LoginResult } from './types';

const login = ({ code }: { code: string }) => {
  return http.post<LoginResult>('/api/mp/login', { code });
};

export const userApi = { login };
