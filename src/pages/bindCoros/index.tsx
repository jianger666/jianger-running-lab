import { View, Text, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import { ClockOutlined } from '@taroify/icons';
import { watchApi } from '../../apis/watch';
import { STORAGE_KEYS } from '../../constants/storage';
import './index.scss';

const BindCoros = () => {
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleBind = async () => {
    if (!account || !password) {
      Taro.showToast({ title: '请填写账号和密码', icon: 'none' });
      return;
    }

    setIsLoading(true);
    try {
      await watchApi.bind({ brand: 'coros', account, password });
      Taro.setStorageSync(STORAGE_KEYS.HAS_WATCH, true);

      const result = await watchApi.sync();
      Taro.showToast({
        title: `绑定成功，同步 ${result.syncCount} 条`,
        icon: 'success',
      });
      Taro.setStorageSync(
        STORAGE_KEYS.LAST_SYNC_AT,
        new Date().toISOString(),
      );

      setTimeout(() => Taro.navigateBack(), 1500);
    } catch {
      // request 层已 toast
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="page-bind">
      <View className="bind-header">
        <View className="bind-header__icon-wrap">
          <ClockOutlined size={40} color="#f3799e" />
        </View>
        <Text className="bind-header__title">绑定运动手表</Text>
        <Text className="bind-header__desc">
          当前支持 COROS，更多品牌即将接入
        </Text>
      </View>

      <View className="form-card">
        <View className="form-item">
          <Text className="form-item__label">邮箱 / 手机号</Text>
          <Input
            className="form-item__input"
            placeholder="请输入账号"
            placeholderClass="form-item__placeholder"
            value={account}
            onInput={(e) => setAccount(e.detail.value)}
          />
        </View>
        <View className="form-item form-item--last">
          <Text className="form-item__label">密码</Text>
          <Input
            className="form-item__input"
            password
            placeholder="请输入密码"
            placeholderClass="form-item__placeholder"
            value={password}
            onInput={(e) => setPassword(e.detail.value)}
          />
        </View>
      </View>

      <View
        className={`submit-btn ${isLoading ? 'submit-btn--loading' : ''}`}
        onClick={isLoading ? undefined : handleBind}
      >
        <Text className="submit-btn__text">
          {isLoading ? '绑定中...' : '绑定并同步'}
        </Text>
      </View>

      <Text className="tip">你的账号密码将加密存储，仅用于同步运动数据</Text>
    </View>
  );
};

export default BindCoros;
