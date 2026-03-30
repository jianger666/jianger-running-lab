import { http } from '../request';
import { Reminder, CreateReminderParams, UpdateReminderParams } from './types';

const getList = () => {
  return http.get<Reminder[]>('/api/reminder');
};

const create = (params: CreateReminderParams) => {
  return http.post<Reminder>('/api/reminder', params as Record<string, unknown>);
};

const update = (params: UpdateReminderParams) => {
  return http.put<Reminder>('/api/reminder', params as Record<string, unknown>);
};

const remove = ({ id }: { id: number }) => {
  return http.delete<{ deleted: boolean }>(`/api/reminder?id=${id}`);
};

export const reminderApi = { getList, create, update, remove };
