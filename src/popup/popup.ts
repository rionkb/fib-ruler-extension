import { MESSAGE_TYPES } from "../shared/messages";
import type { GlobalSettings, TabState } from "../shared/types";

const status = document.querySelector<HTMLParagraphElement>("#status");
const toggle = document.querySelector<HTMLButtonElement>("#toggle");
const error = document.querySelector<HTMLParagraphElement>("#error");
const draw = document.querySelector<HTMLElement>("#draw-shortcut");
const del = document.querySelector<HTMLElement>("#delete-shortcut");

void init();

async function init(): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const tabId = tab?.id;
    if (tabId === undefined) throw new Error("このページではFib Rulerを使用できません");
    const response = await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.GET_TAB_STATE, tabId });
    const settings = await chrome.storage.local.get("globalSettings");
    const global = settings.globalSettings as GlobalSettings | undefined;
    if (draw && global?.drawShortcut) draw.textContent = formatShortcut(global.drawShortcut);
    if (del && global?.deleteShortcut) del.textContent = formatShortcut(global.deleteShortcut);
    update(response as TabState & { enabled?: boolean });
    toggle?.addEventListener("click", () => void toggleTab(tabId));
    document.querySelector("#settings")?.addEventListener("click", () => void chrome.runtime.openOptionsPage());
  } catch (reason) { setError(reason instanceof Error ? reason.message : "このページではFib Rulerを使用できません"); }
}

function update(state: { enabled?: boolean }): void { const enabled = state.enabled === true; if (status) status.textContent = enabled ? "Enabled on this tab" : "Disabled on this tab"; if (toggle) { toggle.textContent = enabled ? "Disable" : "Enable on this tab"; toggle.dataset.enabled = String(enabled); } }
async function toggleTab(tabId: number): Promise<void> { const enable = toggle?.dataset.enabled !== "true"; const response = await chrome.runtime.sendMessage({ type: enable ? MESSAGE_TYPES.ENABLE : MESSAGE_TYPES.DISABLE, tabId }); if (!response?.ok) { setError(response?.error ?? "このページではFib Rulerを使用できません"); return; } update({ enabled: enable }); }
function formatShortcut(shortcut: { modifiers: string[]; key: string }): string { return [...shortcut.modifiers, shortcut.key].join(" + "); }
function setError(message: string): void { if (error) error.textContent = message; if (status) status.textContent = "利用できません"; }
