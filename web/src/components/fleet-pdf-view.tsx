// DOWNSTREAM (FORK.toml preview-panel). A PDF drawn in place with Mozilla's PDF.js, in a chunk of its
// own that loads on the first PDF opened.
//
// Why PDF.js and not the browser's viewer in a frame: Chromium's viewer refuses any sandboxed frame
// (measured with `sandbox=""`, `allow-scripts` and `allow-same-origin`), the lint gate requires a
// sandbox on every frame, and a phone browser draws no framed PDF at all. PDF.js draws pages onto
// canvases this page owns, so it works the same everywhere and needs nothing new from the page policy:
// its worker is a same-origin script (`worker-src 'self'`), WebAssembly is switched off (`useWasm`), so
// no `wasm-unsafe-eval` is needed, and it fetches nothing — the bytes are handed over in memory.
//
// Pages render when they come near the screen and give their canvas back when they leave it, so a
// long paper costs the pages in view, not all of them. ponytail: no text layer (no selection or
// search) and no bundled CMaps, so a PDF whose CJK fonts are not embedded may draw without its text.
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";

import { ft, useFleetLocale } from "@/lib/fleet-i18n";

// Vite emits the worker as an asset of this chunk and rewrites the URL to it.
GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).href;

/** How far outside the screen a page starts drawing, and how far it goes before it lets go. */
const NEAR = "1200px 0px";

export function FleetPdfView({ blob }: { blob: Blob }) {
  useFleetLocale();
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let loading: ReturnType<typeof getDocument> | null = null;
    setDoc(null);
    setFailed(false);
    void (async () => {
      try {
        const data = new Uint8Array(await blob.arrayBuffer());
        if (cancelled) return;
        loading = getDocument({ data, useWasm: false, enableXfa: false });
        const opened = await loading.promise;
        if (!cancelled) setDoc(opened);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      void loading?.destroy();
    };
  }, [blob]);

  if (failed) return <p className="px-4 py-6 text-sm text-muted-foreground">{ft("fleet.media.failed")}</p>;
  if (doc === null) return <p className="px-4 py-6 text-sm text-muted-foreground">{ft("fleet.media.loading")}</p>;
  return (
    <div className="flex flex-col gap-3 bg-muted/30 px-2 py-3" data-slot="fleet-pdf">
      <p className="px-2 text-xs text-muted-foreground tabular-nums">{ft("fleet.media.pages", { count: String(doc.numPages) })}</p>
      {Array.from({ length: doc.numPages }, (_, i) => (
        <PdfPage key={i} doc={doc} number={i + 1} />
      ))}
    </div>
  );
}

function PdfPage({ doc, number }: { doc: PDFDocumentProxy; number: number }) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [near, setNear] = useState(number <= 2);
  // Height over width; A4 until the page says otherwise, so the column does not jump while it loads.
  const [ratio, setRatio] = useState(297 / 210);

  useEffect(() => {
    const element = box.current;
    if (element === null || !("IntersectionObserver" in globalThis)) return;
    const observer = new IntersectionObserver((entries) => setNear(entries.some((entry) => entry.isIntersecting)), {
      rootMargin: NEAR,
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const target = canvas.current;
    const element = box.current;
    if (target === null || element === null) return;
    if (!near) {
      // Give the bitmap back: a canvas of zero size holds no pixels.
      target.width = 0;
      target.height = 0;
      return;
    }
    let cancelled = false;
    let task: { cancel: () => void } | null = null;
    void (async () => {
      try {
        const page = await doc.getPage(number);
        if (cancelled) return;
        const base = page.getViewport({ scale: 1 });
        setRatio(base.height / base.width);
        const scale = (Math.max(element.clientWidth, 1) / base.width) * Math.min(globalThis.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale });
        target.width = Math.floor(viewport.width);
        target.height = Math.floor(viewport.height);
        const render = page.render({ canvas: target, viewport });
        task = render;
        await render.promise;
      } catch {
        // A cancelled render rejects; a page that cannot draw stays blank rather than failing the file.
      }
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, number, near]);

  return (
    <div ref={box} style={{ aspectRatio: `1 / ${String(ratio)}` }} className="w-full overflow-hidden rounded bg-white shadow-xs">
      <canvas ref={canvas} aria-label={ft("fleet.media.page", { number: String(number) })} className="block h-full w-full" />
    </div>
  );
}
