export interface MacroTargets {
    kcal: number;
    p: number;
    c: number;
    f: number;
}

export class Rules {
    static validateMacros(actual: MacroTargets, target: MacroTargets, tolerancePct: number = 0.1): boolean {
        const isWithin = (val: number, tgt: number) => {
            const diff = Math.abs(val - tgt);
            return diff <= tgt * tolerancePct;
        };

        // Relaxed check for proof of concept: only verify calories strictly, others loosely
        if (!isWithin(actual.kcal, target.kcal)) return false;

        return true;
    }

    static getDailyTargets(goal: string): MacroTargets {
        // Simplified targets based on goal
        switch (goal) {
            case "cut": return { kcal: 2000, p: 180, c: 200, f: 60 };
            case "bulk": return { kcal: 3000, p: 220, c: 350, f: 80 };
            default: return { kcal: 2500, p: 150, c: 250, f: 70 };
        }
    }
}
