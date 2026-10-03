import { createDefaultSettings, createDefaultTabState, DEFAULT_RATIOS } from "./defaults";
import { normalizeShortcut, sanitizeShortcut } from "./shortcut";
import type { ColorSettings, FibLevel, GlobalSettings, TabState } from "./types";

const GLOBAL_KEY = "globalSettings";
const TAB_PREFIX = "tabState:";
const COLOR_KEYS: Array<keyof ColorSettings> = ["base", "red", "green", "orange", "cyan", "blue", "purple", "pink"];

export async function loadSettings(): Promise<GlobalSettings> {
  const result = await chrome.storage.local.get(GLOBAL_KEY);
  return mergeSettings(result[GLOBAL_KEY]);
}

export async function saveSettings(settings: GlobalSettings): Promise<void> {
  await chrome.storage.local.set({ [GLOBAL_KEY]: mergeSettings(settings) });
}

export async function loadTabState(tabId: number): Promise<TabState> {
  const key = `${TAB_PREFIX}${tabId}`;
  const result = await chrome.storage.session.get(key);
  return result[key] === undefined ? { ...createDefaultTabState(), enabled: false } : mergeTabState(result[key]);
}

export async function saveTabState(tabId: number, state: TabState): Promise<void> {
  await chrome.storage.session.set({ [`${TAB_PREFIX}${tabId}`]: mergeTabState(state) });
}

export function mergeSettings(value: unknown): GlobalSettings {
  const defaults = createDefaultSettings();
  if (!isRecord(value)) return defaults;
  const rawColors = isRecord(value.colors) ? value.colors : {};
  const colors = Object.fromEntries(COLOR_KEYS.map((key) => [key, normalizeHex(rawColors[key], defaults.colors[key])])) as unknown as ColorSettings;
  const drawShortcut = sanitizeShortcut(value.drawShortcut, defaults.drawShortcut, defaults.deleteShortcut);
  const deleteShortcut = sanitizeShortcut(value.deleteShortcut, defaults.deleteShortcut, drawShortcut);
  const safeDeleteShortcut = shortcutEqualsSafe(deleteShortcut, drawShortcut) ? { ...defaults.deleteShortcut } : deleteShortcut;
  return { colors, bandOpacity: finiteNumber(value.bandOpacity, defaults.bandOpacity, 0, 1), drawShortcut, deleteShortcut: safeDeleteShortcut, levels: normalizeLevels(value.levels) };
}

export function mergeTabState(value: unknown): TabState {
  const defaults = createDefaultTabState();
  if (!isRecord(value)) return defaults;
  return { enabled: value.enabled === true, pointA: isPoint(value.pointA) ? value.pointA : null, pointB: isPoint(value.pointB) ? value.pointB : null, hasPlacedRuler: value.hasPlacedRuler === true, interactionMode: value.interactionMode === "LOCK" ? "LOCK" : "EDIT" };
}

export function normalizeLevels(value: unknown): FibLevel[] {
  const defaults = createDefaultSettings().levels;
  if (!Array.isArray(value)) return defaults;
  const visibility = new Map(DEFAULT_RATIOS.map((ratio, index) => [ratio, defaults[index]?.enabled ?? true]));
  const custom: FibLevel[] = [];
  for (const candidate of value) {
    if (!isRecord(candidate) || typeof candidate.ratio !== "number" || !Number.isFinite(candidate.ratio)) continue;
    const ratio = Math.round(candidate.ratio * 1000) / 1000;
    const standard = DEFAULT_RATIOS.find((defaultRatio) => Math.abs(defaultRatio - ratio) < 0.0005);
    if (standard !== undefined) { if (typeof candidate.enabled === "boolean") visibility.set(standard, candidate.enabled); continue; }
    if (typeof candidate.enabled !== "boolean" || custom.some((level) => Math.abs(level.ratio - ratio) < 0.0005)) continue;
    custom.push({ ratio, enabled: candidate.enabled, isCustom: true });
  }
  return DEFAULT_RATIOS.map((ratio) => ({ ratio, enabled: visibility.get(ratio) ?? true, isCustom: false })).concat(custom);
}

function normalizeHex(value: unknown, fallback: string): string { return typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value) ? value.toUpperCase() : fallback; }
function finiteNumber(value: unknown, fallback: number, min: number, max: number): number { return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
function isPoint(value: unknown): value is { x: number; y: number } { return isRecord(value) && Number.isFinite(value.x) && Number.isFinite(value.y); }
function shortcutEqualsSafe(left: unknown, right: unknown): boolean { const a = normalizeShortcut(left); const b = normalizeShortcut(right); return a.key === b.key && a.modifiers.join("+") === b.modifiers.join("+"); }
