import { http } from '../request';
import { BindWatchParams, SyncResult } from './types';

const bind = ({
  brand,
  account,
  password,
}: Omit<BindWatchParams, 'userId'>) => {
  return http.post<{ bound: boolean; brand: string }>('/api/watch/bind', {
    brand,
    account,
    password,
  });
};

const sync = () => {
  return http.post<SyncResult>('/api/watch/sync');
};

export const watchApi = { bind, sync };
