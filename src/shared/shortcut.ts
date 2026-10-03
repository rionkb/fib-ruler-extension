import { DEFAULT_DRAW_SHORTCUT, DEFAULT_TOGGLE_SHORTCUT } from "./defaults";
import type { Shortcut } from "./types";

const MODIFIERS = ["Ctrl", "Alt", "Shift", "Meta"] as const;
const MODIFIER_KEYS = new Set(["Control", "Alt", "Shift", "Meta"]);

export function normalizeShortcut(value: unknown, fallback: Shortcut = DEFAULT_DRAW_SHORTCUT): Shortcut {
  if (!isShortcutShape(value)) return cloneShortcut(fallback);
  return { modifiers: MODIFIERS.filter((modifier) => value.modifiers.includes(modifier)), key: value.key.length === 1 ? value.key.toUpperCase() : value.key };
}

export function sanitizeShortcut(value: unknown, fallback: Shortcut, other: Shortcut): Shortcut {
  const normalized = normalizeShortcut(value, fallback);
  return validateShortcut(normalized, other) === null ? normalized : cloneShortcut(fallback);
}

export function shortcutEquals(a: unknown, b: unknown): boolean {
  const left = normalizeShortcut(a); const right = normalizeShortcut(b);
  return left.key === right.key && left.modifiers.join("+") === right.modifiers.join("+");
}

export function isEditableTarget(event: Event): boolean {
  for (const element of event.composedPath()) {
    if (!(element instanceof HTMLElement)) continue;
    const tag = element.tagName.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select" || element.isContentEditable) return true;
    if (element.getAttribute("role") === "textbox") return true;
    if (element.closest(".CodeMirror, .monaco-editor, [contenteditable='true']")) return true;
  }
  return false;
}

export function matchesShortcut(event: KeyboardEvent, shortcut: Shortcut): boolean {
  const normalized = normalizeShortcut(shortcut);
  const modifierState: Record<string, boolean> = { Ctrl: event.ctrlKey, Alt: event.altKey, Shift: event.shiftKey, Meta: event.metaKey };
  if (normalized.modifiers.length !== Object.values(modifierState).filter(Boolean).length) return false;
  if (normalized.modifiers.some((modifier) => !modifierState[modifier])) return false;
  return event.key.toUpperCase() === normalized.key.toUpperCase();
}

export function validateShortcut(shortcut: unknown, other: Shortcut): string | null {
  if (!isShortcutShape(shortcut)) return "ショートカットが不正です";
  const normalized = normalizeShortcut(shortcut);
  if (!normalized.key || MODIFIER_KEYS.has(normalized.key)) return "キーを指定してください";
  if (normalized.modifiers.length === 0 && /^[A-Z0-9]$/i.test(normalized.key)) return "modifierなし英数字は使えません";
  if (normalized.key === "Escape") return "Escは使えません";
  if (shortcutEquals(normalized, other)) return "DrawとDeleteは同じにできません";
  if (shortcutEquals(normalized, DEFAULT_TOGGLE_SHORTCUT)) return "Ctrl+Alt+Fは使えません";
  return null;
}

function isShortcutShape(value: unknown): value is Shortcut {
  return typeof value === "object" && value !== null && Array.isArray((value as { modifiers?: unknown }).modifiers) && (value as { modifiers: unknown[] }).modifiers.every((modifier) => typeof modifier === "string" && MODIFIERS.includes(modifier as typeof MODIFIERS[number])) && typeof (value as { key?: unknown }).key === "string" && (value as { key: string }).key.length > 0;
}

function cloneShortcut(shortcut: Shortcut): Shortcut { return { key: shortcut.key, modifiers: [...shortcut.modifiers] }; }
