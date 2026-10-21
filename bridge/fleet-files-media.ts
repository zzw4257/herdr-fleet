// DOWNSTREAM (FORK.toml files-media). A PDF, a video or an audio file under the Files root, as its
// bytes, for Fleet's inline previews. It is the picture read of ADR 0090 with another type list and
// bound: the same root, the same shape rule, the same real-path containment and deny list and the
// same no-follow open of a regular file, through the very functions bridge/files-view.ts runs. The
// type comes off the bytes and never off the name, so a renamed text file is not served as a video.

import {
  checkedTarget,
  openedFileAllowed,
  parseRelPath,
  resolveRoot,
  UNKNOWN_PATH,
  type FilesContext,
  type FilesResult,
} from "./files-view.ts";

/**
 * Held whole in memory once on each side. ponytail: no Range and no streaming; a longer recording
 * answers `413` and opens in the editor, and a ranged read is the upgrade.
 */
export const MAX_MEDIA_READ_BYTES = 64 * 1024 * 1024;

const MEDIA_SNIFF_BYTES = 64;

export type MediaType =
  | "application/pdf"
  | "video/mp4"
  | "video/quicktime"
  | "video/webm"
  | "audio/mp4"
  | "audio/mpeg"
  | "audio/ogg"
  | "audio/wav"
  | "audio/flac";

function asciiAt(head: Uint8Array, offset: number, text: string): boolean {
  if (head.length < offset + text.length) return false;
  for (let i = 0; i < text.length; i++) if (head[offset + i] !== text.charCodeAt(i)) return false;
  return true;
}

/** ISO-BMFF brands that are pictures (AVIF, HEIF): the picture read's, or nobody's. */
const PICTURE_BRANDS = new Set(["avif", "avis", "heic", "heix", "hevc", "hevx", "mif1", "msf1"]);

/** An `ftyp` box's major and compatible brands, as far as the bytes in hand reach. */
function ftypBrands(head: Uint8Array): string[] | null {
  if (!asciiAt(head, 4, "ftyp")) return null;
  const size = ((head[0]! << 24) | (head[1]! << 16) | (head[2]! << 8) | head[3]!) >>> 0;
  const end = Math.min(size, head.length);
  const brands: string[] = [];
  for (let at = 8; at + 4 <= end; at += at === 8 ? 8 : 4) {
    brands.push(String.fromCharCode(head[at]!, head[at + 1]!, head[at + 2]!, head[at + 3]!));
  }
  return brands;
}

/** The media type of a file's leading bytes, or null for anything this read does not serve. */
export function sniffMediaType(head: Uint8Array): MediaType | null {
  if (asciiAt(head, 0, "%PDF-")) return "application/pdf";
  const brands = ftypBrands(head);
  if (brands !== null) {
    if (brands.length === 0 || brands.some((brand) => PICTURE_BRANDS.has(brand))) return null;
    if (brands[0] === "qt  ") return "video/quicktime";
    if (brands[0] === "M4A " || brands[0] === "M4B ") return "audio/mp4";
    return "video/mp4";
  }
  if (head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3) return "video/webm";
  if (asciiAt(head, 0, "OggS")) return "audio/ogg";
  if (asciiAt(head, 0, "RIFF") && asciiAt(head, 8, "WAVE")) return "audio/wav";
  if (asciiAt(head, 0, "fLaC")) return "audio/flac";
  // An ID3 tag, or an MPEG audio frame sync (eleven set bits). JPEG's FF D8 is not one.
  if (asciiAt(head, 0, "ID3") || (head[0] === 0xff && head[1] !== undefined && (head[1] & 0xe0) === 0xe0)) {
    return "audio/mpeg";
  }
  return null;
}

export type MediaReadAnswer =
  | { available: false; reason: "no-folder" }
  | { available: true; kind: "media"; type: MediaType; bytes: Uint8Array; size: number; mtimeMs?: number }
  | { available: true; kind: "too-large"; size: number }
  | { available: true; kind: "not-media" };

/** One media file under the root, through exactly the checks the picture read runs. */
export async function readMedia(ctx: FilesContext, path: string): Promise<FilesResult<MediaReadAnswer>> {
  const r = await resolveRoot(ctx);
  if (r === null) return { available: false, reason: "no-folder" };
  const segments = parseRelPath(path, r.host);
  if (segments === null || segments.length === 0) return UNKNOWN_PATH;
  try {
    const real = await checkedTarget(segments, r);
    if (real === null) return UNKNOWN_PATH;
    const st = await r.fs.stat(real).catch(() => null);
    if (st === null || !st.isFile()) return UNKNOWN_PATH;
    if (st.size > MAX_MEDIA_READ_BYTES) return { available: true, kind: "too-large", size: st.size };
    const head = await r.fs.readHead(real, MAX_MEDIA_READ_BYTES, openedFileAllowed(segments, r, real));
    if (head === null) return UNKNOWN_PATH;
    if (head.size > MAX_MEDIA_READ_BYTES) return { available: true, kind: "too-large", size: head.size };
    const type = sniffMediaType(head.bytes.subarray(0, MEDIA_SNIFF_BYTES));
    if (type === null) return { available: true, kind: "not-media" };
    const media: MediaReadAnswer = { available: true, kind: "media", type, bytes: head.bytes, size: head.size };
    if (head.mtimeMs !== undefined) media.mtimeMs = head.mtimeMs;
    return media;
  } catch {
    return UNKNOWN_PATH;
  }
}

/**
 * The answer for a read that reached a root: the bytes, `413` over the bound, `415` for bytes none
 * of the types. Like the picture read's, the bytes go out `no-store`, `inline`, and dropped into an
 * opaque origin with nothing allowed should they ever be opened as a page.
 */
export function fleetMediaResponse(answer: Extract<MediaReadAnswer, { available: true }>): Response {
  const plain = { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" };
  if (answer.kind === "too-large") {
    return new Response(`media too large (max ${String(MAX_MEDIA_READ_BYTES / (1024 * 1024))} MB)\n`, { status: 413, headers: plain });
  }
  if (answer.kind === "not-media") return new Response("not a file this route serves\n", { status: 415, headers: plain });
  const headers = new Headers({
    "content-type": answer.type,
    "cache-control": "no-store",
    "content-security-policy": "default-src 'none'; sandbox",
    "content-disposition": "inline",
    "x-collie-file-size": String(answer.size),
  });
  if (answer.mtimeMs !== undefined) headers.set("x-collie-file-mtime", String(answer.mtimeMs));
  return new Response(answer.bytes.slice(), { headers });
}
