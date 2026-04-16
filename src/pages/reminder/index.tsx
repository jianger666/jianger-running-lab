import { View, Text, Input, Picker, Switch } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import { reminderApi } from '../../apis/reminder';
import { Reminder } from '../../apis/reminder/types';
import { Card, Skeleton } from '../../components';
import { useBusyIds } from '../../hooks';
import './index.scss';

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日'];
const TEMPLATE_ID = 'r6Mg96WyISh0jUGySUSC0eJ2W2uR6csoSNMyI8i4rvU';

const HOURS = Array.from({ length: 24 }, (_, i) =>
  i.toString().padStart(2, '0'),
);
const MINUTES = ['00', '20', '40'];
const TIME_RANGE = [HOURS, MINUTES];

const INTERVAL_OPTIONS = [
  { label: '20 分钟', value: 20 },
  { label: '40 分钟', value: 40 },
  { label: '1 小时', value: 60 },
  { label: '1.5 小时', value: 80 },
  { label: '2 小时', value: 120 },
  { label: '3 小时', value: 180 },
  { label: '4 小时', value: 240 },
];

type ReminderMode = 'fixed' | 'interval';

const formatInterval = ({ minutes }: { minutes: number }) => {
  const opt = INTERVAL_OPTIONS.find((o) => o.value === minutes);
  return opt?.label || `${minutes} 分钟`;
};

const ReminderPage = () => {
  const [list, setList] = useState<Reminder[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [content, setContent] = useState('该起来活动了！');
  const [mode, setMode] = useState<ReminderMode>('fixed');
  const [time, setTime] = useState('07:00');
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [repeat, setRepeat] = useState(false);
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const { isBusy, markBusy, unmarkBusy } = useBusyIds();

  useDidShow(() => {
    loadReminders();
  });

  const loadReminders = async () => {
    try {
      const data = await reminderApi.getList();
      setList(data);
    } catch {
      //
    } finally {
      setListLoading(false);
    }
  };

  const handleRequestSubscribe = async (): Promise<boolean> => {
    if (!TEMPLATE_ID) {
      Taro.showToast({ title: '提醒功能即将上线', icon: 'none' });
      return false;
    }

    return new Promise((resolve) => {
      Taro.requestSubscribeMessage({
        tmplIds: [TEMPLATE_ID],
        success: (res) => {
          resolve(res[TEMPLATE_ID] === 'accept');
        },
        fail: () => resolve(false),
      });
    });
  };

  const handleCreate = async () => {
    if (!content.trim()) {
      Taro.showToast({ title: '请输入提醒内容', icon: 'none' });
      return;
    }

    const accepted = await handleRequestSubscribe();
    if (!accepted) {
      Taro.showToast({ title: '需要授权通知才能提醒', icon: 'none' });
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'fixed') {
        await reminderApi.create({
          content: content.trim(),
          mode: 'fixed',
          time,
          repeat,
          repeatDays: repeat ? repeatDays : [],
        });
      } else {
        await reminderApi.create({
          content: content.trim(),
          mode: 'interval',
          intervalMinutes,
          startTime,
          endTime,
          repeatDays: repeatDays.length > 0 ? repeatDays : [],
        });
      }
      setIsAdding(false);
      resetForm();
      await loadReminders();
      Taro.showToast({ title: '提醒已创建', icon: 'success' });
    } catch {
      //
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async ({
    reminder,
    enabled,
  }: {
    reminder: Reminder;
    enabled: boolean;
  }) => {
    if (enabled) {
      const accepted = await handleRequestSubscribe();
      if (!accepted) {
        Taro.showToast({ title: '需要授权通知才能开启', icon: 'none' });
        return;
      }
    }

    markBusy({ id: reminder.id });
    try {
      await reminderApi.update({ id: reminder.id, enabled });
      await loadReminders();
    } catch {
      //
    } finally {
      unmarkBusy({ id: reminder.id });
    }
  };

  const handleDelete = async ({ id }: { id: number }) => {
    const { confirm } = await Taro.showModal({
      title: '确认删除',
      content: '删除后无法恢复',
    });
    if (!confirm) return;

    markBusy({ id });
    try {
      await reminderApi.remove({ id });
      await loadReminders();
    } catch {
      //
    } finally {
      unmarkBusy({ id });
    }
  };

  const toggleDay = ({ day }: { day: number }) => {
    setRepeatDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const resetForm = () => {
    setContent('该起来活动了！');
    setMode('fixed');
    setTime('07:00');
    setIntervalMinutes(60);
    setStartTime('09:00');
    setEndTime('18:00');
    setRepeat(false);
    setRepeatDays([]);
  };

  return (
    <View className="page-reminder">
      <Text className="page-reminder__desc">
        设置定时提醒，到点通过微信通知你
      </Text>

      {listLoading &&
        [1, 2].map((i) => (
          <Card key={i} className="reminder-card">
            <View className="reminder-card__top">
              <Skeleton size="lg" />
            </View>
            <Skeleton size="md" />
          </Card>
        ))}

      {!listLoading &&
        list.map((item) => {
          const busy = isBusy({ id: item.id });
          const isInterval = item.mode === 'interval';
          return (
            <Card
              key={item.id}
              className={`reminder-card ${busy ? 'reminder-card--busy' : ''}`}
            >
              <View className="reminder-card__top">
                <View className="reminder-card__time-wrap">
                  {isInterval ? (
                    <>
                      <Text className="reminder-card__interval">
                        每 {formatInterval({ minutes: item.intervalMinutes || 20 })}
                      </Text>
                      <Text className="reminder-card__days">
                        {item.startTime}
                        {item.endTime ? ` - ${item.endTime}` : ' 起'}
                        {item.repeatDays.length > 0 &&
                          ` · 每周${item.repeatDays.map((d) => WEEK_LABELS[d - 1]).join('、')}`}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text className="reminder-card__time">{item.time}</Text>
                      {item.repeat && item.repeatDays.length > 0 && (
                        <Text className="reminder-card__days">
                          每周
                          {item.repeatDays
                            .map((d) => WEEK_LABELS[d - 1])
                            .join('、')}
                        </Text>
                      )}
                      {!item.repeat && (
                        <Text className="reminder-card__days">单次提醒</Text>
                      )}
                    </>
                  )}
                </View>
                <Switch
                  checked={item.enabled}
                  disabled={busy}
                  color="#f3799e"
                  onChange={(e) =>
                    handleToggle({ reminder: item, enabled: e.detail.value })
                  }
                />
              </View>
              <Text className="reminder-card__content">{item.content}</Text>
              <View
                className="reminder-card__delete"
                onClick={busy ? undefined : () => handleDelete({ id: item.id })}
              >
                <Text className="reminder-card__delete-text">
                  {busy ? '处理中...' : '删除'}
                </Text>
              </View>
            </Card>
          );
        })}

      {!listLoading && list.length === 0 && !isAdding && (
        <View className="empty-hint">
          <Text className="empty-hint__text">还没有提醒，点击下方添加</Text>
        </View>
      )}

      {isAdding && (
        <Card className="add-form">
          {/* 模式切换 */}
          <View className="mode-tabs">
            <View
              className={`mode-tab ${mode === 'fixed' ? 'mode-tab--active' : ''}`}
              onClick={() => setMode('fixed')}
            >
              <Text className="mode-tab__text">固定时间</Text>
            </View>
            <View
              className={`mode-tab ${mode === 'interval' ? 'mode-tab--active' : ''}`}
              onClick={() => setMode('interval')}
            >
              <Text className="mode-tab__text">间隔提醒</Text>
            </View>
          </View>

          <View className="add-form__row">
            <Text className="add-form__label">提醒内容</Text>
            <Input
              className="add-form__input"
              placeholder="例：该喝水了、开会提醒"
              placeholderClass="add-form__placeholder"
              maxlength={20}
              value={content}
              onInput={(e) => setContent(e.detail.value)}
            />
          </View>

          {mode === 'fixed' && (
            <>
              <View className="add-form__row">
                <Text className="add-form__label">提醒时间</Text>
                <Picker
                  mode="multiSelector"
                  range={TIME_RANGE}
                  value={[
                    HOURS.indexOf(time.split(':')[0]),
                    MINUTES.indexOf(time.split(':')[1]),
                  ]}
                  onChange={(e) => {
                    const [hIdx, mIdx] =
                      e.detail.value as unknown as number[];
                    setTime(`${HOURS[hIdx]}:${MINUTES[mIdx]}`);
                  }}
                >
                  <Text className="add-form__time-btn">{time}</Text>
                </Picker>
              </View>

              <View className="add-form__row">
                <Text className="add-form__label">重复</Text>
                <Switch
                  checked={repeat}
                  color="#f3799e"
                  onChange={(e) => setRepeat(e.detail.value)}
                />
              </View>

              {repeat && (
                <View className="add-form__days">
                  {WEEK_LABELS.map((label, idx) => {
                    const day = idx + 1;
                    const isActive = repeatDays.includes(day);
                    return (
                      <View
                        key={day}
                        className={`day-chip ${isActive ? 'day-chip--active' : ''}`}
                        onClick={() => toggleDay({ day })}
                      >
                        <Text className="day-chip__text">{label}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}

          {mode === 'interval' && (
            <>
              <Text className="add-form__tip">
                由于服务调度限制，最小间隔为 20 分钟
              </Text>

              <View className="add-form__row">
                <Text className="add-form__label">间隔时长</Text>
                <Picker
                  mode="selector"
                  range={INTERVAL_OPTIONS.map((o) => o.label)}
                  value={INTERVAL_OPTIONS.findIndex(
                    (o) => o.value === intervalMinutes,
                  )}
                  onChange={(e) => {
                    const idx = e.detail.value as unknown as number;
                    setIntervalMinutes(INTERVAL_OPTIONS[idx].value);
                  }}
                >
                  <Text className="add-form__time-btn">
                    {formatInterval({ minutes: intervalMinutes })}
                  </Text>
                </Picker>
              </View>

              <View className="add-form__row">
                <Text className="add-form__label">开始时间</Text>
                <Picker
                  mode="multiSelector"
                  range={TIME_RANGE}
                  value={[
                    HOURS.indexOf(startTime.split(':')[0]),
                    MINUTES.indexOf(startTime.split(':')[1]),
                  ]}
                  onChange={(e) => {
                    const [hIdx, mIdx] =
                      e.detail.value as unknown as number[];
                    setStartTime(`${HOURS[hIdx]}:${MINUTES[mIdx]}`);
                  }}
                >
                  <Text className="add-form__time-btn">{startTime}</Text>
                </Picker>
              </View>

              <View className="add-form__row">
                <Text className="add-form__label">结束时间</Text>
                <Picker
                  mode="multiSelector"
                  range={TIME_RANGE}
                  value={[
                    HOURS.indexOf(endTime.split(':')[0]),
                    MINUTES.indexOf(endTime.split(':')[1]),
                  ]}
                  onChange={(e) => {
                    const [hIdx, mIdx] =
                      e.detail.value as unknown as number[];
                    setEndTime(`${HOURS[hIdx]}:${MINUTES[mIdx]}`);
                  }}
                >
                  <Text className="add-form__time-btn">{endTime}</Text>
                </Picker>
              </View>

              <View className="add-form__days-section">
                <Text className="add-form__label">重复日（可选）</Text>
                <View className="add-form__days">
                  {WEEK_LABELS.map((label, idx) => {
                    const day = idx + 1;
                    const isActive = repeatDays.includes(day);
                    return (
                      <View
                        key={day}
                        className={`day-chip ${isActive ? 'day-chip--active' : ''}`}
                        onClick={() => toggleDay({ day })}
                      >
                        <Text className="day-chip__text">{label}</Text>
                      </View>
                    );
                  })}
                </View>
                <Text className="add-form__sub-tip">
                  不选则每天都会提醒
                </Text>
              </View>
            </>
          )}

          <View className="add-form__actions">
            <View
              className="add-form__cancel"
              onClick={() => {
                setIsAdding(false);
                resetForm();
              }}
            >
              <Text className="add-form__cancel-text">取消</Text>
            </View>
            <View
              className={`add-form__submit ${isLoading ? 'add-form__submit--loading' : ''}`}
              onClick={isLoading ? undefined : handleCreate}
            >
              <Text className="add-form__submit-text">
                {isLoading ? '创建中...' : '创建提醒'}
              </Text>
            </View>
          </View>
        </Card>
      )}

      {!isAdding && (
        <View className="fab" onClick={() => setIsAdding(true)}>
          <Text className="fab__text">+ 添加提醒</Text>
        </View>
      )}
    </View>
  );
};

export default ReminderPage;
