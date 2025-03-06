
export interface Ingredient {
  name: string;
  amount: string;
  notes?: string;
}

export interface Step {
  instruction: string;
  tip?: string;
}

export interface Recipe {
  name: string;
  description: string;
  cuisine: string;
  difficulty: "Easy" | "Medium" | "Hard";
  cookingTime: number;
  servings: number;
  ingredients: Ingredient[];
  steps: Step[];
}
