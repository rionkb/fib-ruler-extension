export type RulerMode = "Idle" | "Armed" | "Drawing" | "Placed";
export type InteractionMode = "EDIT" | "LOCK";

export interface Point {
  x: number;
  y: number;
}

export interface FibLevel {
  ratio: number;
  enabled: boolean;
  isCustom: boolean;
}

export interface Shortcut {
  modifiers: string[];
  key: string;
}

export interface ColorSettings {
  base: string;
  red: string;
  green: string;
  orange: string;
  cyan: string;
  blue: string;
  purple: string;
  pink: string;
}

export interface GlobalSettings {
  colors: ColorSettings;
  bandOpacity: number;
  drawShortcut: Shortcut;
  deleteShortcut: Shortcut;
  levels: FibLevel[];
}

export interface TabState {
  enabled: boolean;
  pointA: Point | null;
  pointB: Point | null;
  hasPlacedRuler: boolean;
  interactionMode: InteractionMode;
}

export interface SerializedTabState extends TabState {
  tabId: number;
}

export interface StatusResponse {
  enabled: boolean;
  state?: TabState;
  error?: string;
}
