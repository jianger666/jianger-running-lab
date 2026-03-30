import { View, Text } from '@tarojs/components';
import Taro, { useDidShow, useReachBottom } from '@tarojs/taro';
import { useState, useCallback } from 'react';
import { activityApi } from '../../apis/activity';
import { Activity } from '../../apis/activity/types';
import { Card, Empty } from '../../components';
import { formatPace, formatDistance, formatDuration, formatDate } from '../../utils/format';
import './index.scss';

const Activities = () => {
  const [list, setList] = useState<Activity[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = useCallback(
    async ({ pageNum, reset = false }: { pageNum: number; reset?: boolean }) => {
      if (isLoading) return;

      setIsLoading(true);
      try {
        const result = await activityApi.getList({ page: pageNum });
        setList((prev) => (reset ? result.list : [...prev, ...result.list]));
        setPage(pageNum);
        setHasMore(pageNum < result.totalPages);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading],
  );

  useDidShow(() => {
    loadData({ pageNum: 1, reset: true });
  });

  useReachBottom(() => {
    if (hasMore) {
      loadData({ pageNum: page + 1 });
    }
  });

  const handleDetail = ({ id }: { id: string }) => {
    Taro.navigateTo({ url: `/pages/activityDetail/index?id=${id}` });
  };

  return (
    <View className="page-activities">
      {list.length === 0 && !isLoading && (
        <Empty icon="🏃" title="暂无运动记录" description="绑定手表并同步数据后查看" />
      )}

      {list.map((item) => (
        <Card key={item.id} className="activity-card" onClick={() => handleDetail({ id: item.id })}>
          <View className="activity-card__header">
            <View className="activity-card__tag">
              <Text className="activity-card__type">{item.modeLabel || '运动'}</Text>
            </View>
            <Text className="activity-card__date">{formatDate({ dateStr: item.startTime })}</Text>
          </View>
          <View className="activity-card__metrics">
            <MetricItem label="距离" value={formatDistance({ meters: item.distance })} highlight />
            <MetricItem label="时长" value={formatDuration({ seconds: item.duration })} />
            <MetricItem label="配速" value={formatPace({ pace: item.avgPace })} />
            {item.avgHeartRate && (
              <MetricItem label="心率" value={`${item.avgHeartRate}`} suffix="bpm" />
            )}
          </View>
        </Card>
      ))}

      {isLoading && (
        <View className="loading-more">
          <Text className="loading-more__text">加载中...</Text>
        </View>
      )}
    </View>
  );
};

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
      <Text className={`metric__value ${highlight ? 'metric__value--highlight' : ''}`}>{value}</Text>
      {suffix && <Text className="metric__suffix">{suffix}</Text>}
    </View>
    <Text className="metric__label">{label}</Text>
  </View>
);

export default Activities;
