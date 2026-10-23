import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HeldCard } from "@/components/composer-held";
import type { HeldRow } from "@/lib/surface/send";
import { server } from "@/test/setup";

const notice: HeldRow = {
  requestId: "stale-notice",
  mode: "send",
  text: "A message already handled in the terminal",
  heldAt: 1_700_000_000_000,
  expiresAt: 1_700_001_800_000,
  state: "ended",
  outcome: "typed_not_submitted",
};

beforeEach(() => vi.stubEnv("VITE_HERDR_FLEET", "1"));
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

function show(canAct = true) {
  const onSend = vi.fn(async () => true);
  const onChanged = vi.fn();
  render(<HeldCard paneId="w1:p1" scope={{ session: "demo" }} rows={[notice]} canAct={canAct} sending onSend={onSend} onChanged={onChanged} />);
  return { onSend, onChanged };
}

describe("Fleet's stale send notice", () => {
  it("can be dismissed during another send without submitting or clearing terminal input", async () => {
    const user = userEvent.setup();
    const requests: string[] = [];
    server.use(http.all("/api/*", ({ request }) => {
      requests.push(`${request.method} ${new URL(request.url).pathname}${new URL(request.url).search}`);
      return HttpResponse.json({ result: "dismissed" });
    }));
    const props = show();
    await user.click(screen.getByRole("button", { name: "Dismiss notice" }));
    await waitFor(() => expect(props.onChanged).toHaveBeenCalledOnce());
    expect(requests).toEqual(["DELETE /api/send/stale-notice?pane=w1%3Ap1&session=demo"]);
    expect(props.onSend).not.toHaveBeenCalled();
  });

  it("refreshes after another client already removed the notice", async () => {
    const user = userEvent.setup();
    server.use(http.delete("/api/send/:id", () => HttpResponse.json({ error: "not found" }, { status: 404 })));
    const props = show();
    await user.click(screen.getByRole("button", { name: "Dismiss notice" }));
    await waitFor(() => expect(props.onChanged).toHaveBeenCalledOnce());
    expect(props.onSend).not.toHaveBeenCalled();
  });

  it("keeps upstream behavior outside a Fleet build", () => {
    vi.stubEnv("VITE_HERDR_FLEET", "");
    show();
    expect(screen.queryByRole("button", { name: "Dismiss notice" })).toBeNull();
  });

  it("does not add an action when the composer cannot act", () => {
    show(false);
    expect(screen.queryByRole("button", { name: "Dismiss notice" })).toBeNull();
  });
});
