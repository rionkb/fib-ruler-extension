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

export interface ExtensionMessage {
  type: MessageType;
  state?: unknown;
  settings?: unknown;
}
