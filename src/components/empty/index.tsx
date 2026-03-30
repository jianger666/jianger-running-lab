import { View, Text } from '@tarojs/components';
import { FC } from 'react';
import './index.scss';

interface EmptyProps {
  icon?: string;
  title: string;
  description?: string;
}

const Empty: FC<EmptyProps> = ({ icon = '📭', title, description }) => {
  return (
    <View className="empty">
      <Text className="empty__icon">{icon}</Text>
      <Text className="empty__title">{title}</Text>
      {description && <Text className="empty__desc">{description}</Text>}
    </View>
  );
};

export { Empty };
export type { EmptyProps };
