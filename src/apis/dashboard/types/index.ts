import { Activity } from '../../activity/types';

export interface PeriodStats {
  totalCount: number;
  runCount: number;
  totalDistance: number;
  runDistance: number;
  totalDuration: number;
  totalCalorie: number;
  avgHeartRate: number | null;
  avgPace: number | null;
  distanceChange: number;
  countChange: number;
}

export interface DashboardResult {
  week: PeriodStats;
  month: PeriodStats;
  recentActivities: Activity[];
}
