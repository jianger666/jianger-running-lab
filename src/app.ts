import Taro from '@tarojs/taro';
import { createElement, Fragment, PropsWithChildren, useEffect, useState, useCallback } from 'react';
import { userApi } from './apis/user';
import { STORAGE_KEYS } from './constants/storage';
import NetworkError from './components/network-error';
import './app.scss';

const App = ({ children }: PropsWithChildren) => {
  const [loginFailed, setLoginFailed] = useState(false);

  const doLogin = useCallback(async () => {
    try {
      const { code } = await Taro.login();
      const user = await userApi.login({ code });

      Taro.setStorageSync(STORAGE_KEYS.TOKEN, user.token);
      Taro.setStorageSync(STORAGE_KEYS.USER_ID, user.userId);
      if (user.nickname) Taro.setStorageSync('nickname', user.nickname);

      setLoginFailed(false);
    } catch (err) {
      console.error('登录失败:', err);
      setLoginFailed(true);
    }
  }, []);

  useEffect(() => {
    doLogin();
  }, [doLogin]);

  return createElement(
    Fragment,
    null,
    children,
    loginFailed ? createElement(NetworkError, { onRetry: doLogin }) : null,
  );
};

export default App;
