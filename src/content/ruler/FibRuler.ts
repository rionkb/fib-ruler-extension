import type { FibLevel, Point } from "../../shared/types";
import type { RulerCallbacks, RulerState } from "./types";
import { render } from "./renderer";
import type { RenderTargets } from "./renderer";

export class FibRuler {
  private state: RulerState;
  private readonly targets: RenderTargets;
  private readonly callbacks: RulerCallbacks;
  private drawingStart: Point | null = null;
  private previewPoint: Point | null = null;
  private dragKind: "A" | "B" | "whole" | null = null;
  private dragOffset: Point = { x: 0, y: 0 };

  constructor(initial: RulerState, targets: RenderTargets, callbacks: RulerCallbacks) {
    this.state = { ...initial, levels: initial.levels.map((level) => ({ ...level })) };
    this.targets = targets; this.callbacks = callbacks;
    this.bindPointerEvents(); this.repaint();
  }

  getState(): RulerState { return { ...this.state, pointA: this.state.pointA && { ...this.state.pointA }, pointB: this.state.pointB && { ...this.state.pointB }, levels: this.state.levels.map((level) => ({ ...level })) }; }
  setSettings(colors: RulerState["colors"], bandOpacity: number, levels: FibLevel[]): void { this.state.colors = colors; this.state.bandOpacity = bandOpacity; this.state.levels = levels.map((level) => ({ ...level })); this.repaint(); }
  setInteractionMode(mode: RulerState["interactionMode"]): void { this.state.interactionMode = mode; this.repaint(); }
  arm(): void { if (this.state.interactionMode !== "EDIT") return; this.state.rulerMode = "Armed"; this.repaint(); }
  cancelDrawing(): void { if (this.state.rulerMode !== "Drawing" && this.state.rulerMode !== "Armed") return; this.drawingStart = null; this.previewPoint = null; this.state.rulerMode = this.state.pointA && this.state.pointB ? "Placed" : "Idle"; this.state.pointA = this.state.rulerMode === "Placed" ? this.state.pointA : null; this.state.pointB = this.state.rulerMode === "Placed" ? this.state.pointB : null; this.repaint(); }
  delete(): void { if (this.state.interactionMode !== "EDIT") return; this.state.pointA = null; this.state.pointB = null; this.state.rulerMode = "Idle"; this.repaint(); this.callbacks.onDelete(); }
  pointerDown(point: Point): void { if (this.state.interactionMode !== "EDIT") return; if (this.state.rulerMode === "Armed") { this.drawingStart = point; this.previewPoint = point; this.state.rulerMode = "Drawing"; this.repaint(); } }
  pointerMove(point: Point): void { if (this.state.rulerMode === "Drawing") { this.previewPoint = point; this.repaint(); } }
  pointerUp(point: Point): void { if (this.state.rulerMode !== "Drawing" || !this.drawingStart) return; this.state.pointA = this.drawingStart; this.state.pointB = point; this.state.rulerMode = "Placed"; this.drawingStart = null; this.previewPoint = null; this.repaint(); this.callbacks.onStateChange(this.getState()); }

  private bindPointerEvents(): void {
    this.targets.pointA.addEventListener("pointerdown", (event) => this.beginDrag(event, "A"));
    this.targets.pointB.addEventListener("pointerdown", (event) => this.beginDrag(event, "B"));
    this.targets.diagonal.addEventListener("pointerdown", (event) => this.beginDrag(event, "whole"));
    this.targets.svg.addEventListener("contextmenu", (event) => { if (this.state.rulerMode === "Placed" && this.state.interactionMode === "EDIT") { event.preventDefault(); this.showLevelMenu(event.clientX, event.clientY); } });
  }

  private beginDrag(event: PointerEvent, kind: "A" | "B" | "whole"): void {
    if (this.state.interactionMode !== "EDIT") return;
    event.preventDefault(); event.stopPropagation(); this.dragKind = kind;
    const point = this.pointFromEvent(event);
    const a = this.state.pointA; const b = this.state.pointB;
    if (kind === "whole" && a && b) this.dragOffset = { x: point.x - a.x, y: point.y - a.y };
    (event.currentTarget as SVGElement).setPointerCapture(event.pointerId);
    const target = event.currentTarget as SVGElement;
    const move = (moveEvent: PointerEvent) => this.drag(moveEvent);
    const end = (upEvent: PointerEvent) => { this.finishDrag(upEvent); target.removeEventListener("pointermove", move); target.removeEventListener("pointerup", end); };
    target.addEventListener("pointermove", move); target.addEventListener("pointerup", end);
  }
  private drag(event: PointerEvent): void {
    const point = this.pointFromEvent(event); const a = this.state.pointA; const b = this.state.pointB;
    if (!a || !b || !this.dragKind) return;
    if (this.dragKind === "A") this.state.pointA = point;
    if (this.dragKind === "B") this.state.pointB = point;
    if (this.dragKind === "whole") { const dx = point.x - this.dragOffset.x - a.x; const dy = point.y - this.dragOffset.y - a.y; this.state.pointA = { x: a.x + dx, y: a.y + dy }; this.state.pointB = { x: b.x + dx, y: b.y + dy }; }
    this.repaint();
  }
  private finishDrag(_event: PointerEvent): void { if (this.dragKind) this.callbacks.onStateChange(this.getState()); this.dragKind = null; }
  private pointFromEvent(event: PointerEvent): Point { return { x: event.clientX, y: event.clientY }; }
  private repaint(): void { const previewState = this.state.rulerMode === "Drawing" && this.drawingStart && this.previewPoint ? { ...this.state, pointA: this.drawingStart, pointB: this.previewPoint } : this.state; render(this.targets, previewState); this.callbacks.onStateChange(this.getState()); }

  private showLevelMenu(x: number, y: number): void {
    const event = new CustomEvent("fib-ruler-level-menu", { detail: { x, y, levels: this.getState().levels }, bubbles: true, composed: true });
    this.targets.svg.dispatchEvent(event);
  }
}
