import { MESSAGE_TYPES } from "../shared/messages";
import type { ExtensionMessage, MessageResponse } from "../shared/messages";
import { loadSettings, loadTabState, saveSettings, saveTabState } from "../shared/storage";
import type { GlobalSettings, TabState } from "../shared/types";

chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  void routeMessage(message, sender).then(sendResponse).catch((error: unknown) => sendResponse({ ok: false, error: error instanceof Error ? error.message : "処理に失敗しました" }));
  return true;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== "complete") return;
  void restoreTab(tabId);
});

export async function routeMessage(message: ExtensionMessage, sender: chrome.runtime.MessageSender): Promise<MessageResponse> {
  switch (message.type) {
    case MESSAGE_TYPES.GET_TAB_STATE:
      return { ok: true, tabId: message.tabId, state: await loadTabState(message.tabId) };
    case MESSAGE_TYPES.ENABLE:
      return enableTab(message.tabId);
    case MESSAGE_TYPES.DISABLE:
      return disableTab(message.tabId);
    case MESSAGE_TYPES.SET_TAB_STATE:
      return updateTabState(message.tabId, message.state);
    case MESSAGE_TYPES.SETTINGS_UPDATED:
      return updateSettings(message.settings);
    default:
      return { ok: false, error: `Unsupported message from ${sender.tab?.id ?? "extension page"}` };
  }
}

async function enableTab(tabId: number): Promise<MessageResponse> {
  const previous = await loadTabState(tabId);
  const enabledState: TabState = { ...previous, enabled: true };
  await saveTabState(tabId, enabledState);
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
    await chrome.tabs.sendMessage(tabId, { type: MESSAGE_TYPES.INIT, tabId, state: enabledState, settings: await loadSettings() });
    return { ok: true, tabId, enabled: true, state: enabledState };
  } catch {
    await saveTabState(tabId, { ...enabledState, enabled: false });
    return { ok: false, tabId, enabled: false, error: "このページではFib Rulerを使用できません" };
  }
}

async function disableTab(tabId: number): Promise<MessageResponse> {
  const current = await loadTabState(tabId);
  await chrome.tabs.sendMessage(tabId, { type: MESSAGE_TYPES.DISABLE, tabId }).catch(() => undefined);
  await saveTabState(tabId, { ...current, enabled: false });
  return { ok: true, tabId, enabled: false, state: { ...current, enabled: false } };
}

async function updateTabState(tabId: number, update: Omit<TabState, "enabled">): Promise<MessageResponse> {
  const current = await loadTabState(tabId);
  if (!current.enabled) return { ok: true, tabId, enabled: false };
  const next: TabState = { ...current, ...update, enabled: true };
  await saveTabState(tabId, next);
  return { ok: true, tabId, enabled: true, state: next };
}

async function updateSettings(settings: GlobalSettings): Promise<MessageResponse> {
  await saveSettings(settings);
  const normalized = await loadSettings();
  await broadcastSettings(normalized);
  return { ok: true };
}

async function broadcastSettings(settings: GlobalSettings): Promise<void> {
  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs.map((tab) => tab.id === undefined ? undefined : chrome.tabs.sendMessage(tab.id, { type: MESSAGE_TYPES.SETTINGS_UPDATED, settings }).catch(() => undefined)));
}

async function restoreTab(tabId: number): Promise<void> {
  const state = await loadTabState(tabId);
  if (!state.enabled) return;
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
    await chrome.tabs.sendMessage(tabId, { type: MESSAGE_TYPES.INIT, tabId, state, settings: await loadSettings() });
  } catch {
    await saveTabState(tabId, { ...state, enabled: false });
  }
}
