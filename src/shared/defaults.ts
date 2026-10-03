import type { ColorSettings, FibLevel, GlobalSettings, Shortcut, TabState } from "./types";

export const DEFAULT_RATIOS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.272, 1.414, 1.618, 2, 2.618, 3.618, 4.236];

export const DEFAULT_COLORS: ColorSettings = {
  base: "#808080",
  red: "#F23645",
  green: "#4CAF50",
  orange: "#FF9800",
  cyan: "#00BCD4",
  blue: "#2962FF",
  purple: "#9C27B0",
  pink: "#E91E63"
};

export const DEFAULT_DRAW_SHORTCUT: Shortcut = { modifiers: ["Shift"], key: "A" };
export const DEFAULT_DELETE_SHORTCUT: Shortcut = { modifiers: ["Shift"], key: "D" };
export const DEFAULT_TOGGLE_SHORTCUT: Shortcut = { modifiers: ["Ctrl", "Alt"], key: "F" };

export function createDefaultLevels(): FibLevel[] {
  return DEFAULT_RATIOS.map((ratio) => ({ ratio, enabled: true, isCustom: false }));
}

export function createDefaultSettings(): GlobalSettings {
  return {
    colors: { ...DEFAULT_COLORS },
    bandOpacity: 0.2,
    drawShortcut: { ...DEFAULT_DRAW_SHORTCUT, modifiers: [...DEFAULT_DRAW_SHORTCUT.modifiers] },
    deleteShortcut: { ...DEFAULT_DELETE_SHORTCUT, modifiers: [...DEFAULT_DELETE_SHORTCUT.modifiers] },
    levels: createDefaultLevels()
  };
}

export function createDefaultTabState(): TabState {
  return {
    enabled: true,
    pointA: null,
    pointB: null,
    hasPlacedRuler: false,
    interactionMode: "EDIT",
    levels: createDefaultLevels()
  };
}
