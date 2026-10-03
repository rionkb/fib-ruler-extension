import { describe, expect, it } from "vitest";
import { createDefaultTabState } from "../src/shared/defaults";
import { mergeTabState } from "../src/shared/storage";

describe("tab state", () => { it("restores a placed ruler and defaults malformed state", () => { const state = mergeTabState({ ...createDefaultTabState(), pointA: { x: 1, y: 2 }, pointB: { x: 3, y: 4 }, hasPlacedRuler: true }); expect(state.hasPlacedRuler).toBe(true); expect(state.pointA).toEqual({ x: 1, y: 2 }); expect(mergeTabState({ pointA: { x: "bad" } }).pointA).toBeNull(); }); });
