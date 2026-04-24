import { View, Text } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import { BODY_PART_MAP } from './data/body-parts';
import './index.scss';

const STORAGE_KEY = 'painCheck.lastSelected';

const PainCheck = () => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useDidShow(() => {
    const stored = Taro.getStorageSync(STORAGE_KEY);
    if (Array.isArray(stored)) {
      setSelectedIds(stored as string[]);
    }
  });

  const handleOpenSelector = () => {
    Taro.navigateTo({ url: '/pages/painCheck/selector/index' });
  };

  const handleRemove = ({ id }: { id: string }) => {
    const next = selectedIds.filter((i) => i !== id);
    setSelectedIds(next);
    Taro.setStorageSync(STORAGE_KEY, next);
  };

  const handleClear = () => {
    setSelectedIds([]);
    Taro.setStorageSync(STORAGE_KEY, []);
  };

  const handleAnalyze = () => {
    if (selectedIds.length === 0) {
      Taro.showToast({ title: '请先选择疼痛部位', icon: 'none' });
      return;
    }
    Taro.showToast({ title: 'AI 分析开发中', icon: 'none' });
  };

  return (
    <View className="page-pain">
      <View className="pain-header">
        <Text className="pain-header__title">跑步伤痛自查</Text>
        <Text className="pain-header__desc">
          选择疼痛部位，AI 帮你分析可能的跑步损伤
        </Text>
      </View>

      <View className="pain-selector-entry" onClick={handleOpenSelector}>
        <View className="pain-selector-entry__icon">3D</View>
        <View className="pain-selector-entry__body">
          <Text className="pain-selector-entry__title">
            {selectedIds.length > 0 ? '重新选择疼痛部位' : '选择疼痛部位'}
          </Text>
          <Text className="pain-selector-entry__desc">
            可旋转、缩放、点选人体 3D 模型
          </Text>
        </View>
        <Text className="pain-selector-entry__arrow">›</Text>
      </View>

      <View className="pain-selected">
        <View className="pain-selected__row">
          <Text className="pain-selected__label">
            已选 {selectedIds.length} 处
          </Text>
          {selectedIds.length > 0 && (
            <Text className="pain-selected__clear" onClick={handleClear}>
              清空
            </Text>
          )}
        </View>
        {selectedIds.length === 0 && (
          <Text className="pain-selected__empty">
            还没有选择，点击上方进入 3D 选择器
          </Text>
        )}
        {selectedIds.length > 0 && (
          <View className="pain-chips">
            {selectedIds.map((id) => (
              <View
                key={id}
                className="pain-chip"
                onClick={() => handleRemove({ id })}
              >
                <Text className="pain-chip__text">
                  {BODY_PART_MAP[id]?.name ?? id}
                </Text>
                <Text className="pain-chip__close">×</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View className="pain-submit">
        <View
          className={`pain-submit__btn ${
            selectedIds.length === 0 ? 'pain-submit__btn--disabled' : ''
          }`}
          onClick={handleAnalyze}
        >
          <Text className="pain-submit__text">开始 AI 分析</Text>
        </View>
        <Text className="pain-submit__tips">
          *AI 分析结果仅供参考，不能替代医学诊断
        </Text>
      </View>

      <View className="pain-footer">
        <Text className="pain-footer__text">
          3D 人体模型：Three.js + 自建几何（内测版）
        </Text>
      </View>
    </View>
  );
};

export default PainCheck;
