import { describe, expect, it } from "vitest";
import { isEditableTarget, matchesShortcut, validateShortcut } from "../src/shared/shortcut";

describe("shortcuts", () => {
  it("validates Shift+A and Shift+D and rejects collisions", () => { expect(validateShortcut({ modifiers: ["Shift"], key: "A" }, { modifiers: ["Shift"], key: "D" })).toBeNull(); expect(validateShortcut({ modifiers: ["Shift"], key: "A" }, { modifiers: ["Shift"], key: "A" })).toBeTruthy(); expect(validateShortcut({ modifiers: ["Ctrl", "Alt"], key: "F" }, { modifiers: ["Shift"], key: "D" })).toBeTruthy(); expect(validateShortcut({ modifiers: [], key: "A" }, { modifiers: ["Shift"], key: "D" })).toBeTruthy(); });
  it("matches a keyboard event", () => { const event = new KeyboardEvent("keydown", { key: "a", shiftKey: true }); expect(matchesShortcut(event, { modifiers: ["Shift"], key: "A" })).toBe(true); });
  it("recognizes editable targets", () => { const input = document.createElement("input"); document.body.append(input); input.focus(); expect(isEditableTarget(new KeyboardEvent("keydown", { bubbles: true }))).toBe(false); const event = new KeyboardEvent("keydown", { bubbles: true, composed: true }); Object.defineProperty(event, "composedPath", { value: () => [input, document.body] }); expect(isEditableTarget(event)).toBe(true); input.remove(); });
});
