import { MESSAGE_TYPES } from "../shared/messages";
import { clearTabState, loadTabState, saveTabState } from "../shared/storage";

chrome.runtime.onMessage.addListener((message: { type?: string; tabId?: number }, sender, sendResponse) => {
  void routeMessage(message, sender).then(sendResponse).catch((error: unknown) => sendResponse({ error: error instanceof Error ? error.message : "処理に失敗しました" }));
  return true;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== "complete") return;
  void restoreTab(tabId);
});

async function routeMessage(message: { type?: string; tabId?: number }, sender: chrome.runtime.MessageSender): Promise<{ ok: boolean; enabled?: boolean; tabId?: number; error?: string }> {
  const tabId = sender.tab?.id;
  if (message.type === MESSAGE_TYPES.GET_TAB_STATE) {
    const requestedTabId = message.tabId ?? tabId;
    if (requestedTabId === undefined) return { ok: false, error: "このページではFib Rulerを使用できません" };
    return { ok: true, tabId: requestedTabId, ...(await loadTabState(requestedTabId)) };
  }
  if (message.type === MESSAGE_TYPES.ENABLE) {
    const requestedTabId = typeof (message as { tabId?: unknown }).tabId === "number" ? (message as { tabId: number }).tabId : tabId;
    if (requestedTabId === undefined) return { ok: false, error: "このページではFib Rulerを使用できません" };
    try { await chrome.scripting.executeScript({ target: { tabId: requestedTabId }, files: ["content.js"] }); await saveTabState(requestedTabId, { ...(await loadTabState(requestedTabId)), enabled: true }); return { ok: true, enabled: true }; } catch { await clearTabState(requestedTabId); return { ok: false, error: "このページではFib Rulerを使用できません" }; }
  }
  if (message.type === MESSAGE_TYPES.DISABLE && tabId !== undefined) { await chrome.tabs.sendMessage(tabId, { type: MESSAGE_TYPES.DISABLE }).catch(() => undefined); await clearTabState(tabId); return { ok: true, enabled: false }; }
  return { ok: true };
}

async function restoreTab(tabId: number): Promise<void> {
  const state = await loadTabState(tabId);
  if (!state.enabled) return;
  try { await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] }); } catch { await clearTabState(tabId); }
}
