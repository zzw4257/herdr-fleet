import { beforeEach, describe, expect, it } from "vitest";

import {
  closePreview,
  latestScreen,
  normalizeAddress,
  openPreview,
  setPreviewWidth,
  togglePreview,
  usePreview,
  PREVIEW_WIDTH,
} from "./fleet-preview";
import type { TranscriptEntry } from "./types";
import { renderHook, act } from "@testing-library/react";

const PNG = "data:image/png;base64,iVBORw0KGgo=";
const JPG = "data:image/jpeg;base64,/9j/4AAQ";

function entry(uuid: string, parts: TranscriptEntry["parts"]): TranscriptEntry {
  return { uuid, ts: `2026-10-21T01:00:0${uuid}.000Z`, role: "assistant", parts };
}

describe("normalizeAddress", () => {
  it("reads a bare port, a scheme-less host and a full URL", () => {
    expect(normalizeAddress("5173")).toBe("http://localhost:5173/");
    expect(normalizeAddress(" localhost:3000/app ")).toBe("http://localhost:3000/app");
    expect(normalizeAddress("http://127.0.0.1:8000/x")).toBe("http://127.0.0.1:8000/x");
    expect(normalizeAddress("")).toBe("");
  });
});

describe("latestScreen", () => {
  it("takes the newest picture, a tool's screenshot or a picture part", () => {
    const entries = [
      entry("1", [{ kind: "image", url: PNG }]),
      entry("2", [{ kind: "tool", name: "screenshot", summary: "", id: "t", result: { text: "", imageUrl: JPG } }, { kind: "text", text: "done" }]),
      entry("3", [{ kind: "text", text: "no picture here" }]),
    ];
    expect(latestScreen(entries)).toEqual({ url: JPG, ts: "2026-10-21T01:00:02.000Z" });
    expect(latestScreen([entry("1", [{ kind: "text", text: "x" }])])).toBeNull();
  });
});

describe("the panel's state", () => {
  beforeEach(() => closePreview());

  it("opens on a tab, toggles, and bounds its width", () => {
    const { result } = renderHook(() => usePreview());
    act(() => openPreview({ tab: "browser", address: "http://localhost:5173/" }));
    expect(result.current).toMatchObject({ open: true, tab: "browser", address: "http://localhost:5173/" });
    act(() => togglePreview());
    expect(result.current.open).toBe(false);
    act(() => setPreviewWidth(10));
    expect(result.current.width).toBe(PREVIEW_WIDTH.min);
  });
});
