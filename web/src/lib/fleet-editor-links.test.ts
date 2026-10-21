import { describe, expect, it } from "vitest";

import { editorFileHref, editorFolderHref, editorProxyHref, fleetPreviewHref } from "./fleet-editor-links";

const EDITOR = "https://code.example.com";

describe("editorProxyHref", () => {
  it("sends a loopback address with a port through the proxy, keeping path, query and fragment", () => {
    expect(editorProxyHref(EDITOR, "http://localhost:5173/app/?x=1#top")).toBe(`${EDITOR}/proxy/5173/app/?x=1#top`);
    expect(editorProxyHref(EDITOR, "http://127.0.0.1:8000")).toBe(`${EDITOR}/proxy/8000/`);
    expect(editorProxyHref(EDITOR, "http://0.0.0.0:3000/")).toBe(`${EDITOR}/proxy/3000/`);
    expect(editorProxyHref(EDITOR, "http://[::1]:4000/a")).toBe(`${EDITOR}/proxy/4000/a`);
  });

  it("leaves every other link alone", () => {
    expect(editorProxyHref(EDITOR, "https://example.com:8443/")).toBeNull();
    expect(editorProxyHref(EDITOR, "http://localhost/")).toBeNull();
    expect(editorProxyHref(EDITOR, "https://localhost:8443/")).toBeNull();
    expect(editorProxyHref(EDITOR, "mailto:a@example.com")).toBeNull();
    expect(editorProxyHref(EDITOR, "not a url")).toBeNull();
  });

  it("is off without an editor", () => {
    expect(fleetPreviewHref(null, "http://localhost:5173/")).toBe("http://localhost:5173/");
    expect(fleetPreviewHref(EDITOR, "https://example.com/")).toBe("https://example.com/");
    expect(fleetPreviewHref(EDITOR, "http://localhost:5173/")).toBe(`${EDITOR}/proxy/5173/`);
  });
});

describe("editor folder and file links", () => {
  it("opens a folder by the workbench's folder parameter", () => {
    const url = new URL(editorFolderHref(EDITOR, "/srv/proj"));
    expect(url.origin + url.pathname).toBe(`${EDITOR}/`);
    expect(url.searchParams.get("folder")).toBe("/srv/proj");
  });

  it("opens a file through the payload, on the editor's own authority, with its name encoded", () => {
    const url = new URL(editorFileHref(EDITOR, "/srv/proj", "/srv/proj/out/report #1.pdf"));
    expect(url.searchParams.get("folder")).toBe("/srv/proj");
    expect(JSON.parse(url.searchParams.get("payload") ?? "null")).toEqual([
      ["openFile", "vscode-remote://code.example.com/srv/proj/out/report%20%231.pdf"],
    ]);
  });
});
