import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import type { FleetLeadConfig } from "../config.ts";
import { createGatewayHandler } from "../gateway.ts";
import { LoginRateLimiter } from "../rate-limit.ts";
import { SessionStore } from "../session-store.ts";
import { createSettingsStore, type SettingsStoreIo } from "../settings/store.ts";
import { fleetTestConfig } from "../test-helpers.ts";
import { FLEET_PREVIEW_HTML_PATH, PREVIEW_HTML_CSP } from "./html-route.ts";

// The preview's two Gateway halves, wired: Collie's page policy gains the panel's frames and media,
// and the sandboxed HTML route answers through Collie's own Files read with its own frame policy.

let config: FleetLeadConfig;
const loginCsrfToken = "C".repeat(43);
const roots: string[] = [];
const COLLIE_CSP = "default-src 'self'; script-src 'self'; frame-ancestors 'none'; object-src 'none'";

afterAll(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

beforeAll(async () => {
  const base = fleetTestConfig();
  config = {
    ...base,
    auth: {
      ...base.auth,
      passwordHash: await Bun.password.hash("gateway-test-password", { algorithm: "argon2id", memoryCost: 4_096, timeCost: 1 }),
    },
  };
});

function req(path: string, init: RequestInit = {}): Request {
  const headers = new Headers(init.headers);
  headers.set("host", config.public.host);
  return new Request(`${config.public.origin}${path}`, { ...init, headers });
}

async function setup() {
  const root = await mkdtemp(join(tmpdir(), "herdr-fleet-preview-"));
  roots.push(root);
  const document = JSON.stringify({ editor: { url: "https://code.example.com" } });
  const io: SettingsStoreIo = { mtime: async () => 1, read: async () => document, write: async () => undefined };
  const asked: string[] = [];
  const handler = createGatewayHandler({
    config,
    sessions: new SessionStore(join(root, "sessions.json")),
    limiter: new LoginRateLimiter(config.auth.rateLimit),
    fetcher: async (input) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      asked.push(`${url.pathname}${url.search}`);
      if (url.pathname.endsWith("/files")) return Response.json({ available: true, binary: false, text: "<p>hi</p>" });
      return new Response("<!doctype html>", { headers: { "content-type": "text/html", "content-security-policy": COLLIE_CSP } });
    },
    now: () => 1_000,
    loginCsrfToken,
    settings: createSettingsStore("/cfg/settings.json", io, () => undefined),
  });
  const login = await handler(
    req("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", origin: config.public.origin, "x-forwarded-for": "192.0.2.10" },
      body: new URLSearchParams({ username: "operator", password: "gateway-test-password" }),
    }),
    { peerAddress: "127.0.0.1" },
  );
  const cookie = login.headers.get("set-cookie")?.split(";", 1)[0];
  if (cookie === undefined) throw new Error("login did not issue a cookie");
  const get = (path: string, signedIn = true) =>
    handler(req(path, signedIn ? { headers: { cookie } } : {}), { peerAddress: "127.0.0.1" });
  return { get, asked };
}

describe("the Gateway's preview halves", () => {
  test("an app document's policy gains the panel's frames, media and the editor's origin", async () => {
    const { get } = await setup();
    const policy = (await get("/pane/p1")).headers.get("content-security-policy") ?? "";
    expect(policy).toContain("frame-src 'self' blob: https://code.example.com");
    expect(policy).toContain("media-src 'self' blob:");
    expect(policy).toContain("script-src 'self'");
    expect(policy).toContain("object-src 'none'");
  });

  test("the scripted HTML route reads Collie's Files read and may be framed by Fleet only", async () => {
    const { get, asked } = await setup();
    const res = await get(`${FLEET_PREVIEW_HTML_PATH}?pane=p1&path=out/a.html`);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("<p>hi</p>");
    expect(res.headers.get("content-security-policy")).toBe(PREVIEW_HTML_CSP);
    expect(res.headers.get("x-frame-options")).toBe("SAMEORIGIN");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(asked).toContain("/api/pane/p1/files?path=out%2Fa.html");
  });

  test("is refused without a session", async () => {
    const { get, asked } = await setup();
    expect((await get(`${FLEET_PREVIEW_HTML_PATH}?pane=p1&path=a.html`, false)).status).toBe(401);
    expect(asked).toEqual([]);
  });
});
