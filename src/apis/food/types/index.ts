export interface FoodItem {
  name: string;
  weight: number;
  calorie: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface FoodRecord {
  id: string;
  name: string;
  calorie: number;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  foodWeight: number | null;
  imageUrl: string | null;
  mealType: string | null;
  recordDate: string;
  createdAt: string;
}

export interface RecognizeResult {
  foods: FoodItem[];
  totalCalorie: number;
}

export interface DailySummary {
  date: string;
  totalCalorie: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
  mealSummary: {
    breakfast: number;
    lunch: number;
    dinner: number;
    snack: number;
  };
  runDistanceNeeded: number | null;
  bmr: number | null;
  calorieBalance: number | null;
  records: FoodRecord[];
}

export interface SaveFoodParams {
  foods: Array<{
    name: string;
    calorie: number;
    protein?: number;
    fat?: number;
    carbs?: number;
    weight?: number;
  }>;
  mealType?: string;
  date?: string;
}
