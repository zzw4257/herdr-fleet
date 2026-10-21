// DOWNSTREAM (FORK.toml editor-previews). Links from Fleet into the operator's browser editor, the
// Fleet setting `editor.url`. The editor previews what Files cannot (a PDF, a video, an HTML page
// that needs its script) and proxies loopback ports, so a dev server an agent started is reachable
// from the phone. Fleet only builds addresses: it reads no file and opens no port.

const LOOPBACK = new Set(["localhost", "127.0.0.1", "0.0.0.0", "[::1]"]);

/**
 * A loopback http address with a port, through the editor's port proxy; null for any other link.
 * ponytail: `/proxy/<port>` strips the prefix, so a dev server that emits absolute asset paths
 * needs its own base path; the editor's `/absproxy/` or a per-port domain is the upgrade.
 */
export function editorProxyHref(editor: string, href: string): string | null {
  if (!URL.canParse(href)) return null;
  const url = new URL(href);
  if (url.protocol !== "http:" || !LOOPBACK.has(url.hostname) || url.port === "") return null;
  return `${editor}/proxy/${url.port}${url.pathname}${url.search}${url.hash}`;
}

/** The editor opened on a folder of this machine. */
export function editorFolderHref(editor: string, folder: string): string {
  return `${editor}/?${new URLSearchParams({ folder })}`;
}

/** The editor opened on `folder` with the absolute `file` in front, through the workbench's payload. */
export function editorFileHref(editor: string, folder: string, file: string): string {
  const path = file.split("/").map(encodeURIComponent).join("/");
  const payload = JSON.stringify([["openFile", `vscode-remote://${new URL(editor).host}${path}`]]);
  return `${editor}/?${new URLSearchParams({ folder, payload })}`;
}

/** An external link as the page draws it: through the editor's proxy when it is loopback. */
export function fleetPreviewHref(editor: string | null, href: string): string {
  return editor === null ? href : (editorProxyHref(editor, href) ?? href);
}
