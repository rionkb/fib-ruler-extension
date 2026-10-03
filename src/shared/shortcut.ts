import { DEFAULT_TOGGLE_SHORTCUT } from "./defaults";
import type { Shortcut } from "./types";

const MODIFIERS = ["Ctrl", "Alt", "Shift", "Meta"] as const;

export function normalizeShortcut(shortcut: Shortcut): Shortcut {
  return { modifiers: MODIFIERS.filter((modifier) => shortcut.modifiers.includes(modifier)), key: shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key };
}

export function shortcutEquals(a: Shortcut, b: Shortcut): boolean {
  const left = normalizeShortcut(a);
  const right = normalizeShortcut(b);
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
  const modifierState: Record<string, boolean> = {
    Ctrl: event.ctrlKey,
    Alt: event.altKey,
    Shift: event.shiftKey,
    Meta: event.metaKey
  };
  if (normalized.modifiers.length !== Object.values(modifierState).filter(Boolean).length) return false;
  if (normalized.modifiers.some((modifier) => !modifierState[modifier])) return false;
  return event.key.toUpperCase() === normalized.key.toUpperCase();
}

export function validateShortcut(shortcut: Shortcut, other: Shortcut): string | null {
  const normalized = normalizeShortcut(shortcut);
  if (!normalized.key || normalized.modifiers.length === 0 && /^[A-Z0-9]$/i.test(normalized.key)) return "modifierなし英数字は使えません";
  if (normalized.key === "Escape") return "Escは使えません";
  if (shortcutEquals(normalized, other)) return "DrawとDeleteは同じにできません";
  if (shortcutEquals(normalized, DEFAULT_TOGGLE_SHORTCUT)) return "Ctrl+Alt+Fは使えません";
  return null;
}
