// DOWNSTREAM (FORK.toml preview-panel). Files draws what Collie's preview shows only as "Binary file":
// a PDF, a video and an audio file, in place, from the bridge's media read (`files/image?as=media`,
// bridge/fleet-files-media.ts), and it can run an HTML file's scripts through the Gateway's sandboxed
// document (fleet/preview/html-route.ts). The bytes become an object URL this page made, which the
// Gateway's page policy admits as a frame and as media (fleet/preview/policy.ts).
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { useInRouterContext, useParams } from "react-router";

import { filesImagePath, XHR_HEADER, XHR_HEADER_VALUE, type ChangesTarget } from "@/lib/api";
import { mounted } from "@/lib/base-path";
import { ft, useFleetLocale } from "@/lib/fleet-i18n";
import { authHeader } from "@/lib/pairing";
import { useScope } from "@/lib/session";

const MEDIA_NAME = /\.(pdf|mp4|m4v|mov|webm|mkv|mp3|m4a|aac|wav|ogg|oga|opus|flac)$/iu;
/** A 64 MB recording over a phone's link takes a while; the bridge's own bound is the real limit. */
const MEDIA_TIMEOUT_MS = 120_000;

/** PDF.js, in its own chunk, loaded by the first PDF opened (components/fleet-pdf-view.tsx). */
const FleetPdfView = lazy(async () => ({ default: (await import("@/components/fleet-pdf-view")).FleetPdfView }));

/** Whether the name is one the media read may serve. The bytes decide; the name only asks. */
export function isFleetMediaPath(path: string): boolean {
  return MEDIA_NAME.test(path);
}

/** The Files subject of the route this is drawn on, or null off a Files route (History, playground). */
function useFilesTarget(): ChangesTarget | null {
  const { paneId, spaceId } = useParams();
  if (paneId !== undefined) return { kind: "pane", paneId };
  if (spaceId !== undefined) return { kind: "space", spaceId };
  return null;
}

type MediaState =
  | { phase: "loading" }
  | { phase: "ready"; url: string; type: string; blob: Blob }
  | { phase: "too-large" }
  | { phase: "not-media" }
  | { phase: "failed" };

function Quiet({ children }: { children: string }) {
  return <p className="px-4 py-6 text-sm text-muted-foreground">{children}</p>;
}

/**
 * One media file of the Files root, drawn in place; `fallback` when its bytes are no media type, and
 * wherever no route names a Files subject (a test or the playground rendering Collie's preview bare).
 */
export function FleetFileMedia({ path, fallback }: { path: string; fallback: ReactNode }) {
  return useInRouterContext() ? <RoutedFileMedia path={path} fallback={fallback} /> : <>{fallback}</>;
}

function RoutedFileMedia({ path, fallback }: { path: string; fallback: ReactNode }) {
  useFleetLocale();
  const target = useFilesTarget();
  const scope = useScope();
  const src = target === null ? null : `${filesImagePath(target, path, scope)}&as=media`;
  const [media, setMedia] = useState<MediaState>({ phase: "loading" });

  useEffect(() => {
    if (src === null) return;
    const abort = new AbortController();
    let made: string | null = null;
    setMedia({ phase: "loading" });
    void (async () => {
      try {
        const res = await fetch(mounted(src), {
          signal: AbortSignal.any([abort.signal, AbortSignal.timeout(MEDIA_TIMEOUT_MS)]),
          headers: { [XHR_HEADER]: XHR_HEADER_VALUE, ...authHeader() },
        });
        if (res.status === 413) return setMedia({ phase: "too-large" });
        if (res.status === 415) return setMedia({ phase: "not-media" });
        if (!res.ok) return setMedia({ phase: "failed" });
        const blob = await res.blob();
        if (abort.signal.aborted) return;
        made = URL.createObjectURL(blob);
        setMedia({ phase: "ready", url: made, type: blob.type, blob });
      } catch {
        if (!abort.signal.aborted) setMedia({ phase: "failed" });
      }
    })();
    return () => {
      abort.abort();
      if (made !== null) URL.revokeObjectURL(made);
    };
  }, [src]);

  if (src === null || media.phase === "not-media") return <>{fallback}</>;
  if (media.phase === "loading") return <Quiet>{ft("fleet.media.loading")}</Quiet>;
  if (media.phase === "too-large") return <Quiet>{ft("fleet.media.tooLarge")}</Quiet>;
  if (media.phase === "failed") return <Quiet>{ft("fleet.media.failed")}</Quiet>;
  if (media.type.startsWith("video/")) {
    return (
      <div className="px-2">
        <video controls playsInline src={media.url} className="mx-auto max-h-[75vh] w-full rounded bg-black">
          {/* An agent's own recording has no captions; the empty track says so rather than inventing one. */}
          <track kind="captions" />
        </video>
      </div>
    );
  }
  if (media.type.startsWith("audio/")) {
    return (
      <div className="px-4 py-4">
        <audio controls src={media.url} className="w-full">
          <track kind="captions" />
        </audio>
      </div>
    );
  }
  // A PDF, drawn in place by PDF.js (fleet-pdf-view.tsx explains why not a frame), with the browser's
  // own viewer a tap away.
  return (
    <div className="flex flex-col gap-1">
      <Suspense fallback={<Quiet>{ft("fleet.media.loading")}</Quiet>}>
        <FleetPdfView blob={media.blob} />
      </Suspense>
      <a href={media.url} target="_blank" rel="noopener noreferrer" className="self-start px-4 pb-3 text-sm underline">
        {ft("fleet.media.openPdf")}
      </a>
    </div>
  );
}

/**
 * An HTML file: Collie's script-less preview (`children`), or the same file running its scripts in
 * the Gateway's opaque-origin document. Offered on the lead's own Panes only.
 */
export function FleetHtmlPreview({ path, children }: { path: string; children: ReactNode }) {
  return useInRouterContext() ? <RoutedHtmlPreview path={path}>{children}</RoutedHtmlPreview> : <>{children}</>;
}

function RoutedHtmlPreview({ path, children }: { path: string; children: ReactNode }) {
  useFleetLocale();
  const { paneId } = useParams();
  const scope = useScope();
  const [running, setRunning] = useState(false);
  if (paneId === undefined || scope.host !== undefined) return <>{children}</>;
  const query = new URLSearchParams({ pane: paneId, path });
  if (scope.session !== undefined) query.set("session", scope.session);
  return (
    <>
      <div className="flex items-center gap-2 px-4 pb-2 text-xs text-muted-foreground">
        <span className="min-w-0 flex-1">{ft(running ? "fleet.html.runningNote" : "fleet.html.staticNote")}</span>
        <button
          type="button"
          onClick={() => setRunning((on) => !on)}
          className="shrink-0 rounded-md border border-rule px-2 py-1 font-medium text-foreground hover:bg-muted"
        >
          {ft(running ? "fleet.html.stop" : "fleet.html.run")}
        </button>
      </div>
      {running ? (
        <iframe
          src={`/fleet/api/preview/html?${query.toString()}`}
          title={path}
          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
          className="h-[80vh] w-full border-0 bg-white"
        />
      ) : (
        children
      )}
    </>
  );
}
