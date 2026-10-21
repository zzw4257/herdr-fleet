import { render, screen } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { MemoryRouter } from "react-router";
import { beforeAll, describe, expect, it } from "vitest";

import { server } from "@/test/setup";
import { AnsiOutput } from "./ansi-output";
import { FleetOpenInEditor } from "./fleet-open-in-editor";
import { MarkdownText } from "./markdown-text";

const EDITOR = "https://code.example.com";

function at(entry: string, root: string | null) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <FleetOpenInEditor root={root} path="docs/paper.pdf" />
    </MemoryRouter>,
  );
}

// The editor address is read once per page, so this file's first render, whichever test it is, is
// that read.
beforeAll(() => {
  server.use(
    http.get("/fleet/api/settings", () =>
      HttpResponse.json({ version: "v1", document: JSON.stringify({ editor: { url: EDITOR } }), risky: [] }),
    ),
  );
});

describe("FleetOpenInEditor", () => {
  it("opens the file in the editor, in its root folder, in a new tab", async () => {
    at("/pane/p1", "/srv/proj");
    const link = await screen.findByRole("link", { name: "Open in editor" });
    const url = new URL(link.getAttribute("href") ?? "");
    expect(url.searchParams.get("folder")).toBe("/srv/proj");
    expect(url.searchParams.get("payload")).toContain("vscode-remote://code.example.com/srv/proj/docs/paper.pdf");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("draws nothing for a crew member's file or before the root is known", async () => {
    at("/pane/p1", "/srv/proj");
    await screen.findByRole("link", { name: "Open in editor" });
    const { container: member } = at("/pane/p1?h=peer", "/srv/proj");
    expect(member.querySelector("a")).toBeNull();
    const { container: waiting } = at("/pane/p1", null);
    expect(waiting.querySelector("a")).toBeNull();
  });
});

// The two upstream ports (FORK.toml editor-preview-links): an external link's href passes through
// the editor's proxy when it is loopback, and is otherwise untouched.
describe("loopback links in Chat and the mirror", () => {
  it("Chat prose sends a dev server through the editor and leaves a public link alone", async () => {
    render(<MarkdownText text={"Running at http://localhost:5173/app and https://example.com/docs"} />);
    expect(await screen.findByRole("link", { name: "http://localhost:5173/app" })).toHaveAttribute(
      "href",
      `${EDITOR}/proxy/5173/app`,
    );
    expect(screen.getByRole("link", { name: "https://example.com/docs" })).toHaveAttribute("href", "https://example.com/docs");
  });

  it("the mirror does the same for a URL a dev server printed", async () => {
    const { container } = render(<AnsiOutput text={"  Local:   http://localhost:5173/\n"} agent="claude" />);
    await screen.findByText((_, node) => node?.getAttribute("href") === `${EDITOR}/proxy/5173/`);
    expect(container.querySelector("a")).toHaveAttribute("target", "_blank");
  });
});
