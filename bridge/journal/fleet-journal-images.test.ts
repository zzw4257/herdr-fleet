import { describe, expect, test } from "bun:test";

import type { JsonValue } from "../json.ts";
import { parseClaudeTranscript } from "./claude.ts";
import { parseCodexTranscript } from "./codex.ts";
import { claudeToolResultImageUrl, codexImageUrls, MAX_INLINE_IMAGE_CHARS } from "./fleet-journal-images.ts";

const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk";
const PNG_URL = `data:image/png;base64,${PNG}`;

describe("claudeToolResultImageUrl", () => {
  test("takes the first base64 picture of a tool_result's content list", () => {
    const content = [
      { type: "text", text: "Screenshot taken" },
      { type: "image", source: { type: "base64", media_type: "image/png", data: PNG } },
    ];
    expect(claudeToolResultImageUrl(content)).toBe(PNG_URL);
  });

  test("refuses a URL source, a non-image type and a string content", () => {
    expect(claudeToolResultImageUrl([{ type: "image", source: { type: "url", url: "https://evil.example/x.png" } }])).toBeUndefined();
    expect(claudeToolResultImageUrl([{ type: "image", source: { type: "base64", media_type: "text/html", data: PNG } }])).toBeUndefined();
    expect(claudeToolResultImageUrl("plain output")).toBeUndefined();
  });

  test("drops a payload above the inline bound", () => {
    const huge = "A".repeat(MAX_INLINE_IMAGE_CHARS);
    expect(claudeToolResultImageUrl([{ type: "image", source: { type: "base64", media_type: "image/png", data: huge } }])).toBeUndefined();
  });
});

describe("codexImageUrls", () => {
  test("reads every input_image data URL and nothing else", () => {
    const content = [
      { type: "input_text", text: "look" },
      { type: "input_image", image_url: PNG_URL, detail: "high" },
      { type: "input_image", image_url: "https://evil.example/x.png" },
      { type: "input_image", image_url: "data:text/html;base64,PGgxPg==" },
    ];
    expect(codexImageUrls(content)).toEqual([PNG_URL]);
    expect(codexImageUrls("a string output")).toEqual([]);
  });
});

describe("the readers carry the pictures", () => {
  test("a Claude tool's screenshot lands on the call it answers", () => {
    const text = [
      JSON.stringify({
        type: "assistant",
        uuid: "a1",
        timestamp: "2026-10-21T01:00:00.000Z",
        message: { role: "assistant", content: [{ type: "tool_use", id: "t1", name: "screenshot", input: {} }] },
      }),
      JSON.stringify({
        type: "user",
        uuid: "u1",
        timestamp: "2026-10-21T01:00:01.000Z",
        message: {
          role: "user",
          content: [{
            type: "tool_result",
            tool_use_id: "t1",
            content: [
              { type: "text", text: "Screenshot taken" },
              { type: "image", source: { type: "base64", media_type: "image/png", data: PNG } },
            ],
          }],
        },
      }),
    ].join("\n");
    const tool = parseClaudeTranscript(text).flatMap((entry) => entry.parts).find((part) => part.kind === "tool");
    expect(tool?.kind === "tool" ? tool.result : undefined).toMatchObject({ text: "Screenshot taken", imageUrl: PNG_URL });
  });

  test("a Codex tool's screenshot lands on its call, and a pasted picture is a part of its message", () => {
    const row = (payload: JsonValue) =>
      JSON.stringify({ timestamp: "2026-10-21T01:00:00.000Z", type: "response_item", payload });
    const text = [
      row({ type: "message", role: "user", content: [{ type: "input_text", text: "what is this" }, { type: "input_image", image_url: PNG_URL }] }),
      row({ type: "function_call", name: "screenshot", arguments: "{}", call_id: "c1" }),
      row({ type: "function_call_output", call_id: "c1", output: [{ type: "input_image", image_url: PNG_URL, detail: "original" }] }),
    ].join("\n");
    const parts = parseCodexTranscript(text).flatMap((entry) => entry.parts);
    expect(parts.filter((part) => part.kind === "image")).toEqual([{ kind: "image", url: PNG_URL }]);
    const tool = parts.find((part) => part.kind === "tool");
    expect(tool?.kind === "tool" ? tool.result?.imageUrl : undefined).toBe(PNG_URL);
  });

  test("a Codex message holding only a picture is kept", () => {
    const text = JSON.stringify({
      timestamp: "2026-10-21T01:00:00.000Z",
      type: "response_item",
      payload: { type: "message", role: "user", content: [{ type: "input_image", image_url: PNG_URL }] },
    });
    expect(parseCodexTranscript(text).flatMap((entry) => entry.parts)).toEqual([{ kind: "image", url: PNG_URL }]);
  });
});
