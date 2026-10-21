import { fireEvent, render, screen } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { server } from "@/test/setup";
import { FleetFileMedia, FleetHtmlPreview, isFleetMediaPath } from "./fleet-file-media";

// PDF.js draws on a canvas jsdom does not have; what matters here is that the PDF reaches it as bytes.
vi.mock("@/components/fleet-pdf-view", () => ({
  FleetPdfView: ({ blob }: { blob: Blob }) => <p>{`pdf pages from ${blob.type}`}</p>,
}));

function onFiles(element: React.ReactNode, entry = "/pane/w1%3Ap2/changes/files") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="pane/:paneId/changes/*" element={element} />
        <Route path="pane/:paneId/history" element={element} />
      </Routes>
    </MemoryRouter>,
  );
}

function serveMedia(type: string, status = 200) {
  let asked: URL | null = null;
  server.use(
    http.get("/api/pane/:id/files/image", ({ request }) => {
      asked = new URL(request.url);
      return status === 200
        ? new HttpResponse(new Uint8Array([1, 2, 3]), { headers: { "content-type": type } })
        : new HttpResponse("no", { status });
    }),
  );
  return () => asked;
}

describe("isFleetMediaPath", () => {
  it("asks for the names a media read may serve", () => {
    expect(["a.pdf", "b.MP4", "c.webm", "d.m4a", "e.wav"].every(isFleetMediaPath)).toBe(true);
    expect(["a.png", "b.txt", "c.html"].some(isFleetMediaPath)).toBe(false);
  });
});

describe("FleetFileMedia", () => {
  it("plays a video from the media read of this Pane's root", async () => {
    const asked = serveMedia("video/mp4");
    const { container } = onFiles(<FleetFileMedia path="out/run.mp4" fallback={<p>fallback</p>} />);
    await screen.findByText((_, node) => node?.tagName === "VIDEO");
    expect(container.querySelector("video")?.getAttribute("src")).toMatch(/^blob:/);
    expect(asked()?.searchParams.get("as")).toBe("media");
    expect(asked()?.searchParams.get("path")).toBe("out/run.mp4");
  });

  it("draws a PDF in place from its bytes, with the browser's viewer a tap away", async () => {
    serveMedia("application/pdf");
    onFiles(<FleetFileMedia path="paper.pdf" fallback={<p>fallback</p>} />);
    expect(await screen.findByText("pdf pages from application/pdf")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open in the browser's viewer" })).toHaveAttribute("target", "_blank");
  });

  it("says a file is too large, and falls back for bytes that are no media", async () => {
    serveMedia("", 413);
    const { unmount } = onFiles(<FleetFileMedia path="long.mp4" fallback={<p>fallback</p>} />);
    expect(await screen.findByText(/Over 64 MB/)).toBeInTheDocument();
    unmount();
    serveMedia("", 415);
    onFiles(<FleetFileMedia path="fake.mp4" fallback={<p>fallback</p>} />);
    expect(await screen.findByText("fallback")).toBeInTheDocument();
  });
});

describe("FleetHtmlPreview", () => {
  it("runs the page's scripts in the Gateway's sandboxed document on request", () => {
    onFiles(
      <FleetHtmlPreview path="out/report.html">
        <p>static</p>
      </FleetHtmlPreview>,
    );
    expect(screen.getByText("static")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Run scripts" }));
    const frame = screen.getByTitle("out/report.html");
    expect(frame.getAttribute("src")).toBe("/fleet/api/preview/html?pane=w1%3Ap2&path=out%2Freport.html");
    expect(frame.getAttribute("sandbox")).not.toContain("allow-same-origin");
  });

  it("is only the static preview for a crew member's file", () => {
    onFiles(
      <FleetHtmlPreview path="a.html">
        <p>static</p>
      </FleetHtmlPreview>,
      "/pane/p1/changes/files?h=peer",
    );
    expect(screen.queryByRole("button", { name: "Run scripts" })).toBeNull();
  });
});
