import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { itemsOf } from "@/lib/chat-items";
import type { TranscriptEntry } from "@/lib/types";
import { FleetChatImage } from "./fleet-chat-image";

const PNG_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk";

function entry(parts: TranscriptEntry["parts"]): TranscriptEntry {
  return { uuid: "e1", ts: "2026-10-21T01:00:00.000Z", role: "assistant", parts };
}

describe("Chat items for pictures", () => {
  it("draws a picture part as an image block", () => {
    expect(itemsOf(entry([{ kind: "image", url: PNG_URL }]))).toEqual([
      { id: "e1:0", ts: "2026-10-21T01:00:00.000Z", kind: "image", url: PNG_URL },
    ]);
  });

  it("puts a tool's screenshot right under its call", () => {
    const items = itemsOf(
      entry([{ kind: "tool", name: "screenshot", summary: "", id: "t1", result: { text: "Screenshot taken", imageUrl: PNG_URL } }]),
    );
    expect(items.map((item) => item.kind)).toEqual(["tool", "image"]);
    expect(items[1]).toMatchObject({ id: "t1:image", url: PNG_URL });
  });

  it("adds nothing for a call that returned no picture", () => {
    const items = itemsOf(entry([{ kind: "tool", name: "bash", summary: "ls", id: "t2", result: { text: "a b" } }]));
    expect(items.map((item) => item.kind)).toEqual(["tool"]);
  });
});

describe("FleetChatImage", () => {
  it("draws an inline picture that opens full size in a new tab", () => {
    render(
      <MemoryRouter>
        <FleetChatImage url={PNG_URL} />
      </MemoryRouter>,
    );
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", PNG_URL);
    expect(img.closest("a")).toHaveAttribute("target", "_blank");
  });

  it("draws nothing for a reference the app refuses to load", () => {
    const { container } = render(
      <MemoryRouter>
        <FleetChatImage url="https://evil.example/x.png" />
      </MemoryRouter>,
    );
    expect(container.querySelector("img")).toBeNull();
  });
});
