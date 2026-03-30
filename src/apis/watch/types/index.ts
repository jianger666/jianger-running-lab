export type WatchBrand = 'coros' | 'garmin' | 'huawei';

export interface BindWatchParams {
  brand: WatchBrand;
  account: string;
  password: string;
}

export interface SyncResult {
  syncCount: number;
}
