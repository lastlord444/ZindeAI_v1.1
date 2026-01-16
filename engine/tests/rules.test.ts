import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Rules } from "../src/validators/rules.ts";

Deno.test("Rules.validateMacros matches within tolerance", () => {
    const target = { kcal: 2000, p: 150, c: 200, f: 60 };
    const actual = { kcal: 2050, p: 155, c: 205, f: 65 }; // Close enough

    const result = Rules.validateMacros(actual, target, 0.1);
    assertEquals(result, true);
});

Deno.test("Rules.validateMacros fails on large deviation", () => {
    const target = { kcal: 2000, p: 150, c: 200, f: 60 };
    const actual = { kcal: 2500, p: 150, c: 200, f: 60 }; // Way off

    const result = Rules.validateMacros(actual, target, 0.1);
    assertEquals(result, false);
});
