import { describe, expect, it, vi } from "vitest";
import { createDefaultSettings, createDefaultTabState } from "../src/shared/defaults";
import { MESSAGE_TYPES } from "../src/shared/messages";

describe("content listener lifecycle", () => {
  it("adds and removes exactly one runtime listener per content instance", async () => {
    const listeners: Array<(message: unknown, sender: chrome.runtime.MessageSender, sendResponse: (response: unknown) => void) => boolean> = [];
    const addListener = vi.fn((listener) => { listeners.push(listener); });
    const removeListener = vi.fn((listener) => { const index = listeners.indexOf(listener); if (index >= 0) listeners.splice(index, 1); });
    vi.stubGlobal("chrome", { runtime: { onMessage: { addListener, removeListener }, sendMessage: vi.fn().mockResolvedValue({ ok: true }) } });

    vi.resetModules();
    await import("../src/content/content");
    expect(addListener).toHaveBeenCalledTimes(1);
    const first = listeners[0];
    expect(first).toBeDefined();
    await dispatch(first, { type: MESSAGE_TYPES.INIT, tabId: 123, state: createDefaultTabState(), settings: createDefaultSettings() });
    await dispatch(first, { type: MESSAGE_TYPES.DISABLE, tabId: 123 });
    expect(removeListener).toHaveBeenCalledWith(first);

    vi.resetModules();
    await import("../src/content/content");
    expect(addListener).toHaveBeenCalledTimes(2);
    const second = listeners[0];
    expect(second).toBeDefined();
    await dispatch(second, { type: MESSAGE_TYPES.INIT, tabId: 123, state: createDefaultTabState(), settings: createDefaultSettings() });
    await dispatch(second, { type: MESSAGE_TYPES.DISABLE, tabId: 123 });
    expect(removeListener).toHaveBeenCalledTimes(2);
    expect(document.getElementById("fib-ruler-shadow-host")).toBeNull();
  });
});

async function dispatch(listener: ((message: unknown, sender: chrome.runtime.MessageSender, sendResponse: (response: unknown) => void) => boolean) | undefined, message: unknown): Promise<void> {
  if (!listener) throw new Error("listener was not registered");
  await new Promise<void>((resolve) => { listener(message, {} as chrome.runtime.MessageSender, () => resolve()); });
}
