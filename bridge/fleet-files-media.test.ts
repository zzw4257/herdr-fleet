import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { fleetMediaResponse, MAX_MEDIA_READ_BYTES, readMedia, sniffMediaType } from "./fleet-files-media.ts";
import { UNKNOWN_PATH, type FilesContext } from "./files-view.ts";

const enc = (text: string) => new TextEncoder().encode(text);
/** An ISO-BMFF `ftyp` box: size, `ftyp`, major brand, minor version, compatible brands. */
function ftyp(major: string, ...compatible: string[]): Uint8Array {
  const body = enc(`ftyp${major}\0\0\0\0${compatible.join("")}`);
  const out = new Uint8Array(body.length + 4);
  new DataView(out.buffer).setUint32(0, out.length);
  out.set(body, 4);
  return out;
}

describe("sniffMediaType", () => {
  test("names each served type by its bytes", () => {
    expect(sniffMediaType(enc("%PDF-1.7\n"))).toBe("application/pdf");
    expect(sniffMediaType(ftyp("isom", "isom", "avc1"))).toBe("video/mp4");
    expect(sniffMediaType(ftyp("qt  ", "qt  "))).toBe("video/quicktime");
    expect(sniffMediaType(ftyp("M4A ", "M4A ", "mp42"))).toBe("audio/mp4");
    expect(sniffMediaType(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0]))).toBe("video/webm");
    expect(sniffMediaType(enc("OggS\0"))).toBe("audio/ogg");
    expect(sniffMediaType(enc("RIFF\0\0\0\0WAVEfmt "))).toBe("audio/wav");
    expect(sniffMediaType(enc("fLaC\0"))).toBe("audio/flac");
    expect(sniffMediaType(enc("ID3\x04"))).toBe("audio/mpeg");
    expect(sniffMediaType(new Uint8Array([0xff, 0xfb, 0x90]))).toBe("audio/mpeg");
  });

  test("refuses pictures, text and the near misses", () => {
    expect(sniffMediaType(ftyp("avif", "mif1", "avif"))).toBeNull();
    expect(sniffMediaType(ftyp("heic", "mif1", "heic"))).toBeNull();
    expect(sniffMediaType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBeNull();
    expect(sniffMediaType(enc("RIFF\0\0\0\0WEBPVP8 "))).toBeNull();
    expect(sniffMediaType(enc("<html><body>%PDF-"))).toBeNull();
    expect(sniffMediaType(new Uint8Array([]))).toBeNull();
  });
});

describe("readMedia: the picture read's checks, the media read's types", () => {
  let base: string;
  let ctx: FilesContext;

  beforeAll(() => {
    base = realpathSync.native(mkdtempSync(join(tmpdir(), "fleet-files-media-")));
    const home = join(base, "home");
    const root = join(home, "ws");
    mkdirSync(join(root, "out"), { recursive: true });
    mkdirSync(join(base, "outside"), { recursive: true });
    writeFileSync(join(root, "out", "paper.pdf"), "%PDF-1.4\n%%EOF\n");
    writeFileSync(join(root, "out", "notes.pdf"), "plain text named pdf\n");
    writeFileSync(join(base, "outside", "secret.pdf"), "%PDF-1.4\n");
    symlinkSync(join(base, "outside", "secret.pdf"), join(root, "out", "leak.pdf"));
    ctx = { root, home, privateFolders: [] };
  });

  afterAll(() => rmSync(base, { recursive: true, force: true }));

  test("serves a file whose bytes are a type, with its size", async () => {
    const got = await readMedia(ctx, "out/paper.pdf");
    expect(got !== UNKNOWN_PATH && got.available && got.kind === "media" ? [got.type, got.size] : got).toEqual([
      "application/pdf",
      15,
    ]);
  });

  test("a renamed text file is not media, and a link out of the root is unknown", async () => {
    expect(await readMedia(ctx, "out/notes.pdf")).toEqual({ available: true, kind: "not-media" });
    expect(await readMedia(ctx, "out/leak.pdf")).toBe(UNKNOWN_PATH);
    expect(await readMedia(ctx, "../outside/secret.pdf")).toBe(UNKNOWN_PATH);
    expect(await readMedia(ctx, "/etc/hosts")).toBe(UNKNOWN_PATH);
  });

  test("the answer carries the type, no-store and an opaque-origin policy", async () => {
    const got = await readMedia(ctx, "out/paper.pdf");
    if (got === UNKNOWN_PATH || !got.available) throw new Error("expected an answer");
    const res = fleetMediaResponse(got);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("content-security-policy")).toContain("sandbox");
    expect(fleetMediaResponse({ available: true, kind: "too-large", size: MAX_MEDIA_READ_BYTES + 1 }).status).toBe(413);
    expect(fleetMediaResponse({ available: true, kind: "not-media" }).status).toBe(415);
  });
});
