import type { ColorSettings, FibLevel, InteractionMode, Point, RulerMode } from "../../shared/types";

export interface RulerState {
  rulerMode: RulerMode;
  interactionMode: InteractionMode;
  pointA: Point | null;
  pointB: Point | null;
  levels: FibLevel[];
  colors: ColorSettings;
  bandOpacity: number;
}

export interface RulerCallbacks {
  onStateChange: (state: RulerState) => void;
  onDelete: () => void;
}
