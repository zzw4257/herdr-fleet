// What the preview panel needs from Collie's page policy, and nothing more (FORK.toml preview-panel).
//
// Collie's document policy has no `frame-src` or `media-src`, so both fall back to `default-src
// 'self'`: a PDF or a video drawn from bytes the page fetched (a `blob:` URL) is refused, and so is
// a frame on the operator's editor. The Gateway is the one place every document passes, so the two
// directives are spelled out here, from the page's own fallback, with exactly these additions:
//
//   frame-src  'self' blob: <the editor's origin>   — the sandboxed HTML route, a PDF, the editor
//   media-src  'self' blob:                         — a video or an audio file
//
// `script-src`, `connect-src` and `object-src` are untouched, so nothing here lets the page run or
// reach anything new; a frame is its own document under its own policy. A sandboxed policy is left
// as it is, as `widenFontPolicy` leaves it.

import type { SettingsStore } from "../settings/store.ts";

function widen(directives: string[][], name: string, add: readonly string[]): void {
  const at = directives.findIndex(([directive]) => directive?.toLowerCase() === name);
  if (at !== -1) {
    const [directive = name, ...sources] = directives[at]!;
    const kept = sources.filter((source) => source !== "'none'");
    directives[at] = [directive, ...kept, ...add.filter((source) => !kept.includes(source))];
    return;
  }
  const fallback = directives.find(([directive]) => directive?.toLowerCase() === "default-src")?.slice(1) ?? ["'self'"];
  const base = fallback.filter((source) => source !== "'none'");
  directives.push([name, ...base, ...add.filter((source) => !base.includes(source))]);
}

/** `policy` with frames and media for the preview panel. `editorOrigin` null adds no editor. */
export function widenPreviewPolicy(policy: string, editorOrigin: string | null): string {
  const directives = policy
    .split(";")
    .map((directive) => directive.trim())
    .filter((directive) => directive !== "")
    .map((directive) => directive.split(/\s+/u));
  if (directives.some(([name]) => name?.toLowerCase() === "sandbox")) return policy;
  widen(directives, "frame-src", editorOrigin === null ? ["'self'", "blob:"] : ["'self'", "blob:", editorOrigin]);
  widen(directives, "media-src", ["'self'", "blob:"]);
  return directives.map((directive) => directive.join(" ")).join("; ");
}

/** Widen an HTML document's policy in place, reading the editor from Fleet's settings. */
export async function allowPreviews(headers: Headers, settings: SettingsStore | undefined): Promise<void> {
  const policy = headers.get("content-security-policy");
  if (policy === null || !(headers.get("content-type") ?? "").toLowerCase().startsWith("text/html")) return;
  const snapshot = settings === undefined ? null : await settings.read().catch(() => null);
  const editor = snapshot?.settings.editorUrl ?? null;
  headers.set("content-security-policy", widenPreviewPolicy(policy, editor === null ? null : new URL(editor).origin));
}
