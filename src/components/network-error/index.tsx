import { View, Text } from '@tarojs/components';
import { useState } from 'react';
import './index.scss';

const NetworkError = ({
  onRetry,
}: {
  onRetry: () => Promise<void>;
}) => {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    await onRetry();
    setRetrying(false);
  };

  return (
    <View className="network-error">
      <Text className="network-error__icon">!</Text>
      <Text className="network-error__title">网络连接失败</Text>
      <Text className="network-error__desc">请检查网络后重试</Text>
      <View
        className={`network-error__btn ${retrying ? 'network-error__btn--loading' : ''}`}
        onClick={retrying ? undefined : handleRetry}
      >
        <Text className="network-error__btn-text">
          {retrying ? '重试中...' : '点击重试'}
        </Text>
      </View>
    </View>
  );
};

export default NetworkError;
