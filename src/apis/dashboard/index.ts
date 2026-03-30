import { http } from '../request';
import { DashboardResult } from './types';

const getData = () => {
  return http.get<DashboardResult>('/api/dashboard');
};

export const dashboardApi = { getData };
