import { http } from '../request';
import { BindCorosParams, SyncResult } from './types';

const bind = ({ userId, account, password }: BindCorosParams) => {
  return http.post<{ bound: boolean }>('/api/coros/bind', { userId, account, password });
};

const sync = ({ userId }: { userId: number }) => {
  return http.post<SyncResult>('/api/coros/sync', { userId });
};

export const corosApi = { bind, sync };
