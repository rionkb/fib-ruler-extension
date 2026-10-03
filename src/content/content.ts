import { createDefaultSettings, createDefaultTabState } from "../shared/defaults";
import { MESSAGE_TYPES } from "../shared/messages";
import type { ExtensionMessage, MessageResponse } from "../shared/messages";
import { mergeSettings, mergeTabState } from "../shared/storage";
import { isEditableTarget, matchesShortcut } from "../shared/shortcut";
import type { GlobalSettings, Point, TabState } from "../shared/types";
import { FibRuler } from "./ruler/FibRuler";
import { createRenderTargets } from "./ruler/renderer";
import type { RulerState } from "./ruler/types";

const HOST_ID = "fib-ruler-shadow-host";
let ruler: FibRuler | null = null;
let settings: GlobalSettings = createDefaultSettings();
let tabState: TabState = createDefaultTabState();
let currentTabId: number | null = null;
let shadowRoot: ShadowRoot | null = null;
let svg: SVGSVGElement | null = null;

const onRuntimeMessage = (message: ExtensionMessage, _sender: chrome.runtime.MessageSender, sendResponse: (response: MessageResponse) => void): true => {
  void handleMessage(message).then(sendResponse).catch((error: unknown) => sendResponse({ ok: false, error: error instanceof Error ? error.message : "処理に失敗しました" }));
  return true;
};

start();

function start(): void {
  if (document.getElementById(HOST_ID)) return;
  // Keep one stable function reference so Disable can fully detach this script instance.
  chrome.runtime.onMessage.addListener(onRuntimeMessage);
}

async function handleMessage(message: ExtensionMessage): Promise<MessageResponse> {
  if (message.type === MESSAGE_TYPES.INIT) {
    currentTabId = message.tabId;
    tabState = mergeTabState(message.state);
    settings = mergeSettings(message.settings);
    const initial: RulerState = { rulerMode: tabState.hasPlacedRuler && tabState.pointA && tabState.pointB ? "Placed" : "Idle", interactionMode: tabState.interactionMode, pointA: tabState.pointA, pointB: tabState.pointB, levels: settings.levels, colors: settings.colors, bandOpacity: settings.bandOpacity };
    if (!ruler) createOverlay(initial);
    else { ruler.setInteractionMode(initial.interactionMode); ruler.setSettings(initial.colors, initial.bandOpacity, initial.levels); }
    return { ok: true, tabId: currentTabId, enabled: true, state: tabState };
  }
  if (message.type === MESSAGE_TYPES.SETTINGS_UPDATED) {
    settings = mergeSettings(message.settings);
    if (ruler) ruler.setSettings(settings.colors, settings.bandOpacity, settings.levels);
    return { ok: true };
  }
  if (message.type === MESSAGE_TYPES.DISABLE) {
    dispose();
    return { ok: true, tabId: message.tabId, enabled: false };
  }
  return { ok: false, error: "このContent Scriptでは扱えないメッセージです" };
}

function createOverlay(initial: RulerState): void {
  const host = document.createElement("div"); host.id = HOST_ID; host.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none;";
  shadowRoot = host.attachShadow({ mode: "closed" });
  const style = document.createElement("style"); style.textContent = `:host{all:initial}svg{position:fixed;inset:0;width:100vw;height:100vh;overflow:visible;pointer-events:none}line.level-line{stroke-width:1.5}line#diagonal{stroke:#808080;stroke-width:12;stroke-opacity:0;pointer-events:auto}circle{stroke:#2962FF;stroke-width:2;fill:transparent;pointer-events:auto;cursor:grab}.level-label{font:12px Arial,sans-serif;paint-order:stroke;stroke:#fff;stroke-width:3px;stroke-opacity:.8;pointer-events:none}`;
  shadowRoot.append(style); svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("aria-hidden", "true"); shadowRoot.append(svg); document.documentElement.append(host);
  const targets = createRenderTargets(svg);
  ruler = new FibRuler(initial, targets, { onStateChange: (state) => { if (state.rulerMode === "Drawing") return; tabState = { ...tabState, pointA: state.pointA, pointB: state.pointB, hasPlacedRuler: state.rulerMode === "Placed", interactionMode: state.interactionMode }; void sendTabState(); }, onDelete: () => { tabState = { ...tabState, pointA: null, pointB: null, hasPlacedRuler: false }; void sendTabState(); } });
  svg.addEventListener("fib-ruler-level-menu", (event) => openLevelMenu((event as CustomEvent).detail));
  document.addEventListener("keydown", handleKeydown, true);
  document.addEventListener("pointerdown", handleDocumentPointerDown, true);
  document.addEventListener("pointermove", handleDocumentPointerMove, true);
  document.addEventListener("pointerup", handleDocumentPointerUp, true);
  document.addEventListener("keyup", handleKeyup, true);
  window.addEventListener("resize", handleResize);
}

function handleKeydown(event: KeyboardEvent): void { if (!ruler) return; const editable = isEditableTarget(event); if (!editable && matchesShortcut(event, settings.drawShortcut)) { event.preventDefault(); event.stopPropagation(); ruler.arm(); return; } if (!editable && matchesShortcut(event, settings.deleteShortcut)) { event.preventDefault(); event.stopPropagation(); ruler.delete(); return; } if (matchesShortcut(event, { modifiers: ["Ctrl", "Alt"], key: "F" })) { event.preventDefault(); event.stopPropagation(); const nextMode = tabState.interactionMode === "EDIT" ? "LOCK" : "EDIT"; ruler.setInteractionMode(nextMode); tabState.interactionMode = nextMode; void sendTabState(); return; } if (!editable && event.key === "Escape") ruler.cancelDrawing(); }
function handleKeyup(_event: KeyboardEvent): void { /* Armed intentionally does not require holding Shift. */ }
function handleDocumentPointerDown(event: PointerEvent): void { if (!ruler || event.button !== 0 || isOverlayTarget(event)) return; if (ruler.getState().rulerMode === "Armed") { event.preventDefault(); event.stopPropagation(); ruler.pointerDown({ x: event.clientX, y: event.clientY }); } }
function handleDocumentPointerMove(event: PointerEvent): void { if (!ruler) return; if (ruler.getState().rulerMode === "Drawing") event.preventDefault(); ruler.pointerMove({ x: event.clientX, y: event.clientY }); }
function handleDocumentPointerUp(event: PointerEvent): void { if (!ruler) return; if (ruler.getState().rulerMode === "Drawing") event.preventDefault(); ruler.pointerUp({ x: event.clientX, y: event.clientY }); }
function handleResize(): void { if (ruler) ruler.setSettings(settings.colors, settings.bandOpacity, settings.levels); }
function isOverlayTarget(event: Event): boolean { return event.composedPath().some((node) => node instanceof SVGElement && node.ownerSVGElement === svg); }

function openLevelMenu(detail: { x: number; y: number; levels: GlobalSettings["levels"] }): void {
  if (!shadowRoot || !ruler) return;
  shadowRoot.querySelector("[data-fib-level-menu]")?.remove();
  const menu = document.createElement("div"); menu.dataset.fibLevelMenu = "true"; menu.style.cssText = `position:fixed;left:${detail.x}px;top:${detail.y}px;background:#fff;color:#111;padding:8px;border:1px solid #ccc;border-radius:4px;font:12px Arial;pointer-events:auto;`;
  detail.levels.forEach((level, index) => { const row = document.createElement("div"); const label = document.createElement("label"); const input = document.createElement("input"); input.type = "checkbox"; input.checked = level.enabled; input.onchange = () => { const next = ruler?.getState().levels.map((item, itemIndex) => itemIndex === index ? { ...item, enabled: input.checked } : item); if (next) updateLevels(next); }; label.append(input, ` ${level.ratio.toFixed(3)}`); row.append(label); if (level.isCustom) { const remove = document.createElement("button"); remove.textContent = "×"; remove.setAttribute("aria-label", "Delete level"); remove.onclick = () => { const next = ruler?.getState().levels.filter((_item, itemIndex) => itemIndex !== index); if (next) updateLevels(next); menu.remove(); }; row.append(remove); } menu.append(row); });
  const add = document.createElement("button"); add.textContent = "Add"; add.onclick = () => { const raw = prompt("Level"); const value = raw === null ? NaN : Number(raw); const currentLevels = ruler?.getState().levels ?? []; if (Number.isFinite(value) && !currentLevels.some((level) => Math.abs(level.ratio - value) < 0.0005)) updateLevels([...currentLevels, { ratio: Math.round(value * 1000) / 1000, enabled: true, isCustom: true }]); menu.remove(); }; menu.append(add); shadowRoot.append(menu);
}

function updateLevels(levels: GlobalSettings["levels"]): void { settings = { ...settings, levels }; ruler?.setSettings(settings.colors, settings.bandOpacity, settings.levels); void sendSettingsUpdate(); }
async function sendSettingsUpdate(): Promise<void> { try { await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.SETTINGS_UPDATED, settings }); } catch (error) { console.warn("Fib Ruler settings could not be saved", error); } }
async function sendTabState(): Promise<void> { if (currentTabId === null) return; try { await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.SET_TAB_STATE, tabId: currentTabId, state: { pointA: tabState.pointA, pointB: tabState.pointB, hasPlacedRuler: tabState.hasPlacedRuler, interactionMode: tabState.interactionMode } }); } catch (error) { console.warn("Fib Ruler state could not be saved", error); } }

function dispose(): void { chrome.runtime.onMessage.removeListener(onRuntimeMessage); document.removeEventListener("keydown", handleKeydown, true); document.removeEventListener("pointerdown", handleDocumentPointerDown, true); document.removeEventListener("pointermove", handleDocumentPointerMove, true); document.removeEventListener("pointerup", handleDocumentPointerUp, true); document.removeEventListener("keyup", handleKeyup, true); window.removeEventListener("resize", handleResize); document.getElementById(HOST_ID)?.remove(); ruler = null; shadowRoot = null; svg = null; currentTabId = null; }
