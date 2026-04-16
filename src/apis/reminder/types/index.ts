export interface Reminder {
  id: number;
  content: string;
  mode: 'fixed' | 'interval';
  time: string;
  intervalMinutes: number | null;
  startTime: string | null;
  endTime: string | null;
  enabled: boolean;
  repeat: boolean;
  repeatDays: number[];
  lastSentAt: string | null;
  createdAt: string;
}

export interface CreateReminderParams {
  content: string;
  mode?: 'fixed' | 'interval';
  time?: string;
  intervalMinutes?: number;
  startTime?: string;
  endTime?: string;
  repeat?: boolean;
  repeatDays?: number[];
}

export interface UpdateReminderParams {
  id: number;
  enabled?: boolean;
}
