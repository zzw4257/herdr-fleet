// An HTML file under a Pane's Files root, served as a document that may run its own scripts and can
// reach nothing of Fleet's (FORK.toml preview-panel).
//
// Collie's Files preview draws HTML in a frame with `sandbox=""`: no script runs, which is right for
// a page Collie must never trust and useless for the report or chart an agent just wrote. This route
// serves the same file, read through Collie's own Files read (the same root, containment and deny
// list; this module names no path of its own), under a policy whose first word is `sandbox
// allow-scripts`. The document therefore has an OPAQUE origin: no cookie, no storage, no credentialed
// request, nothing same-origin with Fleet, even though its URL is Fleet's. Its scripts may come from
// the page itself or from `https:` (a CDN chart library); `connect-src` is not granted at all.
//
// It is the lead's own Panes only. A member's file stays in Collie's script-less preview.

import type { JsonValue } from "../../bridge/json.ts";

export const FLEET_PREVIEW_HTML_PATH = "/fleet/api/preview/html";

export const PREVIEW_HTML_CSP =
  "sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox; default-src 'none'; " +
  "script-src 'unsafe-inline' 'unsafe-eval' https:; style-src 'unsafe-inline' https:; " +
  "img-src data: blob: https:; font-src data: https:; media-src data: blob: https:; " +
  "base-uri 'none'; form-action 'none'; frame-ancestors 'self'";

const HTML_NAME = /\.x?html?$/iu;

/** A GET to Collie through the Gateway's own authenticated proxy. */
export type CollieRead = (path: string) => Promise<Response>;

function refused(status: number, message: string): Response {
  return new Response(`${message}\n`, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-frame-options": "SAMEORIGIN" },
  });
}

/** The Files read this preview is, or null when the request is not one this route answers. */
export function previewFilesPath(url: URL): string | null {
  const pane = url.searchParams.get("pane");
  const path = url.searchParams.get("path");
  if (pane === null || pane === "" || path === null || !HTML_NAME.test(path)) return null;
  if (url.searchParams.has("host")) return null;
  const query = new URLSearchParams({ path });
  const session = url.searchParams.get("session");
  if (session !== null && session !== "") query.set("session", session);
  return `/api/pane/${encodeURIComponent(pane)}/files?${query.toString()}`;
}

export async function previewHtmlResponse(request: Request, url: URL, read: CollieRead): Promise<Response> {
  if (request.method !== "GET") return refused(405, "method not allowed");
  const files = previewFilesPath(url);
  if (files === null) return refused(404, "no preview");
  const upstream = await read(files);
  if (!upstream.ok) return refused(upstream.status === 401 ? 401 : 404, "no preview");
  let body: JsonValue;
  try {
    // SAFETY: `Response.json()` answers with exactly a JsonValue by construction; the three fields
    // this route uses are narrowed below before any is believed.
    body = (await upstream.json()) as JsonValue;
  } catch {
    return refused(502, "no preview");
  }
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- parse boundary (ADR 0019's class): Collie's Files read answer, narrowed to the three fields this route uses.
  if (typeof body !== "object" || body === null || Array.isArray(body)) return refused(404, "no preview");
  const { available, binary, text } = body;
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- parse boundary (ADR 0019's class): as above.
  if (available !== true || binary === true || typeof text !== "string") return refused(404, "no preview");
  return new Response(text, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-security-policy": PREVIEW_HTML_CSP,
      "x-frame-options": "SAMEORIGIN",
      "cache-control": "no-store",
      "cross-origin-resource-policy": "same-origin",
    },
  });
}
