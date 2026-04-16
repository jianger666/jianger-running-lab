import { View, Text, Input, Picker } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState, useMemo } from 'react';
import { profileApi } from '../../apis/profile';
import { Card, Skeleton } from '../../components';
import './index.scss';

const GENDER_OPTIONS = ['男', '女'];
const GENDER_MAP: Record<string, string> = { 男: 'male', 女: 'female' };
const GENDER_REVERSE: Record<string, string> = { male: '男', female: '女' };

const BMI_LEVELS = [
  { max: 18.5, label: '偏瘦', color: '#4ecdc4' },
  { max: 24, label: '正常', color: '#27ae60' },
  { max: 28, label: '偏胖', color: '#f39c12' },
  { max: Infinity, label: '肥胖', color: '#ef4444' },
] as const;

const getBmiInfo = ({ bmi }: { bmi: number }) =>
  BMI_LEVELS.find((l) => bmi < l.max) ?? BMI_LEVELS[BMI_LEVELS.length - 1];

const ProfileEdit = () => {
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [gender, setGender] = useState('');
  const [birthday, setBirthday] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const bmiData = useMemo(() => {
    const h = Number(height);
    const w = Number(weight);
    if (!h || !w || h < 50 || h > 250 || w < 20 || w > 300) return null;
    const value = Math.round((w / (h / 100) ** 2) * 10) / 10;
    const info = getBmiInfo({ bmi: value });
    return { value, ...info };
  }, [height, weight]);

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

      {bmiData && (
        <Card className="bmi-card">
          <View className="bmi-card__row">
            <Text className="bmi-card__label">你的 BMI</Text>
            <Text
              className="bmi-card__value"
              style={{ color: bmiData.color }}
            >
              {bmiData.value}
            </Text>
            <Text
              className="bmi-card__tag"
              style={{ color: bmiData.color, borderColor: bmiData.color }}
            >
              {bmiData.label}
            </Text>
          </View>
          <View className="bmi-card__scale">
            {BMI_LEVELS.map((level, i) => (
              <View
                key={i}
                className="bmi-card__segment"
                style={{ background: level.color }}
              />
            ))}
            <View
              className="bmi-card__indicator"
              style={{
                left: `${Math.min(Math.max(((bmiData.value - 14) / (34 - 14)) * 100, 2), 98)}%`,
              }}
            />
          </View>
          <View className="bmi-card__labels">
            <Text className="bmi-card__scale-label">偏瘦</Text>
            <Text className="bmi-card__scale-label">正常</Text>
            <Text className="bmi-card__scale-label">偏胖</Text>
            <Text className="bmi-card__scale-label">肥胖</Text>
          </View>
        </Card>
      )}

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
