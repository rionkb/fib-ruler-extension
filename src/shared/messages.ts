import type { GlobalSettings, TabState } from "./types";

export const MESSAGE_TYPES = {
  ENABLE: "ENABLE",
  DISABLE: "DISABLE",
  INIT: "INIT",
  GET_TAB_STATE: "GET_TAB_STATE",
  SET_TAB_STATE: "SET_TAB_STATE",
  SETTINGS_UPDATED: "SETTINGS_UPDATED",
  STATUS: "STATUS",
  ERROR: "ERROR"
} as const;

export type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];
export type TabStateUpdate = Omit<TabState, "enabled">;

export interface EnableMessage { type: typeof MESSAGE_TYPES.ENABLE; tabId: number; }
export interface DisableMessage { type: typeof MESSAGE_TYPES.DISABLE; tabId: number; }
export interface GetTabStateMessage { type: typeof MESSAGE_TYPES.GET_TAB_STATE; tabId: number; }
export interface InitMessage { type: typeof MESSAGE_TYPES.INIT; tabId: number; state: TabState; settings: GlobalSettings; }
export interface SetTabStateMessage { type: typeof MESSAGE_TYPES.SET_TAB_STATE; tabId: number; state: TabStateUpdate; }
export interface SettingsUpdatedMessage { type: typeof MESSAGE_TYPES.SETTINGS_UPDATED; settings: GlobalSettings; }
export interface StatusMessage { type: typeof MESSAGE_TYPES.STATUS; tabId: number; enabled: boolean; }
export interface ErrorMessage { type: typeof MESSAGE_TYPES.ERROR; message: string; }

export type ExtensionMessage = EnableMessage | DisableMessage | GetTabStateMessage | InitMessage | SetTabStateMessage | SettingsUpdatedMessage | StatusMessage | ErrorMessage;
export type PopupToWorkerMessage = EnableMessage | DisableMessage | GetTabStateMessage;
export type ContentToWorkerMessage = SetTabStateMessage | SettingsUpdatedMessage;
export type WorkerToContentMessage = InitMessage | DisableMessage | SettingsUpdatedMessage;

export interface MessageResponse {
  ok: boolean;
  enabled?: boolean;
  tabId?: number;
  state?: TabState;
  error?: string;
}
