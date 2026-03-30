import { http } from '../request';
import { Activity, ActivityListResult } from './types';

const getList = ({
  page = 1,
  pageSize = 20,
}: {
  page?: number;
  pageSize?: number;
} = {}) => {
  return http.get<ActivityListResult>(
    `/api/activities?page=${page}&pageSize=${pageSize}`,
  );
};

const getDetail = ({ id }: { id: string }) => {
  return http.get<Activity>(`/api/activities/${id}`);
};

export const activityApi = { getList, getDetail };
