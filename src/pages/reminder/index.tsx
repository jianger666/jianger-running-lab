import { View, Text, Input, Picker, Switch } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import { reminderApi } from '../../apis/reminder';
import { Reminder } from '../../apis/reminder/types';
import { Card } from '../../components';
import './index.scss';

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日'];
const TEMPLATE_ID = ''; // 待填入微信后台申请的模板 ID

const ReminderPage = () => {
  const [list, setList] = useState<Reminder[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [content, setContent] = useState('该去跑步了！');
  const [time, setTime] = useState('07:00');
  const [repeat, setRepeat] = useState(false);
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useDidShow(() => {
    loadReminders();
  });

  const loadReminders = async () => {
    try {
      const data = await reminderApi.getList();
      setList(data);
    } catch {
      // request 层已 toast
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
      Taro.showToast({
        title: '需要授权通知才能提醒',
        icon: 'none',
      });
      return;
    }

    setIsLoading(true);
    try {
      await reminderApi.create({
        content: content.trim(),
        time,
        repeat,
        repeatDays: repeat ? repeatDays : [],
      });
      setIsAdding(false);
      resetForm();
      await loadReminders();
      Taro.showToast({ title: '提醒已创建', icon: 'success' });
    } catch {
      // request 层已 toast
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
        Taro.showToast({
          title: '需要授权通知才能开启',
          icon: 'none',
        });
        return;
      }
    }

    try {
      await reminderApi.update({ id: reminder.id, enabled });
      await loadReminders();
    } catch {
      // request 层已 toast
    }
  };

  const handleDelete = async ({ id }: { id: number }) => {
    const { confirm } = await Taro.showModal({
      title: '确认删除',
      content: '删除后无法恢复',
    });
    if (!confirm) return;

    try {
      await reminderApi.remove({ id });
      await loadReminders();
    } catch {
      // request 层已 toast
    }
  };

  const toggleDay = ({ day }: { day: number }) => {
    setRepeatDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const resetForm = () => {
    setContent('该去跑步了！');
    setTime('07:00');
    setRepeat(false);
    setRepeatDays([]);
  };

  return (
    <View className="page-reminder">
      <Text className="page-reminder__desc">
        设置定时提醒，到点会通过微信服务通知提醒你
      </Text>

      {/* 提醒列表 */}
      {list.map((item) => (
        <Card key={item.id} className="reminder-card">
          <View className="reminder-card__top">
            <View className="reminder-card__time-wrap">
              <Text className="reminder-card__time">{item.time}</Text>
              {item.repeat && item.repeatDays.length > 0 && (
                <Text className="reminder-card__days">
                  每周{item.repeatDays.map((d) => WEEK_LABELS[d - 1]).join('、')}
                </Text>
              )}
              {!item.repeat && (
                <Text className="reminder-card__days">单次提醒</Text>
              )}
            </View>
            <Switch
              checked={item.enabled}
              color="#f3799e"
              onChange={(e) =>
                handleToggle({
                  reminder: item,
                  enabled: e.detail.value,
                })
              }
            />
          </View>
          <Text className="reminder-card__content">{item.content}</Text>
          <View
            className="reminder-card__delete"
            onClick={() => handleDelete({ id: item.id })}
          >
            <Text className="reminder-card__delete-text">删除</Text>
          </View>
        </Card>
      ))}

      {list.length === 0 && !isAdding && (
        <View className="empty-hint">
          <Text className="empty-hint__text">还没有提醒，点击下方添加</Text>
        </View>
      )}

      {/* 新建表单 */}
      {isAdding && (
        <Card className="add-form">
          <View className="add-form__row">
            <Text className="add-form__label">提醒内容</Text>
            <Input
              className="add-form__input"
              placeholder="例：该去跑步了"
              placeholderClass="add-form__placeholder"
              maxlength={20}
              value={content}
              onInput={(e) => setContent(e.detail.value)}
            />
          </View>

          <View className="add-form__row">
            <Text className="add-form__label">提醒时间</Text>
            <Picker mode="time" value={time} onChange={(e) => setTime(e.detail.value)}>
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

      {/* 添加按钮 */}
      {!isAdding && (
        <View className="fab" onClick={() => setIsAdding(true)}>
          <Text className="fab__text">+ 添加提醒</Text>
        </View>
      )}
    </View>
  );
};

export default ReminderPage;
