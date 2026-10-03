import type { Point } from "../../shared/types";

export function calculateLevelY(yA: number, yB: number, ratio: number): number {
  return yB + (yA - yB) * ratio;
}

export function normalizeRatio(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function visibleHorizontalRange(pointA: Point, pointB: Point, viewportWidth: number): { x: number; width: number } {
  const left = Math.min(pointA.x, pointB.x);
  const right = Math.max(pointA.x, pointB.x);
  if (right - left >= 1) return { x: left, width: right - left };
  const center = (pointA.x + pointB.x) / 2;
  const width = Math.min(20, Math.max(0, viewportWidth));
  const x = Math.min(Math.max(0, center - width / 2), Math.max(0, viewportWidth - width));
  return { x, width };
}

export function isValidCustomLevel(value: number): boolean {
  return Number.isFinite(value);
}

export function hasDuplicateLevel(levels: number[], value: number): boolean {
  return levels.some((level) => Math.abs(level - value) < 0.0005);
}
