import { View, Text, Image } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { useState } from 'react';
import { activityApi } from '../../apis/activity';
import { Activity } from '../../apis/activity/types';
import { Card } from '../../components';
import { formatPace, formatDistance, formatDuration, formatDate } from '../../utils/format';
import './index.scss';

const ActivityDetail = () => {
  const [activity, setActivity] = useState<Activity | null>(null);

  useLoad(({ id }) => {
    if (!id) return;
    activityApi.getDetail({ id }).then(setActivity);
  });

  if (!activity) {
    return (
      <View className="page-detail">
        <Text className="loading-text">加载中...</Text>
      </View>
    );
  }

  const metrics = [
    { label: '平均配速', value: formatPace({ pace: activity.avgPace }) },
    { label: '最佳配速', value: formatPace({ pace: activity.bestPace }) },
    { label: '平均心率', value: activity.avgHeartRate ? `${activity.avgHeartRate}` : '--', unit: 'bpm' },
    { label: '最大心率', value: activity.maxHeartRate ? `${activity.maxHeartRate}` : '--', unit: 'bpm' },
    { label: '卡路里', value: `${(activity.calorie / 1000).toFixed(0)}`, unit: 'kcal' },
    { label: '步频', value: activity.avgCadence ? `${activity.avgCadence}` : '--', unit: 'spm' },
    { label: '功率', value: activity.avgPower ? `${activity.avgPower}` : '--', unit: 'W' },
    { label: '步数', value: activity.step ? `${activity.step}` : '--' },
    { label: '累计爬升', value: activity.ascent ? `${activity.ascent}` : '--', unit: 'm' },
    { label: '累计下降', value: activity.descent ? `${activity.descent}` : '--', unit: 'm' },
    { label: '训练负荷', value: activity.trainingLoad ? `${activity.trainingLoad}` : '--' },
  ];

  return (
    <View className="page-detail">
      {activity.imageUrl && (
        <Image className="route-map" src={activity.imageUrl} mode="aspectFill" />
      )}

      <View className="detail-header">
        <View className="detail-header__tag">
          <Text className="detail-header__type">{activity.modeLabel || '运动'}</Text>
        </View>
        {activity.name && <Text className="detail-header__name">{activity.name}</Text>}
        <Text className="detail-header__date">{formatDate({ dateStr: activity.startTime })}</Text>
      </View>

      <Card className="highlight-card">
        <View className="highlight-row">
          <View className="highlight">
            <Text className="highlight__value highlight__value--primary">
              {formatDistance({ meters: activity.distance })}
            </Text>
            <Text className="highlight__label">距离</Text>
          </View>
          <View className="highlight__divider" />
          <View className="highlight">
            <Text className="highlight__value">{formatDuration({ seconds: activity.duration })}</Text>
            <Text className="highlight__label">时长</Text>
          </View>
          <View className="highlight__divider" />
          <View className="highlight">
            <Text className="highlight__value">{formatPace({ pace: activity.avgPace })}</Text>
            <Text className="highlight__label">配速</Text>
          </View>
        </View>
      </Card>

      <View className="metrics-grid">
        {metrics.map((m) => (
          <Card key={m.label} className="metric-card">
            <View className="metric-card__row">
              <Text className="metric-card__value">{m.value}</Text>
              {m.unit && <Text className="metric-card__unit">{m.unit}</Text>}
            </View>
            <Text className="metric-card__label">{m.label}</Text>
          </Card>
        ))}
      </View>

      {activity.device && (
        <Text className="device-text">设备: {activity.device}</Text>
      )}
    </View>
  );
};

export default ActivityDetail;
