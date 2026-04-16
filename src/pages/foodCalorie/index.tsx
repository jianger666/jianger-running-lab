import { View, Text, Input, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState, useCallback } from 'react';
import { PhotoOutlined, FireOutlined, UserOutlined } from '@taroify/icons';
import { foodApi } from '../../apis/food';
import { DailySummary, FoodItem, ExerciseEquivalent } from '../../apis/food/types';
import { Card, Skeleton } from '../../components';
import { useBusyIds } from '../../hooks';
import './index.scss';

const MEAL_LABELS: Record<string, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐',
};

const MEAL_COLORS: Record<string, string> = {
  breakfast: '#ffa726',
  lunch: '#f3799e',
  dinner: '#7c4dff',
  snack: '#4ecdc4',
};

const FoodCalorie = () => {
  const [daily, setDaily] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [recognizing, setRecognizing] = useState(false);
  const [recognized, setRecognized] = useState<FoodItem[] | null>(null);
  const [originalRecognized, setOriginalRecognized] = useState<
    FoodItem[] | null
  >(null);
  const [mealType, setMealType] = useState('lunch');
  const { isBusy, markBusy, unmarkBusy } = useBusyIds();

  const clearRecognition = useCallback(() => {
    setRecognized(null);
    setOriginalRecognized(null);
  }, []);

  const handleWeightChange = useCallback(
    ({ index, newWeight }: { index: number; newWeight: number }) => {
      if (!originalRecognized) return;
      const orig = originalRecognized[index];
      if (!orig || orig.weight <= 0) return;
      const ratio = newWeight / orig.weight;
      setRecognized((prev) =>
        prev
          ? prev.map((f, i) =>
              i === index
                ? {
                    ...f,
                    weight: newWeight,
                    calorie: Math.round(orig.calorie * ratio),
                    protein: Math.round(orig.protein * ratio * 10) / 10,
                    fat: Math.round(orig.fat * ratio * 10) / 10,
                    carbs: Math.round(orig.carbs * ratio * 10) / 10,
                  }
                : f,
            )
          : prev,
      );
    },
    [originalRecognized],
  );

  useDidShow(() => {
    fetchDaily();
  });

  const fetchDaily = async () => {
    try {
      const data = await foodApi.getDaily();
      setDaily(data);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  const readFileAsBase64 = ({ filePath }: { filePath: string }) =>
    new Promise<string>((resolve, reject) => {
      Taro.getFileSystemManager().readFile({
        filePath,
        encoding: 'base64',
        success: (res) => resolve(res.data as string),
        fail: reject,
      });
    });

  const handleTakePhoto = async () => {
    let filePath: string;

    try {
      const res = await Taro.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['camera', 'album'],
        sizeType: ['compressed'],
      });
      filePath = res.tempFiles[0].tempFilePath;
    } catch {
      return;
    }

    setRecognizing(true);

    try {
      let finalPath = filePath;
      try {
        const compressed = await Taro.compressImage({
          src: filePath,
          quality: 60,
        });
        finalPath = compressed.tempFilePath;
      } catch {
        // 压缩失败用原图
      }

      const base64 = await readFileAsBase64({ filePath: finalPath });
      const result = await foodApi.recognize({ image: base64 });

      if (result.foods.length === 0) {
        Taro.showToast({ title: '未识别到食物', icon: 'none' });
        return;
      }

      setOriginalRecognized(result.foods.map((f) => ({ ...f })));
      setRecognized(result.foods);
      guessMealType();
    } catch (err) {
      console.error('[foodCalorie] recognize error:', err);
      const msg =
        err instanceof Error ? err.message : '识别失败，请重试';
      Taro.showToast({ title: msg, icon: 'none' });
    } finally {
      setRecognizing(false);
    }
  };

  const guessMealType = () => {
    const hour = new Date().getHours();
    if (hour < 10) setMealType('breakfast');
    else if (hour < 14) setMealType('lunch');
    else if (hour < 20) setMealType('dinner');
    else setMealType('snack');
  };

  const handleSave = async () => {
    if (!recognized?.length) return;

    setRecognizing(true);
    try {
      await foodApi.save({
        foods: recognized.map((f) => ({
          name: f.name,
          calorie: f.calorie,
          protein: f.protein,
          fat: f.fat,
          carbs: f.carbs,
          weight: f.weight,
        })),
        mealType,
      });
      clearRecognition();
      Taro.showToast({ title: '已记录', icon: 'success' });
      await fetchDaily();
    } catch {
      //
    } finally {
      setRecognizing(false);
    }
  };

  const handleDeleteRecord = async ({ id }: { id: string }) => {
    const { confirm } = await Taro.showModal({
      title: '删除记录',
      content: '确定要删除吗？',
    });
    if (!confirm) return;

    markBusy({ id });
    try {
      await foodApi.remove({ id });
      await fetchDaily();
    } catch {
      //
    } finally {
      unmarkBusy({ id });
    }
  };

  return (
    <View className="page-food">
      {/* 今日概览 */}
      {loading && <DailySkeleton />}

      {!loading && daily && (
        <>
          <CalorieSummaryCard daily={daily} />
          <NutrientBar daily={daily} />

          {!daily.bmr && (
            <Card
              className="body-info-hint"
              onClick={() =>
                Taro.navigateTo({ url: '/pages/profileEdit/index' })
              }
            >
              <UserOutlined className="body-info-hint__icon" />
              <View className="body-info-hint__text-wrap">
                <Text className="body-info-hint__title">
                  设置身体信息，解锁更多功能
                </Text>
                <Text className="body-info-hint__desc">
                  填写身高体重后可计算 BMI、BMR 和每日消耗建议
                </Text>
              </View>
            </Card>
          )}

          {daily.exerciseEquivalents && (
            <View className="exercise-section">
              <Text className="exercise-section__title">
                要消耗这 {daily.totalCalorie} kcal，大约需要
              </Text>
              {daily.calorieBalance !== null && daily.bmr && (
                <Text className="exercise-section__sub">
                  基础代谢 {daily.bmr} kcal ·{' '}
                  {daily.calorieBalance > 0
                    ? `已超出基代 ${daily.calorieBalance} kcal，需要运动消耗`
                    : `还可再摄入 ${Math.abs(daily.calorieBalance)} kcal 不超基代`}
                </Text>
              )}
              <ScrollView scrollX className="exercise-scroll">
                {daily.exerciseEquivalents.map((ex) => (
                  <ExerciseCard key={ex.key} exercise={ex} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* 食物记录列表 */}
          <View className="records-section">
            <Text className="section-title">今日记录</Text>
            {daily.records.length === 0 && (
              <View className="empty-hint">
                <Text className="empty-hint__text">
                  还没有记录，拍张照片开始吧
                </Text>
              </View>
            )}
            {daily.records.map((r) => (
              <Card
                key={r.id}
                className={`food-item ${isBusy({ id: r.id }) ? 'food-item--busy' : ''}`}
              >
                <View className="food-item__top">
                  <View className="food-item__info">
                    <View className="food-item__meal">
                      <View
                        className="food-item__meal-dot"
                        style={{
                          background:
                            MEAL_COLORS[r.mealType || 'snack'],
                        }}
                      />
                      <Text className="food-item__meal-text">
                        {MEAL_LABELS[r.mealType || 'snack']}
                      </Text>
                    </View>
                    <Text className="food-item__name">{r.name}</Text>
                  </View>
                  <Text className="food-item__calorie">{r.calorie} kcal</Text>
                </View>
                <View className="food-item__bottom">
                  <Text className="food-item__nutrient">
                    {r.foodWeight && `${r.foodWeight}g`}
                    {r.protein !== null && ` · 蛋白质${r.protein}g`}
                    {r.fat !== null && ` · 脂肪${r.fat}g`}
                    {r.carbs !== null && ` · 碳水${r.carbs}g`}
                  </Text>
                  <Text
                    className="food-item__delete"
                    onClick={
                      isBusy({ id: r.id })
                        ? undefined
                        : () => handleDeleteRecord({ id: r.id })
                    }
                  >
                    删除
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        </>
      )}

      {/* 识别结果弹层 */}
      {recognized && (
        <View className="recognize-modal">
          <View
            className="recognize-modal__mask"
            onClick={clearRecognition}
          />
          <View className="recognize-modal__content">
            <Text className="recognize-modal__title">识别结果</Text>
            <View className="recognize-modal__list">
              {recognized.map((food, i) => (
                <View key={i} className="recognize-food">
                  <View className="recognize-food__header">
                    <Text className="recognize-food__name">{food.name}</Text>
                    <Text className="recognize-food__cal">
                      {food.calorie} kcal
                    </Text>
                  </View>
                  <View className="recognize-food__weight-row">
                    <Text className="recognize-food__weight-label">重量</Text>
                    <Input
                      className="recognize-food__weight-input"
                      type="digit"
                      value={String(food.weight)}
                      onInput={(e) =>
                        handleWeightChange({
                          index: i,
                          newWeight: Number(e.detail.value) || 0,
                        })
                      }
                    />
                    <Text className="recognize-food__weight-unit">g</Text>
                  </View>
                  <Text className="recognize-food__detail">
                    蛋白质{food.protein}g · 脂肪{food.fat}g · 碳水{food.carbs}g
                  </Text>
                </View>
              ))}
            </View>

            <View className="recognize-modal__total">
              <Text className="recognize-modal__total-label">合计热量</Text>
              <Text className="recognize-modal__total-value">
                {recognized.reduce((s, f) => s + f.calorie, 0)} kcal
              </Text>
            </View>

            <View className="meal-picker">
              <Text className="meal-picker__label">选择餐次</Text>
              <View className="meal-picker__options">
                {Object.entries(MEAL_LABELS).map(([key, label]) => (
                  <View
                    key={key}
                    className={`meal-chip ${mealType === key ? 'meal-chip--active' : ''}`}
                    onClick={() => setMealType(key)}
                  >
                    <Text className="meal-chip__text">{label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View className="recognize-modal__actions">
              <View
                className="recognize-modal__cancel"
                onClick={clearRecognition}
              >
                <Text className="recognize-modal__cancel-text">取消</Text>
              </View>
              <View className="recognize-modal__save" onClick={handleSave}>
                <Text className="recognize-modal__save-text">保存记录</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* 识别中全屏动画 */}
      {recognizing && (
        <View className="scan-overlay">
          <View className="scan-overlay__rings">
            <View className="scan-overlay__ring scan-overlay__ring--1" />
            <View className="scan-overlay__ring scan-overlay__ring--2" />
            <View className="scan-overlay__ring scan-overlay__ring--3" />
            <View className="scan-overlay__center">
              <FireOutlined className="scan-overlay__icon" />
            </View>
          </View>
          <Text className="scan-overlay__text">AI 正在分析食物...</Text>
          <Text className="scan-overlay__sub">识别营养成分中，请稍候</Text>
        </View>
      )}

      {/* FAB 拍照按钮 */}
      {!recognized && !recognizing && (
        <View className="fab-camera" onClick={handleTakePhoto}>
          <PhotoOutlined className="fab-camera__icon" />
          <Text className="fab-camera__text">拍照记录</Text>
        </View>
      )}
    </View>
  );
};

const EXERCISE_ICONS: Record<string, string> = {
  running: '🏃',
  walking: '🚶',
  cycling: '🚴',
  swimming: '🏊',
  jumpRope: '🤸',
};

const ExerciseCard = ({ exercise }: { exercise: ExerciseEquivalent }) => (
  <View className="exercise-card">
    <Text className="exercise-card__emoji">{EXERCISE_ICONS[exercise.key] || '🏅'}</Text>
    <Text className="exercise-card__label">{exercise.label}</Text>
    <View className="exercise-card__value-row">
      <Text className="exercise-card__value">{exercise.value}</Text>
      <Text className="exercise-card__unit">{exercise.unit}</Text>
    </View>
  </View>
);

const CalorieSummaryCard = ({ daily }: { daily: DailySummary }) => (
  <Card className="calorie-card">
    <View className="calorie-card__hero">
      <Text className="calorie-card__number">{daily.totalCalorie}</Text>
      <Text className="calorie-card__unit">kcal</Text>
    </View>
    <Text className="calorie-card__label">今日摄入</Text>
    <View className="calorie-card__meals">
      {Object.entries(MEAL_LABELS).map(([key, label]) => (
        <View key={key} className="calorie-card__meal">
          <View
            className="calorie-card__meal-dot"
            style={{ background: MEAL_COLORS[key] }}
          />
          <Text className="calorie-card__meal-label">{label}</Text>
          <Text className="calorie-card__meal-value">
            {daily.mealSummary[key as keyof typeof daily.mealSummary]} kcal
          </Text>
        </View>
      ))}
    </View>
  </Card>
);

const NutrientBar = ({ daily }: { daily: DailySummary }) => {
  const total = daily.totalProtein + daily.totalFat + daily.totalCarbs;
  if (total === 0) return null;

  const pPct = Math.round((daily.totalProtein / total) * 100);
  const fPct = Math.round((daily.totalFat / total) * 100);
  const cPct = 100 - pPct - fPct;

  return (
    <Card className="nutrient-card">
      <View className="nutrient-bar">
        {pPct > 0 && (
          <View
            className="nutrient-bar__segment nutrient-bar__segment--protein"
            style={{ width: `${pPct}%` }}
          />
        )}
        {fPct > 0 && (
          <View
            className="nutrient-bar__segment nutrient-bar__segment--fat"
            style={{ width: `${fPct}%` }}
          />
        )}
        {cPct > 0 && (
          <View
            className="nutrient-bar__segment nutrient-bar__segment--carbs"
            style={{ width: `${cPct}%` }}
          />
        )}
      </View>
      <View className="nutrient-legend">
        <NutrientLegendItem
          color="#4ecdc4"
          label="蛋白质"
          value={`${daily.totalProtein}g`}
        />
        <NutrientLegendItem
          color="#ff6b6b"
          label="脂肪"
          value={`${daily.totalFat}g`}
        />
        <NutrientLegendItem
          color="#ffd93d"
          label="碳水"
          value={`${daily.totalCarbs}g`}
        />
      </View>
    </Card>
  );
};

const NutrientLegendItem = ({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) => (
  <View className="nutrient-legend__item">
    <View className="nutrient-legend__dot" style={{ background: color }} />
    <Text className="nutrient-legend__label">{label}</Text>
    <Text className="nutrient-legend__value">{value}</Text>
  </View>
);

const DailySkeleton = () => (
  <View className="page-food">
    <Card className="calorie-card">
      <Skeleton size="lg" />
      <Skeleton size="xs" width="30%" />
    </Card>
    <Card className="nutrient-card">
      <Skeleton size="sm" />
    </Card>
  </View>
);

export default FoodCalorie;
