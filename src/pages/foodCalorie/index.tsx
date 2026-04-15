import { View, Text } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import { foodApi } from '../../apis/food';
import { DailySummary, FoodItem } from '../../apis/food/types';
import { Card, Skeleton } from '../../components';
import { useBusyIds } from '../../hooks';
import './index.scss';

const MEAL_LABELS: Record<string, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐',
};

const MEAL_ICONS: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍪',
};

const FoodCalorie = () => {
  const [daily, setDaily] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [recognizing, setRecognizing] = useState(false);
  const [recognized, setRecognized] = useState<FoodItem[] | null>(null);
  const [mealType, setMealType] = useState('lunch');
  const { isBusy, markBusy, unmarkBusy } = useBusyIds();

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

  const handleTakePhoto = () => {
    Taro.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['camera', 'album'],
      success: async (res) => {
        const filePath = res.tempFilePaths[0];
        setRecognizing(true);

        try {
          const fs = Taro.getFileSystemManager();
          const base64 = fs.readFileSync(filePath, 'base64') as string;
          const result = await foodApi.recognize({ image: base64 });

          if (result.foods.length === 0) {
            Taro.showToast({ title: '未识别到食物', icon: 'none' });
            return;
          }

          setRecognized(result.foods);
          guessMealType();
        } catch {
          Taro.showToast({ title: '识别失败，请重试', icon: 'none' });
        } finally {
          setRecognizing(false);
        }
      },
    });
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
      setRecognized(null);
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

          {daily.runDistanceNeeded !== null && (
            <Card className="run-hint">
              <Text className="run-hint__icon">🏃</Text>
              <View className="run-hint__text-wrap">
                <Text className="run-hint__text">
                  今日摄入需跑
                  <Text className="run-hint__distance">
                    {' '}
                    {daily.runDistanceNeeded}{' '}
                  </Text>
                  公里消耗
                </Text>
                {daily.calorieBalance !== null && daily.bmr && (
                  <Text className="run-hint__sub">
                    基础代谢 {daily.bmr} kcal ·{' '}
                    {daily.calorieBalance > 0
                      ? `超出 ${daily.calorieBalance} kcal`
                      : `还剩 ${Math.abs(daily.calorieBalance)} kcal`}
                  </Text>
                )}
              </View>
            </Card>
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
                    <Text className="food-item__meal">
                      {MEAL_ICONS[r.mealType || 'snack']}{' '}
                      {MEAL_LABELS[r.mealType || 'snack']}
                    </Text>
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
          <View className="recognize-modal__mask" onClick={() => setRecognized(null)} />
          <View className="recognize-modal__content">
            <Text className="recognize-modal__title">识别结果</Text>
            <View className="recognize-modal__list">
              {recognized.map((food, i) => (
                <View key={i} className="recognize-food">
                  <View className="recognize-food__left">
                    <Text className="recognize-food__name">{food.name}</Text>
                    <Text className="recognize-food__detail">
                      {food.weight}g · 蛋白质{food.protein}g · 脂肪{food.fat}g
                      · 碳水{food.carbs}g
                    </Text>
                  </View>
                  <Text className="recognize-food__cal">
                    {food.calorie} kcal
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
                    <Text className="meal-chip__text">
                      {MEAL_ICONS[key]} {label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View className="recognize-modal__actions">
              <View
                className="recognize-modal__cancel"
                onClick={() => setRecognized(null)}
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

      {/* FAB 拍照按钮 */}
      {!recognized && (
        <View
          className={`fab-camera ${recognizing ? 'fab-camera--loading' : ''}`}
          onClick={recognizing ? undefined : handleTakePhoto}
        >
          <Text className="fab-camera__text">
            {recognizing ? '识别中...' : '📷 拍照记录'}
          </Text>
        </View>
      )}
    </View>
  );
};

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
          <Text className="calorie-card__meal-icon">{MEAL_ICONS[key]}</Text>
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
