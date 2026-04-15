import { View, Text, Input, Picker } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import { profileApi } from '../../apis/profile';
import { Card, Skeleton } from '../../components';
import './index.scss';

const GENDER_OPTIONS = ['男', '女'];
const GENDER_MAP: Record<string, string> = { 男: 'male', 女: 'female' };
const GENDER_REVERSE: Record<string, string> = { male: '男', female: '女' };

const ProfileEdit = () => {
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [gender, setGender] = useState('');
  const [birthday, setBirthday] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useDidShow(() => {
    fetchProfile();
  });

  const fetchProfile = async () => {
    try {
      const data = await profileApi.get();
      if (data.height) setHeight(String(data.height));
      if (data.weight) setWeight(String(data.weight));
      if (data.gender) setGender(GENDER_REVERSE[data.gender] || '');
      if (data.birthday) setBirthday(data.birthday.split('T')[0]);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!height || !weight) {
      Taro.showToast({ title: '请填写身高和体重', icon: 'none' });
      return;
    }

    setSaving(true);
    try {
      await profileApi.update({
        height: Number(height),
        weight: Number(weight),
        gender: GENDER_MAP[gender] || undefined,
        birthday: birthday || undefined,
      });
      Taro.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => Taro.navigateBack(), 500);
    } catch {
      //
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="page-profile-edit">
        <Card>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} className="form-row">
              <Skeleton size="sm" width="25%" />
              <Skeleton size="sm" width="50%" />
            </View>
          ))}
        </Card>
      </View>
    );
  }

  return (
    <View className="page-profile-edit">
      <Text className="page-profile-edit__desc">
        填写身体信息，用于精确计算热量消耗
      </Text>

      <Card className="form-card">
        <View className="form-row">
          <Text className="form-row__label">身高 (cm)</Text>
          <Input
            className="form-row__input"
            type="digit"
            placeholder="如 175"
            placeholderClass="form-row__placeholder"
            value={height}
            onInput={(e) => setHeight(e.detail.value)}
          />
        </View>

        <View className="form-row">
          <Text className="form-row__label">体重 (kg)</Text>
          <Input
            className="form-row__input"
            type="digit"
            placeholder="如 70"
            placeholderClass="form-row__placeholder"
            value={weight}
            onInput={(e) => setWeight(e.detail.value)}
          />
        </View>

        <View className="form-row">
          <Text className="form-row__label">性别</Text>
          <Picker
            mode="selector"
            range={GENDER_OPTIONS}
            value={GENDER_OPTIONS.indexOf(gender)}
            onChange={(e) =>
              setGender(GENDER_OPTIONS[e.detail.value as unknown as number])
            }
          >
            <Text
              className={`form-row__picker ${!gender ? 'form-row__placeholder' : ''}`}
            >
              {gender || '请选择'}
            </Text>
          </Picker>
        </View>

        <View className="form-row">
          <Text className="form-row__label">出生日期</Text>
          <Picker
            mode="date"
            start="1950-01-01"
            end={new Date().toISOString().split('T')[0]}
            value={birthday}
            onChange={(e) => setBirthday(e.detail.value)}
          >
            <Text
              className={`form-row__picker ${!birthday ? 'form-row__placeholder' : ''}`}
            >
              {birthday || '请选择'}
            </Text>
          </Picker>
        </View>
      </Card>

      <View className="form-tips">
        <Text className="form-tips__text">
          · 身高体重用于计算 BMR (基础代谢率)
        </Text>
        <Text className="form-tips__text">
          · BMR + 摄入热量 → 需要跑多少公里消耗
        </Text>
      </View>

      <View
        className={`save-btn ${saving ? 'save-btn--loading' : ''}`}
        onClick={saving ? undefined : handleSave}
      >
        <Text className="save-btn__text">
          {saving ? '保存中...' : '保存'}
        </Text>
      </View>
    </View>
  );
};

export default ProfileEdit;
