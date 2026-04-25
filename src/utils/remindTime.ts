/** 提醒时间步长（分钟） */
export const REMIND_TIME_STEP = 30;
/** 默认提醒时刻：21:00 */
export const DEFAULT_REMIND_TIME = 21 * 60;

/** 一天中所有可选的提醒时刻字符串数组（步长 30 分钟） */
export const REMIND_TIME_OPTIONS = ((): string[] => {
  const arr: string[] = [];
  for (let m = 0; m < 24 * 60; m += REMIND_TIME_STEP) {
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    arr.push(`${hh}:${mm}`);
  }
  return arr;
})();

/** 把分钟数转换成 HH:mm 字符串，越界回退默认值 */
export const formatRemindTime = ({ minutes }: { minutes: number }): string => {
  if (
    !Number.isFinite(minutes) ||
    minutes < 0 ||
    minutes >= 24 * 60 ||
    minutes % REMIND_TIME_STEP !== 0
  ) {
    return formatRemindTime({ minutes: DEFAULT_REMIND_TIME });
  }
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return `${hh}:${mm}`;
};

/** 根据 picker 索引取分钟数 */
export const remindTimeFromIndex = ({ index }: { index: number }): number => {
  const safe =
    Number.isFinite(index) && index >= 0 && index < REMIND_TIME_OPTIONS.length
      ? index
      : REMIND_TIME_OPTIONS.indexOf(
          formatRemindTime({ minutes: DEFAULT_REMIND_TIME }),
        );
  return safe * REMIND_TIME_STEP;
};

/** 根据分钟数取 picker 索引 */
export const remindTimeToIndex = ({ minutes }: { minutes: number }): number => {
  const formatted = formatRemindTime({ minutes });
  const idx = REMIND_TIME_OPTIONS.indexOf(formatted);
  return idx >= 0
    ? idx
    : REMIND_TIME_OPTIONS.indexOf(
        formatRemindTime({ minutes: DEFAULT_REMIND_TIME }),
      );
};
