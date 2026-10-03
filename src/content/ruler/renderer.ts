import type { RulerState } from "./types";
import { calculateLevelY, visibleHorizontalRange } from "./geometry";

const SVG_NS = "http://www.w3.org/2000/svg";
const PALETTE = ["base", "red", "green", "orange", "cyan", "blue", "purple", "pink"] as const;

export interface RenderTargets {
  svg: SVGSVGElement;
  interactionLayer: SVGGElement;
  labelLayer: SVGGElement;
  bandLayer: SVGGElement;
  lineLayer: SVGGElement;
  diagonal: SVGLineElement;
  pointA: SVGCircleElement;
  pointB: SVGCircleElement;
}

export function createRenderTargets(svg: SVGSVGElement): RenderTargets {
  const bandLayer = svgGroup("bands");
  const lineLayer = svgGroup("lines");
  const labelLayer = svgGroup("labels");
  const interactionLayer = svgGroup("interactions");
  const diagonal = svgLine("diagonal");
  const pointA = svgCircle("point-a");
  const pointB = svgCircle("point-b");
  interactionLayer.append(diagonal, pointA, pointB);
  svg.append(bandLayer, lineLayer, labelLayer, interactionLayer);
  return { svg, interactionLayer, labelLayer, bandLayer, lineLayer, diagonal, pointA, pointB };
}

export function render(targets: RenderTargets, state: RulerState): void {
  for (const layer of [targets.bandLayer, targets.lineLayer, targets.labelLayer]) layer.replaceChildren();
  const a = state.pointA;
  const b = state.pointB;
  const hasRuler = a !== null && b !== null && (state.rulerMode === "Placed" || state.rulerMode === "Drawing");
  targets.svg.style.display = hasRuler || state.rulerMode === "Armed" ? "block" : "none";
  if (!a || !b || !hasRuler) return;
  const range = visibleHorizontalRange(a, b, window.innerWidth);
  const enabledLevels = state.levels.filter((level) => level.enabled);
  enabledLevels.forEach((level, index) => {
    const y = calculateLevelY(a.y, b.y, level.ratio);
    const color = state.colors[PALETTE[index % PALETTE.length] ?? "base"];
    const line = svgLine("level-line");
    line.setAttribute("x1", String(range.x)); line.setAttribute("x2", String(range.x + range.width));
    line.setAttribute("y1", String(y)); line.setAttribute("y2", String(y)); line.setAttribute("stroke", color);
    line.dataset.ratio = String(level.ratio);
    targets.lineLayer.append(line);
    const label = document.createElementNS(SVG_NS, "text");
    label.classList.add("level-label"); label.setAttribute("x", String(range.x + 4)); label.setAttribute("y", String(y - 4)); label.setAttribute("fill", color);
    label.textContent = level.ratio.toFixed(3);
    targets.labelLayer.append(label);
  });
  const ordered = enabledLevels.map((level) => calculateLevelY(a.y, b.y, level.ratio)).sort((left, right) => left - right);
  for (let index = 0; index < ordered.length - 1; index += 1) {
    const band = document.createElementNS(SVG_NS, "rect");
    const top = ordered[index]; const bottom = ordered[index + 1];
    if (top === undefined || bottom === undefined) continue;
    band.setAttribute("x", String(range.x)); band.setAttribute("y", String(Math.min(top, bottom))); band.setAttribute("width", String(range.width)); band.setAttribute("height", String(Math.abs(bottom - top))); band.setAttribute("fill", state.colors[PALETTE[index % PALETTE.length] ?? "base"]); band.setAttribute("fill-opacity", String(state.bandOpacity));
    targets.bandLayer.append(band);
  }
  setLine(targets.diagonal, a.x, a.y, b.x, b.y);
  setCircle(targets.pointA, a); setCircle(targets.pointB, b);
  const interactive = state.interactionMode === "EDIT";
  targets.interactionLayer.style.pointerEvents = interactive ? "auto" : "none";
  targets.lineLayer.style.pointerEvents = interactive ? "auto" : "none";
  targets.pointA.style.display = interactive ? "block" : "none";
  targets.pointB.style.display = interactive ? "block" : "none";
}

function svgGroup(name: string): SVGGElement { const element = document.createElementNS(SVG_NS, "g"); element.id = name; return element; }
function svgLine(name: string): SVGLineElement { const element = document.createElementNS(SVG_NS, "line"); element.id = name; return element; }
function svgCircle(name: string): SVGCircleElement { const element = document.createElementNS(SVG_NS, "circle"); element.id = name; return element; }
function setLine(element: SVGLineElement, x1: number, y1: number, x2: number, y2: number): void { element.setAttribute("x1", String(x1)); element.setAttribute("y1", String(y1)); element.setAttribute("x2", String(x2)); element.setAttribute("y2", String(y2)); }
function setCircle(element: SVGCircleElement, point: { x: number; y: number }): void { element.setAttribute("cx", String(point.x)); element.setAttribute("cy", String(point.y)); element.setAttribute("r", "6"); }
