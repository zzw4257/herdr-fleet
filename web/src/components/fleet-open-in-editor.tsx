// DOWNSTREAM (FORK.toml editor-previews). The Files header's way out to the operator's browser
// editor (Fleet setting `editor.url`), which previews what Files cannot: a PDF, a video, an HTML
// page that needs its script. Nothing without the setting, and nothing on a crew member, whose disk
// the editor cannot see.
import { SquareArrowOutUpRight } from "lucide-react";

import { editorFileHref } from "@/lib/fleet-editor-links";
import { ft, useFleetLocale } from "@/lib/fleet-i18n";
import { useFleetEditorUrl } from "@/lib/fleet-settings";
import { useScope } from "@/lib/session";

/** `root` is the Files root the bridge answered with, `path` the file relative to it. */
export function FleetOpenInEditor({ root, path }: { root: string | null; path: string }) {
  useFleetLocale();
  const editor = useFleetEditorUrl();
  const scope = useScope();
  if (editor === null || root === null || scope.host !== undefined) return null;
  const label = ft("fleet.editor.openFile");
  return (
    <a
      href={editorFileHref(editor, root, `${root.replace(/\/+$/, "")}/${path}`)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      <SquareArrowOutUpRight className="size-4" aria-hidden />
    </a>
  );
}
