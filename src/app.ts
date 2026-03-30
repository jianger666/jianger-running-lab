import Taro from '@tarojs/taro';
import { PropsWithChildren, useEffect } from 'react';
import { userApi } from './apis/user';
import { watchApi } from './apis/watch';
import { STORAGE_KEYS } from './constants/storage';
import './app.scss';

const App = ({ children }: PropsWithChildren) => {
  useEffect(() => {
    const init = async () => {
      try {
        const { code } = await Taro.login();
        const user = await userApi.login({ code });

        Taro.setStorageSync(STORAGE_KEYS.TOKEN, user.token);
        Taro.setStorageSync(STORAGE_KEYS.USER_ID, user.userId);
        Taro.setStorageSync(STORAGE_KEYS.HAS_WATCH, user.hasWatch);
        Taro.setStorageSync(STORAGE_KEYS.BOUND_BRANDS, user.boundBrands);
        if (user.lastSyncAt) {
          Taro.setStorageSync(STORAGE_KEYS.LAST_SYNC_AT, user.lastSyncAt);
        }

        if (user.hasWatch) {
          watchApi.sync().catch(() => {});
        }
      } catch (err) {
        console.error('登录失败:', err);
      }
    };
    init();
  }, []);

  return children;
};

export default App;
