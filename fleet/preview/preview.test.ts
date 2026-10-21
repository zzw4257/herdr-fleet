import { describe, expect, test } from "bun:test";

import type { JsonValue } from "../../bridge/json.ts";
import { previewFilesPath, previewHtmlResponse, PREVIEW_HTML_CSP } from "./html-route.ts";
import { widenPreviewPolicy } from "./policy.ts";

const COLLIE =
  "default-src 'self'; connect-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; " +
  "script-src 'self'; frame-ancestors 'none'; object-src 'none'";

function directive(policy: string, name: string): string | undefined {
  return policy.split("; ").find((part) => part.startsWith(`${name} `));
}

describe("widenPreviewPolicy", () => {
  test("adds frames and media from the page's own fallback, and the editor as a frame only", () => {
    const widened = widenPreviewPolicy(COLLIE, "https://code.example.com");
    expect(directive(widened, "frame-src")).toBe("frame-src 'self' blob: https://code.example.com");
    expect(directive(widened, "media-src")).toBe("media-src 'self' blob:");
    for (const kept of ["script-src 'self'", "connect-src 'self'", "object-src 'none'", "frame-ancestors 'none'"]) {
      expect(widened).toContain(kept);
    }
  });

  test("extends a directive already there, and leaves a sandboxed policy alone", () => {
    expect(directive(widenPreviewPolicy("default-src 'none'; frame-src 'none'", null), "frame-src")).toBe("frame-src 'self' blob:");
    expect(widenPreviewPolicy("default-src 'none'; sandbox", "https://code.example.com")).toBe("default-src 'none'; sandbox");
  });
});

describe("the sandboxed HTML preview", () => {
  const url = (query: string) => new URL(`https://fleet.example.com/fleet/api/preview/html?${query}`);
  const get = new Request("https://fleet.example.com/fleet/api/preview/html");

  test("asks Collie's own Files read, and only for an HTML name on the lead", () => {
    expect(previewFilesPath(url("pane=w1%3Ap2&path=out/report.html&session=s1"))).toBe(
      "/api/pane/w1%3Ap2/files?path=out%2Freport.html&session=s1",
    );
    expect(previewFilesPath(url("pane=p&path=notes.md"))).toBeNull();
    expect(previewFilesPath(url("pane=p&path=a.html&host=peer"))).toBeNull();
    expect(previewFilesPath(url("path=a.html"))).toBeNull();
  });

  test("serves the text as an opaque-origin document that may run scripts", async () => {
    const res = await previewHtmlResponse(get, url("pane=p&path=a.html"), async () =>
      Response.json({ available: true, binary: false, text: "<script>1</script>", root: "/r", path: "a.html" }),
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("<script>1</script>");
    expect(res.headers.get("content-security-policy")).toBe(PREVIEW_HTML_CSP);
    expect(PREVIEW_HTML_CSP.startsWith("sandbox allow-scripts")).toBe(true);
    expect(PREVIEW_HTML_CSP).not.toContain("allow-same-origin");
    expect(PREVIEW_HTML_CSP).not.toContain("connect-src");
    expect(res.headers.get("x-frame-options")).toBe("SAMEORIGIN");
  });

  test("anything but a readable text file is no preview", async () => {
    const answer = (body: JsonValue, status = 200) => async () => Response.json(body, { status });
    for (const read of [
      answer({ available: true, binary: true, text: "" }),
      answer({ available: false, reason: "no-folder" }),
      answer({ error: "unknown-path" }, 404),
    ]) {
      expect((await previewHtmlResponse(get, url("pane=p&path=a.html"), read)).status).toBe(404);
    }
    const post = new Request("https://fleet.example.com/x", { method: "POST" });
    expect((await previewHtmlResponse(post, url("pane=p&path=a.html"), answer({}))).status).toBe(405);
  });
});
