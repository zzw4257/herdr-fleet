// DOWNSTREAM (FORK.toml preview-panel). The preview panel's state, outside React, so the Chat prose,
// the mirror, a Chat picture and a command can all open it without a provider threaded through
// Collie's components.
//
// Two stores. The PANEL: open or not, which tab, the loopback address the Browser tab shows, and a
// picture picked from Chat for the Screen tab (null follows the newest). It is per device and kept in
// localStorage as a convenience; a store that cannot be read starts closed. The SCREENS: each Pane's
// newest picture, published from the Chat window the Pane page already holds, so the Screen tab
// costs no read of its own.

import { useEffect, useMemo, useSyncExternalStore } from "react";

import { paneScopeKey, type Scope } from "./scope";
import type { TranscriptEntry } from "./types";

export type PreviewTab = "screen" | "browser";

export interface PreviewState {
  readonly open: boolean;
  readonly tab: PreviewTab;
  /** What the Browser tab shows, as the agent wrote it (`http://localhost:5173/`). */
  readonly address: string;
  /** A picture picked from Chat for the Screen tab; null follows the Pane's newest. */
  readonly picked: string | null;
  /** The panel's width on a wide screen, in CSS pixels. */
  readonly width: number;
}

const STORAGE_KEY = "fleet:preview:v1";
export const PREVIEW_WIDTH = { min: 360, max: 1400, default: 640 } as const;
const CLOSED: PreviewState = { open: false, tab: "screen", address: "", picked: null, width: PREVIEW_WIDTH.default };

function clampWidth(width: number): number {
  return Math.round(Math.min(PREVIEW_WIDTH.max, Math.max(PREVIEW_WIDTH.min, width)));
}

function load(): PreviewState {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (raw === null || raw === undefined) return CLOSED;
    // SAFETY: this device's own record; each field is narrowed below before it is believed.
    const saved = JSON.parse(raw) as Partial<Record<keyof PreviewState, string | number | boolean | null>>;
    return {
      open: saved.open === true,
      tab: saved.tab === "browser" ? "browser" : "screen",
      // oxlint-disable-next-line anti-slop/no-runtime-typeof -- parse boundary (ADR 0019's class): this device's stored preview record.
      address: typeof saved.address === "string" ? saved.address : "",
      picked: null,
      // oxlint-disable-next-line anti-slop/no-runtime-typeof -- parse boundary (ADR 0019's class): as above.
      width: typeof saved.width === "number" ? clampWidth(saved.width) : PREVIEW_WIDTH.default,
    };
  } catch {
    return CLOSED;
  }
}

let state: PreviewState = load();
const listeners = new Set<() => void>();
let hosts = 0;

function set(next: Partial<PreviewState>): void {
  state = { ...state, ...next };
  try {
    const { open, tab, address, width } = state;
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify({ open, tab, address, width }));
  } catch {
    // A device that keeps nothing still has a panel for this page's life.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePreview(): PreviewState {
  return useSyncExternalStore(subscribe, () => state, () => CLOSED);
}

export function openPreview(next: { tab: PreviewTab; address?: string; picked?: string | null }): void {
  set({ open: true, tab: next.tab, address: next.address ?? state.address, picked: next.picked ?? null });
}

export function closePreview(): void {
  set({ open: false, picked: null });
}

export function togglePreview(): void {
  if (state.open) closePreview();
  else set({ open: true });
}

export function setPreviewTab(tab: PreviewTab): void {
  set({ tab });
}

export function setPreviewAddress(address: string): void {
  set({ address });
}

export function followLatestScreen(): void {
  set({ picked: null });
}

export function setPreviewWidth(width: number): void {
  set({ width: clampWidth(width) });
}

/** The panel says it is on screen, so a link may open it rather than a new tab. */
export function registerPreviewHost(): () => void {
  hosts += 1;
  return () => {
    hosts -= 1;
  };
}

export function previewHostMounted(): boolean {
  return hosts > 0;
}

/**
 * What the Browser tab's address field accepts, as an address: `5173`, `localhost:5173/x` or a full
 * URL. A scheme-less entry is http, which is what a dev server speaks.
 */
export function normalizeAddress(input: string): string {
  const trimmed = input.trim();
  if (/^\d{2,5}$/u.test(trimmed)) return `http://localhost:${trimmed}/`;
  if (trimmed !== "" && !/^[a-z][a-z0-9+.-]*:\/\//iu.test(trimmed)) return `http://${trimmed}`;
  return trimmed;
}

// ── Screens ────────────────────────────────────────────────────────────────────────────────────────

export interface Screen {
  readonly url: string;
  readonly ts?: string;
}

const screens = new Map<string, Screen>();
const screenListeners = new Set<() => void>();

/** The newest picture of a session window: a tool's screenshot or a picture part, last turn first. */
export function latestScreen(entries: readonly TranscriptEntry[]): Screen | null {
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i]!;
    for (let j = entry.parts.length - 1; j >= 0; j--) {
      const part = entry.parts[j]!;
      const url = part.kind === "image" ? part.url : part.kind === "tool" ? part.result?.imageUrl : undefined;
      if (url !== undefined && url !== "") return entry.ts ? { url, ts: entry.ts } : { url };
    }
  }
  return null;
}

/** Publish a Pane's newest picture under its scope key. Unchanged pictures notify nobody. */
export function publishScreen(key: string, screen: Screen | null): void {
  const held = screens.get(key);
  if (screen === null || (held !== undefined && held.url === screen.url)) return;
  screens.set(key, screen);
  for (const listener of screenListeners) listener();
}

function subscribeScreens(listener: () => void): () => void {
  screenListeners.add(listener);
  return () => {
    screenListeners.delete(listener);
  };
}

export function useLatestScreen(key: string | null): Screen | null {
  return useSyncExternalStore(
    subscribeScreens,
    () => (key === null ? null : (screens.get(key) ?? null)),
    () => null,
  );
}

/**
 * The Pane page's one call (FORK.toml native-pane-page-port): publish the newest picture of the session
 * window it already holds, so the Screen tab follows it without a read of its own.
 */
export function useFleetScreenFeed(paneId: string, scope: Scope | undefined, entries: readonly TranscriptEntry[]): void {
  const key = paneScopeKey(scope, paneId);
  const screen = useMemo(() => latestScreen(entries), [entries]);
  useEffect(() => publishScreen(key, screen), [key, screen]);
}
