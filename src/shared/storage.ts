import { createDefaultSettings, createDefaultTabState } from "./defaults";
import type { GlobalSettings, TabState } from "./types";

const GLOBAL_KEY = "globalSettings";
const TAB_PREFIX = "tabState:";

export async function loadSettings(): Promise<GlobalSettings> {
  const result = await chrome.storage.local.get(GLOBAL_KEY);
  return mergeSettings(result[GLOBAL_KEY]);
}

export async function saveSettings(settings: GlobalSettings): Promise<void> {
  await chrome.storage.local.set({ [GLOBAL_KEY]: settings });
}

export async function loadTabState(tabId: number): Promise<TabState> {
  const key = `${TAB_PREFIX}${tabId}`;
  const result = await chrome.storage.session.get(key);
  // A missing session record means the user has not enabled the extension on this tab.
  // Content scripts are injected only after Enable, so treating this as disabled keeps
  // Popup status honest without weakening the content-side defaults used during startup.
  return result[key] === undefined ? { ...createDefaultTabState(), enabled: false } : mergeTabState(result[key]);
}

export async function saveTabState(tabId: number, state: TabState): Promise<void> {
  await chrome.storage.session.set({ [`${TAB_PREFIX}${tabId}`]: state });
}

export async function clearTabState(tabId: number): Promise<void> {
  await chrome.storage.session.remove(`${TAB_PREFIX}${tabId}`);
}

export function mergeSettings(value: unknown): GlobalSettings {
  const defaults = createDefaultSettings();
  if (!isRecord(value)) return defaults;
  const colors = isRecord(value.colors) ? { ...defaults.colors, ...value.colors } : defaults.colors;
  return {
    colors,
    bandOpacity: finiteNumber(value.bandOpacity, defaults.bandOpacity, 0, 1),
    drawShortcut: value.drawShortcut ?? defaults.drawShortcut,
    deleteShortcut: value.deleteShortcut ?? defaults.deleteShortcut,
    levels: Array.isArray(value.levels) ? value.levels as GlobalSettings["levels"] : defaults.levels
  };
}

export function mergeTabState(value: unknown): TabState {
  const defaults = createDefaultTabState();
  if (!isRecord(value)) return defaults;
  return {
    enabled: value.enabled !== false,
    pointA: isPoint(value.pointA) ? value.pointA : null,
    pointB: isPoint(value.pointB) ? value.pointB : null,
    hasPlacedRuler: value.hasPlacedRuler === true,
    interactionMode: value.interactionMode === "LOCK" ? "LOCK" : "EDIT",
    levels: Array.isArray(value.levels) ? value.levels as TabState["levels"] : defaults.levels
  };
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null;
}

function isPoint(value: unknown): value is { x: number; y: number } {
  return isRecord(value) && Number.isFinite(value.x) && Number.isFinite(value.y);
}

function finiteNumber(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}
