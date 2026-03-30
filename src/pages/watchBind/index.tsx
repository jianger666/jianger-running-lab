import { View, Text, Input, Image } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import { watchApi } from '../../apis/watch';
import { WatchBrand } from '../../apis/watch/types';
import { STORAGE_KEYS } from '../../constants/storage';
import corosLogo from '../../assets/watch/coros.png';
import garminLogo from '../../assets/watch/garmin.png';
import huaweiLogo from '../../assets/watch/huawei.png';
import './index.scss';

interface BrandConfig {
  key: WatchBrand;
  name: string;
  logo: string;
  isComing: boolean;
}

const BRANDS: BrandConfig[] = [
  { key: 'coros', name: 'COROS 高驰', logo: corosLogo, isComing: false },
  { key: 'garmin', name: 'Garmin 佳明', logo: garminLogo, isComing: true },
  { key: 'huawei', name: 'HUAWEI 华为', logo: huaweiLogo, isComing: true },
];

const WatchBind = () => {
  const [boundBrands, setBoundBrands] = useState<string[]>([]);
  const [activeBrand, setActiveBrand] = useState<WatchBrand | null>(null);
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useDidShow(() => {
    const stored = Taro.getStorageSync(STORAGE_KEYS.BOUND_BRANDS);
    if (stored) setBoundBrands(stored);
  });

  const handleTapBrand = ({ brand }: { brand: BrandConfig }) => {
    if (brand.isComing) return;

    if (boundBrands.includes(brand.key)) {
      Taro.showToast({ title: '已绑定', icon: 'none' });
      return;
    }

    if (activeBrand === brand.key) {
      setActiveBrand(null);
      return;
    }

    setActiveBrand(brand.key);
    setAccount('');
    setPassword('');
  };

  const handleBind = async () => {
    if (!account || !password || !activeBrand) {
      Taro.showToast({ title: '请填写账号和密码', icon: 'none' });
      return;
    }

    setIsLoading(true);
    try {
      await watchApi.bind({ brand: activeBrand, account, password });

      const newBrands = [...boundBrands, activeBrand];
      setBoundBrands(newBrands);
      Taro.setStorageSync(STORAGE_KEYS.BOUND_BRANDS, newBrands);
      Taro.setStorageSync(STORAGE_KEYS.HAS_WATCH, true);

      await watchApi.sync();
      Taro.setStorageSync(
        STORAGE_KEYS.LAST_SYNC_AT,
        new Date().toISOString(),
      );

      setActiveBrand(null);
      Taro.showToast({ title: '绑定成功', icon: 'success' });
    } catch {
      // request 层已 toast
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="page-watch">
      <Text className="page-watch__title">手表管理</Text>
      <Text className="page-watch__desc">
        绑定你的运动手表，自动同步训练数据
      </Text>

      <View className="brand-list">
        {BRANDS.map((brand) => {
          const isBound = boundBrands.includes(brand.key);
          const isActive = activeBrand === brand.key;

          return (
            <View key={brand.key}>
              <View
                className={`brand-card ${isActive ? 'brand-card--active' : ''} ${brand.isComing ? 'brand-card--disabled' : ''}`}
                onClick={() => handleTapBrand({ brand })}
              >
                <Image
                  className="brand-card__logo"
                  src={brand.logo}
                  mode="aspectFit"
                />
                <View className="brand-card__info">
                  <Text className="brand-card__name">{brand.name}</Text>
                  {brand.isComing && (
                    <Text className="brand-card__badge brand-card__badge--coming">
                      即将支持
                    </Text>
                  )}
                  {isBound && (
                    <Text className="brand-card__badge brand-card__badge--bound">
                      已绑定
                    </Text>
                  )}
                </View>
              </View>

              {isActive && (
                <View className="bind-form">
                  <View className="bind-form__item">
                    <Text className="bind-form__label">邮箱 / 手机号</Text>
                    <Input
                      className="bind-form__input"
                      placeholder="请输入账号"
                      placeholderClass="bind-form__placeholder"
                      value={account}
                      onInput={(e) => setAccount(e.detail.value)}
                    />
                  </View>
                  <View className="bind-form__item">
                    <Text className="bind-form__label">密码</Text>
                    <Input
                      className="bind-form__input"
                      password
                      placeholder="请输入密码"
                      placeholderClass="bind-form__placeholder"
                      value={password}
                      onInput={(e) => setPassword(e.detail.value)}
                    />
                  </View>
                  <View
                    className={`bind-form__btn ${isLoading ? 'bind-form__btn--loading' : ''}`}
                    onClick={isLoading ? undefined : handleBind}
                  >
                    <Text className="bind-form__btn-text">
                      {isLoading ? '绑定中...' : '绑定并同步'}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>

      <Text className="page-watch__tip">
        你的账号密码将加密存储，仅用于同步运动数据
      </Text>
    </View>
  );
};

export default WatchBind;
