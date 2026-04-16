import { View, Text, Image, Button, Input } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState, useMemo } from 'react';
import { Arrow, UserOutlined } from '@taroify/icons';
import { profileApi } from '../../apis/profile';
import './index.scss';

const Profile = () => {
  const [nickname, setNickname] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const version = useMemo(() => {
    try {
      const info = Taro.getAccountInfoSync();
      return info.miniProgram.version || '开发版';
    } catch {
      return '开发版';
    }
  }, []);
  useDidShow(() => {
    setNickname(Taro.getStorageSync('nickname') || '');
    setAvatarUrl(Taro.getStorageSync('avatarUrl') || '');
  });

  const handleChooseAvatar = (e) => {
    const url = e.detail.avatarUrl;
    if (url) {
      setAvatarUrl(url);
      Taro.setStorageSync('avatarUrl', url);
    }
  };

  const handleNicknameConfirm = async (e) => {
    const val = e.detail.value?.trim();
    if (val && val !== nickname) {
      setNickname(val);
      Taro.setStorageSync('nickname', val);
      try {
        await profileApi.update({ nickname: val });
      } catch {
        // 本地已保存，后端失败不阻塞
      }
      Taro.showToast({ title: '昵称已更新', icon: 'success' });
    }
  };

  return (
    <View className="profile">
      <View className="profile-header">
        <Button
          className="profile-header__avatar-btn"
          openType="chooseAvatar"
          onChooseAvatar={handleChooseAvatar}
        >
          {avatarUrl ? (
            <Image className="profile-header__avatar" src={avatarUrl} />
          ) : (
            <View className="profile-header__avatar-placeholder">
              <Text className="profile-header__avatar-letter">R</Text>
            </View>
          )}
        </Button>
        <View className="profile-header__info">
          <Input
            className="profile-header__name-input"
            type="nickname"
            placeholder="点击设置昵称"
            value={nickname}
            onConfirm={handleNicknameConfirm}
            onBlur={handleNicknameConfirm}
          />
          <Text className="profile-header__sub">Running Lab Stats</Text>
        </View>
      </View>

      <View className="menu-group">
        <View
          className="menu-item"
          onClick={() =>
            Taro.navigateTo({ url: '/pages/profileEdit/index' })
          }
        >
          <UserOutlined size={20} color="#f3799e" />
          <Text className="menu-item__text">身体信息</Text>
          <Arrow size={16} color="#666" />
        </View>
      </View>

      <Text className="version">Running Lab Stats v{version}</Text>
    </View>
  );
};

export default Profile;
