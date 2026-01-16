export interface Meal {
    id: string;
    meal_type: string;
    tags: string[]; // e.g. ["cut", "high_protein"]
    kcal: number;
    p: number;
    c: number;
    f: number;
    price: number;
}

export class MealPicker {
    private meals: Meal[];

    constructor(meals: Meal[]) {
        this.meals = meals;
    }

    filter(type: string, goal: string): Meal[] {
        return this.meals.filter(m =>
            m.meal_type === type &&
            (m.tags.includes(goal) || m.tags.includes("all"))
        );
    }

    pickRandom(candidates: Meal[], seed: number): Meal | null {
        if (candidates.length === 0) return null;
        const index = seed % candidates.length;
        return candidates[index];
    }
}
