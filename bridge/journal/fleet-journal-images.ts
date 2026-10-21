// DOWNSTREAM (FORK.toml journal-image-compat). The pictures Claude and Codex keep inside their own
// logs that Collie's readers drop: a screenshot a tool returned (computer use, a browser, an image
// viewer) and, for Codex, an image the operator pasted.
//
// Every value goes through Collie's own `resolveImageUrl`, so the rule is upstream's: an inline
// `data:image/*` payload or this collie's blob route, never a URL the phone would fetch on an
// agent's word. A payload above MAX_INLINE_IMAGE_CHARS is skipped rather than shipped to a phone
// inside a journal window.
import type { JsonObject, JsonValue } from "../json.ts";
import { resolveImageUrl } from "./pi.ts";

/** 8 M base64 characters (about 6 MB of image): any real screenshot fits; larger is dropped. */
export const MAX_INLINE_IMAGE_CHARS = 8_000_000;

function object(value: JsonValue | undefined): JsonObject | null {
  return value !== null && value !== undefined && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function bounded(url: string | null): string | null {
  return url !== null && url.length <= MAX_INLINE_IMAGE_CHARS ? url : null;
}

/**
 * The first picture in a Claude `tool_result.content` list: `{ type: "image", source: { type:
 * "base64", media_type, data } }`, the same block shape Claude writes for a pasted image.
 */
export function claudeToolResultImageUrl(content: JsonValue | undefined): string | undefined {
  if (!Array.isArray(content)) return undefined;
  for (const block of content) {
    const b = object(block);
    if (b === null || b.type !== "image") continue;
    const source = object(b.source);
    if (source === null || source.type !== "base64" || typeof source.data !== "string") continue;
    const mimeType = typeof source.media_type === "string" ? source.media_type : undefined;
    const url = bounded(resolveImageUrl(source.data, mimeType));
    if (url !== null) return url;
  }
  return undefined;
}

/**
 * Every picture in a Codex content list — a message's `content` or a tool output's `output` list —
 * written as `{ type: "input_image", image_url: "data:image/…;base64,…" }`. A string output (the
 * common case for a command) holds none.
 */
export function codexImageUrls(content: JsonValue | undefined): string[] {
  if (!Array.isArray(content)) return [];
  const urls: string[] = [];
  for (const block of content) {
    const b = object(block);
    if (b === null || b.type !== "input_image" || typeof b.image_url !== "string") continue;
    const url = bounded(resolveImageUrl(b.image_url));
    if (url !== null) urls.push(url);
  }
  return urls;
}
