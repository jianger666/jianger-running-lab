import { http } from '../request';
import {
  RecognizeResult,
  DailySummary,
  SaveFoodParams,
  FoodRecord,
} from './types';

const recognize = ({ image }: { image: string }) => {
  return http.post<RecognizeResult>('/api/food/recognize', { image });
};

const getDaily = ({ date }: { date?: string } = {}) => {
  const query = date ? `?date=${date}` : '';
  return http.get<DailySummary>(`/api/food/daily${query}`);
};

const save = (params: SaveFoodParams) => {
  return http.post<{ count: number }>(
    '/api/food',
    params as unknown as Record<string, unknown>,
  );
};

const remove = ({ id }: { id: string }) => {
  return http.delete<{ id: string }>(`/api/food/${id}`);
};

const getList = ({
  date,
  page,
  pageSize,
}: {
  date?: string;
  page?: number;
  pageSize?: number;
} = {}) => {
  const params = new URLSearchParams();
  if (date) params.set('date', date);
  if (page) params.set('page', String(page));
  if (pageSize) params.set('pageSize', String(pageSize));
  const query = params.toString();
  return http.get<{ records: FoodRecord[]; total: number }>(
    `/api/food${query ? `?${query}` : ''}`,
  );
};

export const foodApi = { recognize, getDaily, save, remove, getList };
