import { View, Text } from '@tarojs/components'
import './index.scss'

const Index = () => {
  return (
    <View className="index">
      <View className="hero">
        <Text className="hero__title">江耳跑步实验室</Text>
        <Text className="hero__subtitle">跑者智能体能分析</Text>
      </View>
      <View className="features">
        <View className="feature-card">
          <Text className="feature-card__icon">⌚</Text>
          <Text className="feature-card__title">手表数据同步</Text>
          <Text className="feature-card__desc">连接你的运动手表，自动同步训练数据</Text>
        </View>
        <View className="feature-card">
          <Text className="feature-card__icon">📊</Text>
          <Text className="feature-card__title">体能分析</Text>
          <Text className="feature-card__desc">HRV、训练负荷、体能恢复等全面指标</Text>
        </View>
        <View className="feature-card">
          <Text className="feature-card__icon">🤖</Text>
          <Text className="feature-card__title">AI 训练建议</Text>
          <Text className="feature-card__desc">基于数据的智能课表推荐</Text>
        </View>
      </View>
    </View>
  )
}

export default Index
