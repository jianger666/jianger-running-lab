import { View, Text } from '@tarojs/components';
import { ClockOutlined, NotesOutlined } from '@taroify/icons';
import Taro from '@tarojs/taro';
import type { ReactNode } from 'react';
import './index.scss';

interface ToolItem {
  key: string;
  title: string;
  desc: string;
  path: string;
  icon: ReactNode;
}

const TOOLS: ToolItem[] = [
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
    desc: '到点提醒你去运动',
    path: '/pages/reminder/index',
    icon: <NotesOutlined size={24} color="#f3799e" />,
  },
];

const Tools = () => {
  const handleNavigate = ({ path }: { path: string }) => {
    Taro.navigateTo({ url: path });
  };

  return (
    <View className="page-tools">
      <View className="tools-grid">
        {TOOLS.map((tool) => (
          <View
            key={tool.key}
            className="tool-card"
            onClick={() => handleNavigate({ path: tool.path })}
          >
            <View className="tool-card__icon">{tool.icon}</View>
            <View className="tool-card__text">
              <Text className="tool-card__title">{tool.title}</Text>
              <Text className="tool-card__desc">{tool.desc}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

export default Tools;
