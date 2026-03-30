export interface Activity {
  id: string;
  labelId: string;
  sportType: number;
  modeLabel: string | null;
  name: string | null;
  startTime: string;
  endTime: string;
  distance: number;
  duration: number;
  calorie: number;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  avgPace: number | null;
  bestPace: number | null;
  avgCadence: number | null;
  avgPower: number | null;
  avgSpeed: number | null;
  step: number | null;
  ascent: number | null;
  descent: number | null;
  trainingLoad: number | null;
  device: string | null;
  imageUrl: string | null;
}

export interface ActivityListResult {
  list: Activity[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
