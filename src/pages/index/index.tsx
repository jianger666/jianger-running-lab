import { View, Text, Image } from '@tarojs/components';
import logo from '../../assets/logo.png';
import './index.scss';

const Index = () => {
  return (
    <View className="home">
      <View className="coming-soon">
        <Image className="coming-soon__logo" src={logo} mode="aspectFit" />
        <Text className="coming-soon__desc">敬请期待</Text>
      </View>
    </View>
  );
};

export default Index;
