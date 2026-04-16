import { View, Text } from '@tarojs/components';
import './index.scss';

const Index = () => {
  return (
    <View className="home">
      <View className="coming-soon">
        <Text className="coming-soon__icon">🏃</Text>
        <Text className="coming-soon__title">江耳跑步实验室</Text>
        <Text className="coming-soon__desc">更多功能敬请期待...</Text>
      </View>
    </View>
  );
};

export default Index;
