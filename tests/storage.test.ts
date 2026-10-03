import { describe, expect, it } from "vitest";
import { createDefaultTabState } from "../src/shared/defaults";
import { mergeSettings, mergeTabState } from "../src/shared/storage";

describe("tab state", () => { it("restores a placed ruler and defaults malformed state", () => { const state = mergeTabState({ ...createDefaultTabState(), pointA: { x: 1, y: 2 }, pointB: { x: 3, y: 4 }, hasPlacedRuler: true }); expect(state.hasPlacedRuler).toBe(true); expect(state.pointA).toEqual({ x: 1, y: 2 }); expect(mergeTabState({ pointA: { x: "bad" } }).pointA).toBeNull(); }); });

describe("global settings", () => {
  it("falls back field-by-field for corrupt values", () => {
    const settings = mergeSettings({ drawShortcut: null, deleteShortcut: "broken", bandOpacity: "abc", colors: { base: "red", blue: "#123456" }, levels: [{ ratio: Number.NaN, enabled: true }, { ratio: 0.5, enabled: "yes" }, { ratio: 0.886, enabled: true }, { ratio: 0.886, enabled: true }, { ratio: 4.618, enabled: false }, { ratio: Number.POSITIVE_INFINITY, enabled: true }] });
    expect(settings.drawShortcut).toEqual({ modifiers: ["Shift"], key: "A" });
    expect(settings.deleteShortcut).toEqual({ modifiers: ["Shift"], key: "D" });
    expect(settings.colors.base).toBe("#808080");
    expect(settings.colors.blue).toBe("#123456");
    expect(settings.bandOpacity).toBe(0.2);
    expect(settings.levels.filter((level) => level.isCustom)).toEqual([{ ratio: 0.886, enabled: true, isCustom: true }, { ratio: 4.618, enabled: false, isCustom: true }]);
    expect(settings.levels.find((level) => level.ratio === 4.618)?.enabled).toBe(false);
    expect(settings.levels.find((level) => level.ratio === 0.5)?.enabled).toBe(true);
  });
});
