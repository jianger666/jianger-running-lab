export interface UserProfile {
  id: number;
  nickname: string | null;
  avatarUrl: string | null;
  height: number | null;
  weight: number | null;
  gender: string | null;
  birthday: string | null;
}

export interface UpdateProfileParams {
  height?: number;
  weight?: number;
  gender?: string;
  birthday?: string;
  nickname?: string;
}
