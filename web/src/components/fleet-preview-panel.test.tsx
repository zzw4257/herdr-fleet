import { act, fireEvent, render, screen } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { closePreview, openPreview, publishScreen, setPreviewAddress, usePreview } from "@/lib/fleet-preview";
import { paneScopeKey } from "@/lib/scope";
import { server } from "@/test/setup";
import { FleetPreviewPanel, openLoopbackInPreview, openPictureInPreview } from "./fleet-preview-panel";

const EDITOR = "https://code.example.com";
const PNG = "data:image/png;base64,iVBORw0KGgo=";
const OLD = "data:image/png;base64,b2xk";
const PANE = { paneId: "w1:p2", scope: {} };

// The editor address is read once per page, by whichever test first asks for it, and the setup resets
// handlers after every test, so the answer is served before each one.
beforeEach(() => {
  server.use(
    http.get("/fleet/api/settings", () =>
      HttpResponse.json({ version: "v1", document: JSON.stringify({ editor: { url: EDITOR } }), risky: [] }),
    ),
  );
});

beforeEach(() => {
  closePreview();
  setPreviewAddress("");
});

/** A link whose click goes through `open`, as the ports wire it. `fireEvent` answers false when prevented. */
function Link({ href, open }: { href: string; open: (event: React.MouseEvent) => void }) {
  return (
    <a href={href} onClick={open}>
      {href}
    </a>
  );
}

describe("FleetPreviewPanel", () => {
  it("draws nothing while closed, and the current Pane's newest screenshot on the Screen tab", () => {
    const { container } = render(<FleetPreviewPanel pane={PANE} />);
    expect(container.querySelector("section")).toBeNull();
    act(() => publishScreen(paneScopeKey(PANE.scope, PANE.paneId), { url: PNG, ts: "2026-10-21T01:00:00.000Z" }));
    act(() => openPreview({ tab: "screen" }));
    expect(screen.getByRole("img")).toHaveAttribute("src", PNG);
  });

  it("shows a picture picked from Chat until told to follow the newest again", () => {
    act(() => publishScreen(paneScopeKey(PANE.scope, PANE.paneId), { url: PNG }));
    render(<FleetPreviewPanel pane={PANE} />);
    act(() => openPreview({ tab: "screen", picked: OLD }));
    expect(screen.getByRole("img")).toHaveAttribute("src", OLD);
    fireEvent.click(screen.getByRole("button", { name: "Follow the newest" }));
    expect(screen.getByRole("img")).toHaveAttribute("src", PNG);
  });

  it("asks for an agent when there is no Pane to follow", () => {
    render(<FleetPreviewPanel pane={null} />);
    act(() => openPreview({ tab: "screen" }));
    expect(screen.getByText("Open an agent to follow its screen.")).toBeInTheDocument();
  });

  it("frames a loopback address through the editor's proxy, and refuses any other site", async () => {
    render(<FleetPreviewPanel pane={PANE} />);
    act(() => openPreview({ tab: "browser", address: "http://localhost:5173/app" }));
    const frame = await screen.findByTitle("Browser");
    expect(frame).toHaveAttribute("src", `${EDITOR}/proxy/5173/app`);
    act(() => openPreview({ tab: "browser", address: "https://example.com/" }));
    expect(await screen.findByText(/Only this machine's ports/)).toBeInTheDocument();
  });

  it("typing a port opens it", async () => {
    render(<FleetPreviewPanel pane={PANE} />);
    act(() => openPreview({ tab: "browser" }));
    const field = await screen.findByRole("textbox", { name: "Address" });
    fireEvent.change(field, { target: { value: "8000" } });
    fireEvent.submit(field);
    expect(await screen.findByTitle("Browser")).toHaveAttribute("src", `${EDITOR}/proxy/8000/`);
  });

  it("closes from its own button", () => {
    render(<FleetPreviewPanel pane={PANE} />);
    act(() => openPreview({ tab: "screen" }));
    fireEvent.click(screen.getByRole("button", { name: "Close preview" }));
    expect(screen.queryByRole("region")).toBeNull();
  });
});

describe("what opens the panel", () => {
  it("a plain click on a loopback link, while the panel is on the page and an editor is set", () => {
    let state = { open: false, tab: "screen", address: "" };
    function Probe() {
      state = usePreview();
      return null;
    }
    render(
      <>
        <FleetPreviewPanel pane={PANE} />
        <Probe />
        <Link href="http://localhost:5173/" open={(e) => openLoopbackInPreview(e, "http://localhost:5173/", EDITOR)} />
        <Link href="https://example.com/" open={(e) => openLoopbackInPreview(e, "https://example.com/", EDITOR)} />
        <Link href="http://localhost:3000/" open={(e) => openLoopbackInPreview(e, "http://localhost:3000/", null)} />
        <Link href="data:image/png;base64,x" open={(e) => openPictureInPreview(e, PNG)} />
      </>,
    );
    expect(fireEvent.click(screen.getByText("http://localhost:5173/"))).toBe(false);
    expect(state).toMatchObject({ open: true, tab: "browser", address: "http://localhost:5173/" });
    expect(fireEvent.click(screen.getByText("http://localhost:5173/"), { metaKey: true })).toBe(true);
    expect(fireEvent.click(screen.getByText("https://example.com/"))).toBe(true);
    expect(fireEvent.click(screen.getByText("http://localhost:3000/"))).toBe(true);
    expect(fireEvent.click(screen.getByText("data:image/png;base64,x"))).toBe(false);
    expect(state).toMatchObject({ open: true, tab: "screen" });
  });

  it("nothing, with no panel on the page", () => {
    render(<Link href="http://localhost:5173/" open={(e) => openLoopbackInPreview(e, "http://localhost:5173/", EDITOR)} />);
    expect(fireEvent.click(screen.getByText("http://localhost:5173/"))).toBe(true);
  });
});
