// DOWNSTREAM (FORK.toml preview-panel). Previews in place, beside the route on a wide screen and over
// it on a phone, the way a desktop agent app shows them next to the thread.
//
// Two tabs. SCREEN is the current Pane's newest picture — a computer-use or browser screenshot, as
// the Pane page's Chat window carries it (lib/fleet-preview.ts) — or one picked from Chat. BROWSER is
// a loopback address the agent served, framed through the operator's editor's port proxy
// (`editor.url`); a frame on any other site is refused here, since most sites refuse to be framed and
// the editor is the only thing this page may frame (fleet/preview/policy.ts).
//
// The panel is one element at every width, so a breakpoint change never reloads the frame inside it.
import { ExternalLink, RotateCw, X } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent,
} from "react";

import { isPlainClick } from "@/components/file-links";
import { Segmented } from "@/components/ui/segmented";
import { imageSrc } from "@/lib/api";
import { useAuthedUrl } from "@/lib/authed-url";
import { editorProxyHref } from "@/lib/fleet-editor-links";
import { ft, useFleetLocale } from "@/lib/fleet-i18n";
import {
  closePreview,
  followLatestScreen,
  normalizeAddress,
  openPreview,
  previewHostMounted,
  registerPreviewHost,
  setPreviewAddress,
  setPreviewTab,
  setPreviewWidth,
  useLatestScreen,
  usePreview,
  type PreviewTab,
} from "@/lib/fleet-preview";
import { useFleetEditorUrl } from "@/lib/fleet-settings";
import { paneScopeKey, type Scope } from "@/lib/scope";

/** The Pane the Screen tab follows: the shell's current one, on this machine. */
export interface PreviewPane {
  readonly paneId: string;
  readonly scope: Scope;
}

const ICON_BUTTON =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground";

function Quiet({ children }: { children: string }) {
  return <p className="px-4 py-6 text-sm text-muted-foreground">{children}</p>;
}

export function FleetPreviewPanel({ pane }: { pane: PreviewPane | null }) {
  useFleetLocale();
  const preview = usePreview();
  // Mounted, closed or open: a link may open the panel only while it is on the page at all.
  useEffect(() => registerPreviewHost(), []);
  if (!preview.open) return null;
  return (
    <>
      <PreviewSeparator width={preview.width} />
      <section
        aria-label={ft("fleet.preview.title")}
        data-slot="fleet-preview-panel"
        // SAFETY: a custom property is a valid style key; React's type simply does not list it.
        style={{ "--fleet-preview-width": `${preview.width}px` } as CSSProperties}
        className="fixed inset-0 z-40 flex min-h-0 flex-col bg-background [padding-top:env(safe-area-inset-top)] lg:static lg:z-auto lg:w-(--fleet-preview-width) lg:max-w-[70vw] lg:shrink-0 lg:pt-0"
      >
        <div className="flex min-h-11 shrink-0 items-center gap-2 border-b border-rule bg-chrome px-2">
          <Segmented<PreviewTab>
            semantics="tabs"
            label={ft("fleet.preview.title")}
            value={preview.tab}
            onChange={setPreviewTab}
            className="w-auto [&>button]:flex-none [&>button]:px-3"
            options={[
              { value: "screen", label: ft("fleet.preview.screen") },
              { value: "browser", label: ft("fleet.preview.browser") },
            ]}
          />
          <span className="flex-1" />
          <button type="button" onClick={closePreview} aria-label={ft("fleet.preview.close")} title={ft("fleet.preview.close")} className={ICON_BUTTON}>
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          {preview.tab === "screen" ? (
            <ScreenTab pane={pane} picked={preview.picked} />
          ) : (
            <BrowserTab address={preview.address} />
          )}
        </div>
      </section>
    </>
  );
}

function formatTime(ts: string | undefined): string {
  if (ts === undefined) return "";
  const at = new Date(ts);
  return Number.isNaN(at.getTime()) ? "" : at.toLocaleTimeString();
}

function ScreenTab({ pane, picked }: { pane: PreviewPane | null; picked: string | null }) {
  const latest = useLatestScreen(pane === null ? null : paneScopeKey(pane.scope, pane.paneId));
  const url = picked ?? latest?.url ?? null;
  const { url: loaded } = useAuthedUrl(url === null ? null : imageSrc(url, pane?.scope));
  if (url === null) return <Quiet>{ft(pane === null ? "fleet.preview.noPane" : "fleet.preview.noScreen")}</Quiet>;
  return (
    <>
      <div className="flex min-h-9 shrink-0 items-center gap-2 border-b border-rule px-3 text-xs text-muted-foreground">
        {picked === null ? (
          <span className="tabular-nums">{ft("fleet.preview.latest", { time: formatTime(latest?.ts) })}</span>
        ) : (
          <button type="button" onClick={followLatestScreen} className="rounded-md px-2 py-1 font-medium text-foreground hover:bg-muted">
            {ft("fleet.preview.followLatest")}
          </button>
        )}
        <span className="flex-1" />
        {loaded !== null && (
          <a href={loaded} target="_blank" rel="noopener noreferrer" aria-label={ft("fleet.preview.openTab")} title={ft("fleet.preview.openTab")} className={ICON_BUTTON}>
            <ExternalLink className="size-4" aria-hidden />
          </a>
        )}
      </div>
      <div className="flex min-h-0 flex-1 items-start justify-center overflow-auto bg-muted/30 p-2">
        {loaded !== null && (
          <img src={loaded} alt={ft("fleet.chat.imageAlt")} className="max-h-full max-w-full rounded border object-contain shadow-xs" />
        )}
      </div>
    </>
  );
}

function BrowserTab({ address }: { address: string }) {
  const editor = useFleetEditorUrl();
  const [draft, setDraft] = useState(address);
  const [reloads, setReloads] = useState(0);
  // A link opened from Chat replaces the address; what the operator is typing is theirs until then.
  useEffect(() => setDraft(address), [address]);
  const framed = editor === null || address === "" ? null : editorProxyHref(editor, address);
  let body;
  if (editor === null) body = <Quiet>{ft("fleet.preview.noEditor")}</Quiet>;
  else if (address === "") body = <Quiet>{ft("fleet.preview.addressHint")}</Quiet>;
  else if (framed === null) body = <Quiet>{ft("fleet.preview.notLoopback")}</Quiet>;
  else {
    body = (
      <iframe
        key={`${framed}#${String(reloads)}`}
        src={framed}
        title={ft("fleet.preview.browser")}
        referrerPolicy="no-referrer"
        allow="clipboard-write; fullscreen"
        // The page is the editor's origin, never this one's, so its own origin is kept (the editor's
        // sign-in cookies must ride its subresources); what the sandbox withholds is the top window.
        // oxlint-disable-next-line react/iframe-missing-sandbox -- AGENTS.md › Linting: the fork's second exception; this frame loads only the editor's origin (editorProxyHref), so allow-same-origin is that origin's, not Fleet's.
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads"
        className="min-h-0 w-full flex-1 border-0 bg-white"
      />
    );
  }
  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setPreviewAddress(normalizeAddress(draft));
          setReloads((n) => n + 1);
        }}
        className="flex shrink-0 items-center gap-1 border-b border-rule px-2 py-1"
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          aria-label={ft("fleet.preview.address")}
          placeholder="localhost:5173"
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-md border border-rule bg-background px-2 py-1.5 font-mono text-sm outline-none focus-visible:border-ring"
        />
        <button type="button" onClick={() => setReloads((n) => n + 1)} aria-label={ft("fleet.preview.reload")} title={ft("fleet.preview.reload")} className={ICON_BUTTON}>
          <RotateCw className="size-4" aria-hidden />
        </button>
        {(framed ?? address) !== "" && (
          <a href={framed ?? address} target="_blank" rel="noopener noreferrer" aria-label={ft("fleet.preview.openTab")} title={ft("fleet.preview.openTab")} className={ICON_BUTTON}>
            <ExternalLink className="size-4" aria-hidden />
          </a>
        )}
      </form>
      {body}
    </>
  );
}

/** The panel's width handle, on a wide screen only: drag, or arrow keys in 32 px steps. */
function PreviewSeparator({ width }: { width: number }) {
  const drag = useRef<{ x: number; width: number } | null>(null);
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    drag.current = { x: event.clientX, width };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current === null) return;
    // The panel stands on the right, so dragging left widens it.
    setPreviewWidth(drag.current.width + drag.current.x - event.clientX);
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    setPreviewWidth(width + (event.key === "ArrowLeft" ? 32 : -32));
  };
  return (
    <div
      role="separator"
      tabIndex={0}
      aria-label={ft("fleet.preview.resize")}
      aria-orientation="vertical"
      aria-valuenow={width}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      className="group relative z-10 hidden w-1 shrink-0 cursor-col-resize border-l border-rule bg-chrome outline-none lg:block"
    >
      <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-transparent group-hover:bg-ring group-focus-visible:w-0.5 group-focus-visible:bg-ring" />
    </div>
  );
}

/**
 * A plain click on a loopback link opens the Browser tab instead of a new tab, while the panel is on
 * the page and an editor is set (FORK.toml editor-preview-links). Every other click is the browser's.
 */
export function openLoopbackInPreview(event: ReactMouseEvent, href: string, editor: string | null): void {
  if (event.defaultPrevented || !isPlainClick(event) || editor === null || !previewHostMounted()) return;
  if (editorProxyHref(editor, href) === null) return;
  event.preventDefault();
  openPreview({ tab: "browser", address: href });
}

/** A plain click on a Chat picture opens it in the Screen tab, while the panel is on the page. */
export function openPictureInPreview(event: ReactMouseEvent, url: string): void {
  if (event.defaultPrevented || !isPlainClick(event) || !previewHostMounted()) return;
  event.preventDefault();
  openPreview({ tab: "screen", picked: url });
}
