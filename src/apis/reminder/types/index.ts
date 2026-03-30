export interface Reminder {
  id: number;
  content: string;
  time: string;
  enabled: boolean;
  repeat: boolean;
  repeatDays: number[];
  lastSentAt: string | null;
  createdAt: string;
}

export interface CreateReminderParams {
  content: string;
  time: string;
  repeat?: boolean;
  repeatDays?: number[];
}

export interface UpdateReminderParams {
  id: number;
  content?: string;
  time?: string;
  repeat?: boolean;
  repeatDays?: number[];
  enabled?: boolean;
}
