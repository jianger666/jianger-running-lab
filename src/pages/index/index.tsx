import { View, Text } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import { dashboardApi } from '../../apis/dashboard';
import { DashboardResult, PeriodStats } from '../../apis/dashboard/types';
import { Activity } from '../../apis/activity/types';
import { Card, Empty } from '../../components';
import { STORAGE_KEYS } from '../../constants/storage';
import {
  formatPace,
  formatDistance,
  formatDuration,
  formatDate,
} from '../../utils/format';
import './index.scss';

type TabKey = 'week' | 'month';

const TAB_LABELS: Record<TabKey, string> = {
  week: '本周',
  month: '本月',
};

const Index = () => {
  const [data, setData] = useState<DashboardResult | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('week');
  const [isLoading, setIsLoading] = useState(false);
  const hasWatch = Taro.getStorageSync(STORAGE_KEYS.HAS_WATCH);

  useDidShow(() => {
    if (!hasWatch) return;
    fetchDashboard();
  });

  const fetchDashboard = async () => {
    setIsLoading(true);
    try {
      const result = await dashboardApi.getData();
      setData(result);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    Taro.showLoading({ title: '同步中...' });
    try {
      const { watchApi } = await import('../../apis/watch');
      await watchApi.sync();
      await fetchDashboard();
      Taro.showToast({ title: '同步成功', icon: 'success' });
    } catch {
      Taro.showToast({ title: '同步失败', icon: 'none' });
    } finally {
      Taro.hideLoading();
    }
  };

  const handleActivityTap = ({ id }: { id: string }) => {
    Taro.navigateTo({ url: `/pages/activityDetail/index?id=${id}` });
  };

  const handleViewAll = () => {
    Taro.navigateTo({ url: '/pages/activities/index' });
  };

  if (!hasWatch) {
    return (
      <View className="home">
        <Empty
          icon="⌚"
          title="尚未绑定手表"
          description="前往「我的」绑定手表后，即可查看训练数据"
        />
      </View>
    );
  }

  const stats = data?.[activeTab];

  return (
    <View className="home">
      {/* 统计区域 */}
      <View className="stats-section">
        <View className="stats-tabs">
          {(Object.keys(TAB_LABELS) as TabKey[]).map((key) => (
            <View
              key={key}
              className={`stats-tab ${activeTab === key ? 'stats-tab--active' : ''}`}
              onClick={() => setActiveTab(key)}
            >
              <Text className="stats-tab__text">{TAB_LABELS[key]}</Text>
            </View>
          ))}
          <View className="stats-sync" onClick={handleSync}>
            <Text className="stats-sync__text">同步</Text>
          </View>
        </View>

        {stats && <StatsCard stats={stats} />}
        {isLoading && !data && <StatsCardSkeleton />}
      </View>

      {/* 最近训练 */}
      <View className="recent-section">
        <View className="section-header">
          <Text className="section-header__title">最近训练</Text>
          {data?.recentActivities && data.recentActivities.length > 0 && (
            <Text className="section-header__more" onClick={handleViewAll}>
              查看全部
            </Text>
          )}
        </View>

        {data?.recentActivities?.length === 0 && !isLoading && (
          <Empty
            icon="🏃"
            title="暂无运动记录"
            description="同步数据后查看"
          />
        )}

        {data?.recentActivities?.map((item) => (
          <ActivityCard
            key={item.id}
            activity={item}
            onTap={handleActivityTap}
          />
        ))}
      </View>
    </View>
  );
};

const StatsCard = ({ stats }: { stats: PeriodStats }) => {
  const distanceKm = (stats.runDistance / 1000).toFixed(1);
  const isDistanceUp = stats.distanceChange >= 0;

  return (
    <Card className="stats-card">
      <View className="stats-card__hero">
        <View className="stats-card__hero-left">
          <Text className="stats-card__distance">{distanceKm}</Text>
          <Text className="stats-card__unit">km</Text>
        </View>
        <View className="stats-card__trend">
          <Text
            className={`stats-card__trend-text ${isDistanceUp ? 'stats-card__trend-text--up' : 'stats-card__trend-text--down'}`}
          >
            {isDistanceUp ? '↑' : '↓'}{' '}
            {formatDistance({ meters: Math.abs(stats.distanceChange) })}
          </Text>
          <Text className="stats-card__trend-label">较上期</Text>
        </View>
      </View>
      <View className="stats-card__grid">
        <StatItem label="训练次数" value={`${stats.totalCount}`} suffix="次" />
        <StatItem
          label="总时长"
          value={formatDuration({ seconds: stats.totalDuration })}
        />
        <StatItem
          label="消耗"
          value={`${stats.totalCalorie}`}
          suffix="kcal"
        />
        {stats.avgPace && (
          <StatItem
            label="均配"
            value={formatPace({ pace: stats.avgPace })}
          />
        )}
      </View>
    </Card>
  );
};

const StatItem = ({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) => (
  <View className="stat-item">
    <View className="stat-item__row">
      <Text className="stat-item__value">{value}</Text>
      {suffix && <Text className="stat-item__suffix">{suffix}</Text>}
    </View>
    <Text className="stat-item__label">{label}</Text>
  </View>
);

const StatsCardSkeleton = () => (
  <Card className="stats-card">
    <View className="stats-card__hero">
      <View className="skeleton skeleton--lg" />
    </View>
    <View className="stats-card__grid">
      {[1, 2, 3, 4].map((i) => (
        <View key={i} className="stat-item">
          <View className="skeleton skeleton--sm" />
          <View className="skeleton skeleton--xs" />
        </View>
      ))}
    </View>
  </Card>
);

const ActivityCard = ({
  activity,
  onTap,
}: {
  activity: Activity;
  onTap: ({ id }: { id: string }) => void;
}) => (
  <Card
    className="activity-item"
    onClick={() => onTap({ id: activity.id })}
  >
    <View className="activity-item__header">
      <View className="activity-item__tag">
        <Text className="activity-item__type">
          {activity.modeLabel || '运动'}
        </Text>
      </View>
      <Text className="activity-item__date">
        {formatDate({ dateStr: activity.startTime })}
      </Text>
    </View>
    <View className="activity-item__metrics">
      <MetricItem
        label="距离"
        value={formatDistance({ meters: activity.distance })}
        highlight
      />
      <MetricItem
        label="时长"
        value={formatDuration({ seconds: activity.duration })}
      />
      <MetricItem
        label="配速"
        value={formatPace({ pace: activity.avgPace })}
      />
      {activity.avgHeartRate && (
        <MetricItem
          label="心率"
          value={`${activity.avgHeartRate}`}
          suffix="bpm"
        />
      )}
    </View>
  </Card>
);

const MetricItem = ({
  label,
  value,
  suffix,
  highlight = false,
}: {
  label: string;
  value: string;
  suffix?: string;
  highlight?: boolean;
}) => (
  <View className="metric">
    <View className="metric__row">
      <Text
        className={`metric__value ${highlight ? 'metric__value--highlight' : ''}`}
      >
        {value}
      </Text>
      {suffix && <Text className="metric__suffix">{suffix}</Text>}
    </View>
    <Text className="metric__label">{label}</Text>
  </View>
);

export default Index;
