import { beforeEach, describe, expect, it, vi } from "vitest";
import { MESSAGE_TYPES } from "../src/shared/messages";

type MockChrome = typeof chrome & { __session: Map<string, unknown>; __local: Map<string, unknown>; __executeScript: ReturnType<typeof vi.fn>; __sendMessage: ReturnType<typeof vi.fn> };

function createChromeMock(): MockChrome {
  const session = new Map<string, unknown>();
  const local = new Map<string, unknown>();
  const executeScript = vi.fn().mockResolvedValue(undefined);
  const sendMessage = vi.fn().mockResolvedValue({ ok: true });
  const runtime = { onMessage: { addListener: vi.fn(), removeListener: vi.fn() }, sendMessage };
  const mock = {
    __session: session,
    __local: local,
    __executeScript: executeScript,
    __sendMessage: sendMessage,
    runtime,
    storage: {
      local: {
        get: vi.fn(async (key: string) => ({ [key]: local.get(key) })),
        set: vi.fn(async (values: Record<string, unknown>) => { Object.entries(values).forEach(([key, value]) => local.set(key, value)); })
      },
      session: {
        get: vi.fn(async (key: string) => ({ [key]: session.get(key) })),
        set: vi.fn(async (values: Record<string, unknown>) => { Object.entries(values).forEach(([key, value]) => session.set(key, value)); })
      }
    },
    scripting: { executeScript },
    tabs: {
      onUpdated: { addListener: vi.fn() },
      sendMessage,
      query: vi.fn().mockResolvedValue([{ id: 123 }, { id: 456 }])
    }
  } as unknown as MockChrome;
  return mock;
}

async function loadWorker(mock: MockChrome) {
  vi.resetModules();
  vi.stubGlobal("chrome", mock);
  return import("../src/background/service-worker");
}

describe("service worker tab lifecycle", () => {
  let mock: MockChrome;

  beforeEach(() => { mock = createChromeMock(); });

  it("enables an explicit tab before injecting and initializes it", async () => {
    const worker = await loadWorker(mock);
    const response = await worker.routeMessage({ type: MESSAGE_TYPES.ENABLE, tabId: 123 }, {} as chrome.runtime.MessageSender);
    expect(response).toMatchObject({ ok: true, tabId: 123, enabled: true });
    expect(mock.__session.get("tabState:123")).toMatchObject({ enabled: true });
    expect(mock.__executeScript).toHaveBeenCalledWith({ target: { tabId: 123 }, files: ["content.js"] });
    expect(mock.__sendMessage).toHaveBeenCalledWith(123, expect.objectContaining({ type: MESSAGE_TYPES.INIT, tabId: 123 }));
  });

  it("disables the explicit tab even when sender.tab is absent", async () => {
    const worker = await loadWorker(mock);
    await worker.routeMessage({ type: MESSAGE_TYPES.ENABLE, tabId: 123 }, {} as chrome.runtime.MessageSender);
    const response = await worker.routeMessage({ type: MESSAGE_TYPES.DISABLE, tabId: 123 }, {} as chrome.runtime.MessageSender);
    expect(response).toMatchObject({ ok: true, tabId: 123, enabled: false });
    expect(mock.__sendMessage).toHaveBeenLastCalledWith(123, { type: MESSAGE_TYPES.DISABLE, tabId: 123 });
    expect(mock.__session.get("tabState:123")).toMatchObject({ enabled: false });
  });

  it("rolls back the session flag when injection fails", async () => {
    mock.__executeScript.mockRejectedValueOnce(new Error("blocked"));
    const worker = await loadWorker(mock);
    const response = await worker.routeMessage({ type: MESSAGE_TYPES.ENABLE, tabId: 123 }, {} as chrome.runtime.MessageSender);
    expect(response).toMatchObject({ ok: false, enabled: false });
    expect(mock.__session.get("tabState:123")).toMatchObject({ enabled: false });
  });

  it("keeps tab state isolated while sharing global level settings", async () => {
    const worker = await loadWorker(mock);
    await worker.routeMessage({ type: MESSAGE_TYPES.ENABLE, tabId: 123 }, {} as chrome.runtime.MessageSender);
    await worker.routeMessage({ type: MESSAGE_TYPES.ENABLE, tabId: 456 }, {} as chrome.runtime.MessageSender);
    await worker.routeMessage({ type: MESSAGE_TYPES.SETTINGS_UPDATED, settings: { colors: { base: "#808080", red: "#F23645", green: "#4CAF50", orange: "#FF9800", cyan: "#00BCD4", blue: "#2962FF", purple: "#9C27B0", pink: "#E91E63" }, bandOpacity: 0.4, drawShortcut: { modifiers: ["Shift"], key: "A" }, deleteShortcut: { modifiers: ["Shift"], key: "D" }, levels: [{ ratio: 0.886, enabled: true, isCustom: true }] } }, {} as chrome.runtime.MessageSender);
    await worker.routeMessage({ type: MESSAGE_TYPES.DISABLE, tabId: 123 }, {} as chrome.runtime.MessageSender);
    expect(mock.__session.get("tabState:123")).toMatchObject({ enabled: false });
    expect(mock.__session.get("tabState:456")).toMatchObject({ enabled: true });
    const savedSettings = mock.__local.get("globalSettings") as { bandOpacity: number; levels: Array<{ ratio: number; enabled: boolean; isCustom: boolean }> };
    expect(savedSettings.bandOpacity).toBe(0.4);
    expect(savedSettings.levels.find((level) => level.ratio === 0.886)).toEqual({ ratio: 0.886, enabled: true, isCustom: true });
  });
});
