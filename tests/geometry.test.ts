import { describe, expect, it } from "vitest";
import { calculateLevelY, hasDuplicateLevel, isValidCustomLevel, visibleHorizontalRange } from "../src/content/ruler/geometry";

describe("fib geometry", () => {
  it("calculates normal and extension levels", () => { expect(calculateLevelY(1, 0, 0.618)).toBeCloseTo(0.618); expect(calculateLevelY(1, 0, 1.618)).toBeCloseTo(1.618); });
  it("works when A and B are reversed", () => { expect(calculateLevelY(0, 1, 0.5)).toBeCloseTo(0.5); });
  it("uses a small fallback only for vertical rulers", () => { expect(visibleHorizontalRange({ x: 50, y: 10 }, { x: 50, y: 80 }, 200)).toEqual({ x: 40, width: 20 }); expect(visibleHorizontalRange({ x: 10, y: 10 }, { x: 15, y: 80 }, 200)).toEqual({ x: 10, width: 5 }); });
  it("validates custom levels", () => { expect(isValidCustomLevel(0.886)).toBe(true); expect(isValidCustomLevel(Number.NaN)).toBe(false); expect(isValidCustomLevel(Number.POSITIVE_INFINITY)).toBe(false); expect(hasDuplicateLevel([0.5], 0.5001)).toBe(true); });
});
