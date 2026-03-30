export interface LoginResult {
  token: string;
  userId: number;
  openid: string;
  nickname: string | null;
  avatarUrl: string | null;
  boundBrands: string[];
  hasWatch: boolean;
  lastSyncAt: string | null;
}
