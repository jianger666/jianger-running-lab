import { View, Text } from '@tarojs/components';
import { ClockOutlined, NotesOutlined, PhotoOutlined } from '@taroify/icons';
import Taro from '@tarojs/taro';
import type { ReactNode } from 'react';
import { STORAGE_KEYS } from '../../constants/storage';
import './index.scss';

interface ToolItem {
  key: string;
  title: string;
  desc: string;
  path: string;
  icon: ReactNode;
  requireLogin?: boolean;
}

const TOOLS: ToolItem[] = [
  {
    key: 'foodCalorie',
    title: '拍照计热量',
    desc: 'AI 识别食物热量',
    path: '/pages/foodCalorie/index',
    icon: <PhotoOutlined size={24} color="#f3799e" />,
    requireLogin: true,
  },
  {
    key: 'paceTable',
    title: '马拉松配速表',
    desc: '配速 → 完赛成绩',
    path: '/pages/paceTable/index',
    icon: <ClockOutlined size={24} color="#f3799e" />,
  },
  {
    key: 'reminder',
    title: '定时提醒',
    desc: '到点微信提醒',
    path: '/pages/reminder/index',
    icon: <NotesOutlined size={24} color="#f3799e" />,
    requireLogin: true,
  },
];

const Tools = () => {
  const isLoggedIn = !!Taro.getStorageSync(STORAGE_KEYS.TOKEN);

  const handleNavigate = ({
    path,
    requireLogin,
  }: {
    path: string;
    requireLogin?: boolean;
  }) => {
    if (requireLogin && !isLoggedIn) {
      Taro.showToast({ title: '请先登录', icon: 'none' });
      Taro.switchTab({ url: '/pages/profile/index' });
      return;
    }
    Taro.navigateTo({ url: path });
  };

  return (
    <View className="page-tools">
      <View className="tools-grid">
        {TOOLS.map((tool) => (
          <View
            key={tool.key}
            className="tool-card"
            onClick={() =>
              handleNavigate({
                path: tool.path,
                requireLogin: tool.requireLogin,
              })
            }
          >
            <View className="tool-card__icon">{tool.icon}</View>
            <View className="tool-card__text">
              <Text className="tool-card__title">{tool.title}</Text>
              <Text className="tool-card__desc">{tool.desc}</Text>
            </View>
            {tool.requireLogin && !isLoggedIn && (
              <Text className="tool-card__login-tag">需登录</Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

export default Tools;
