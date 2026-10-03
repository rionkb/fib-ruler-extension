import { createDefaultSettings, createDefaultTabState } from "../shared/defaults";
import { MESSAGE_TYPES } from "../shared/messages";
import { isEditableTarget, matchesShortcut } from "../shared/shortcut";
import { loadSettings, loadTabState, saveTabState } from "../shared/storage";
import type { GlobalSettings, Point, TabState } from "../shared/types";
import { FibRuler } from "./ruler/FibRuler";
import { createRenderTargets } from "./ruler/renderer";
import type { RulerState } from "./ruler/types";

const HOST_ID = "fib-ruler-shadow-host";
let ruler: FibRuler | null = null;
let settings: GlobalSettings = createDefaultSettings();
let tabState: TabState = createDefaultTabState();
let shadowRoot: ShadowRoot | null = null;
let svg: SVGSVGElement | null = null;

void start();

async function start(): Promise<void> {
  if (document.getElementById(HOST_ID)) return;
  try {
    settings = await loadSettings();
    const existing = await loadTabState(await getTabId());
    tabState = existing;
    createOverlay();
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => { void handleMessage(message).then(sendResponse).catch((error: unknown) => sendResponse({ error: error instanceof Error ? error.message : "処理に失敗しました" })); return true; });
    document.addEventListener("keydown", handleKeydown, true);
    document.addEventListener("pointerdown", handleDocumentPointerDown, true);
    document.addEventListener("pointermove", handleDocumentPointerMove, true);
    document.addEventListener("pointerup", handleDocumentPointerUp, true);
    document.addEventListener("keyup", handleKeyup, true);
    window.addEventListener("resize", handleResize);
  } catch (error) { console.warn("Fib Ruler could not start", error); }
}

function createOverlay(): void {
  const host = document.createElement("div"); host.id = HOST_ID; host.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none;";
  shadowRoot = host.attachShadow({ mode: "closed" });
  const style = document.createElement("style"); style.textContent = `:host{all:initial}svg{position:fixed;inset:0;width:100vw;height:100vh;overflow:visible;pointer-events:none}line.level-line{stroke-width:1.5}line#diagonal{stroke:#808080;stroke-width:12;stroke-opacity:0;pointer-events:auto}circle{stroke:#2962FF;stroke-width:2;fill:transparent;pointer-events:auto;cursor:grab}.level-label{font:12px Arial,sans-serif;paint-order:stroke;stroke:#fff;stroke-width:3px;stroke-opacity:.8;pointer-events:none}`;
  shadowRoot.append(style); svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("aria-hidden", "true"); shadowRoot.append(svg); document.documentElement.append(host);
  const targets = createRenderTargets(svg);
  const initial: RulerState = { rulerMode: tabState.hasPlacedRuler && tabState.pointA && tabState.pointB ? "Placed" : "Idle", interactionMode: tabState.interactionMode, pointA: tabState.pointA, pointB: tabState.pointB, levels: tabState.levels, colors: settings.colors, bandOpacity: settings.bandOpacity };
  ruler = new FibRuler(initial, targets, { onStateChange: (state) => { if (state.rulerMode === "Drawing") return; tabState = { ...tabState, pointA: state.pointA, pointB: state.pointB, hasPlacedRuler: state.rulerMode === "Placed", interactionMode: state.interactionMode, levels: state.levels }; void saveCurrentState(); }, onDelete: () => { tabState = { ...tabState, pointA: null, pointB: null, hasPlacedRuler: false }; void saveCurrentState(); } });
  svg.addEventListener("fib-ruler-level-menu", (event) => openLevelMenu((event as CustomEvent).detail));
}

async function handleMessage(message: { type?: string; settings?: GlobalSettings }): Promise<{ ok: boolean; state?: TabState }> {
  if (!ruler) return { ok: false };
  if (message.type === MESSAGE_TYPES.SETTINGS_UPDATED && message.settings) { settings = message.settings; ruler.setSettings(settings.colors, settings.bandOpacity, settings.levels); return { ok: true }; }
  if (message.type === MESSAGE_TYPES.GET_TAB_STATE) return { ok: true, state: tabState };
  if (message.type === MESSAGE_TYPES.DISABLE) { dispose(); return { ok: true }; }
  return { ok: true };
}

function handleKeydown(event: KeyboardEvent): void { if (!ruler) return; const editable = isEditableTarget(event); if (!editable && matchesShortcut(event, settings.drawShortcut)) { event.preventDefault(); event.stopPropagation(); ruler.arm(); return; } if (!editable && matchesShortcut(event, settings.deleteShortcut)) { event.preventDefault(); event.stopPropagation(); ruler.delete(); return; } if (matchesShortcut(event, { modifiers: ["Ctrl", "Alt"], key: "F" })) { event.preventDefault(); event.stopPropagation(); const nextMode = tabState.interactionMode === "EDIT" ? "LOCK" : "EDIT"; ruler.setInteractionMode(nextMode); tabState.interactionMode = nextMode; void saveCurrentState(); return; } if (!editable && event.key === "Escape") ruler.cancelDrawing(); }
function handleKeyup(_event: KeyboardEvent): void { /* Armed intentionally does not require holding Shift. */ }
function handleDocumentPointerDown(event: PointerEvent): void { if (!ruler || event.button !== 0 || isOverlayTarget(event)) return; const mode = ruler.getState().rulerMode; if (mode === "Armed") { event.preventDefault(); event.stopPropagation(); ruler.pointerDown({ x: event.clientX, y: event.clientY }); } }
function handleDocumentPointerMove(event: PointerEvent): void { if (!ruler) return; if (ruler.getState().rulerMode === "Drawing") event.preventDefault(); ruler.pointerMove({ x: event.clientX, y: event.clientY }); }
function handleDocumentPointerUp(event: PointerEvent): void { if (!ruler) return; if (ruler.getState().rulerMode === "Drawing") event.preventDefault(); ruler.pointerUp({ x: event.clientX, y: event.clientY }); }
function handleResize(): void { /* Coordinates are viewport pixels; resize only requires repainting the SVG. */ if (ruler) ruler.setSettings(settings.colors, settings.bandOpacity, settings.levels); }
function isOverlayTarget(event: Event): boolean { return event.composedPath().some((node) => node instanceof SVGElement && node.ownerSVGElement === svg); }
function openLevelMenu(detail: { x: number; y: number; levels: TabState["levels"] }): void { if (!shadowRoot || !ruler) return; const menu = document.createElement("div"); menu.style.cssText = `position:fixed;left:${detail.x}px;top:${detail.y}px;background:#fff;color:#111;padding:8px;border:1px solid #ccc;border-radius:4px;font:12px Arial;pointer-events:auto;`; detail.levels.forEach((level, index) => { const row = document.createElement("div"); const label = document.createElement("label"); const input = document.createElement("input"); input.type = "checkbox"; input.checked = level.enabled; input.onchange = () => { const next = ruler?.getState().levels.map((item, itemIndex) => itemIndex === index ? { ...item, enabled: input.checked } : item); if (next && ruler) ruler.setSettings(settings.colors, settings.bandOpacity, next); }; label.append(input, ` ${level.ratio.toFixed(3)}`); row.append(label); if (level.isCustom) { const remove = document.createElement("button"); remove.textContent = "×"; remove.setAttribute("aria-label", "Delete level"); remove.onclick = () => { const next = ruler?.getState().levels.filter((_item, itemIndex) => itemIndex !== index); if (next && ruler) ruler.setSettings(settings.colors, settings.bandOpacity, next); menu.remove(); }; row.append(remove); } menu.append(row); }); const add = document.createElement("button"); add.textContent = "Add"; add.onclick = () => { const raw = prompt("Level"); const value = raw === null ? NaN : Number(raw); if (Number.isFinite(value) && !detail.levels.some((level) => Math.abs(level.ratio - value) < 0.0005)) { const next = [...detail.levels, { ratio: Math.round(value * 1000) / 1000, enabled: true, isCustom: true }]; ruler?.setSettings(settings.colors, settings.bandOpacity, next); } menu.remove(); }; menu.append(add); shadowRoot.append(menu); }
async function saveCurrentState(): Promise<void> { try { await saveTabState(await getTabId(), tabState); } catch (error) { console.warn("Fib Ruler state could not be saved", error); } }
async function getTabId(): Promise<number> { const response = await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.GET_TAB_STATE }); return typeof response?.tabId === "number" ? response.tabId : 0; }
function dispose(): void { document.removeEventListener("keydown", handleKeydown, true); document.removeEventListener("pointerdown", handleDocumentPointerDown, true); document.removeEventListener("pointermove", handleDocumentPointerMove, true); document.removeEventListener("pointerup", handleDocumentPointerUp, true); document.removeEventListener("keyup", handleKeyup, true); window.removeEventListener("resize", handleResize); document.getElementById(HOST_ID)?.remove(); ruler = null; shadowRoot = null; svg = null; }
