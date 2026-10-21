// DOWNSTREAM (FORK.toml journal-image-compat). A picture in Chat: a pasted image, or the screenshot a
// tool returned (computer use, a browser, an image viewer), drawn under the call that took it.
//
// The same rules as History's own picture (components/transcript-view.tsx): `imageSrc` decides whether
// the reference is loadable at all — inline bytes or this host's blob route, nothing else — and the
// bytes are loaded with the pairing token (`useAuthedUrl`), because an `<img src>` cannot send it. A
// reference it refuses draws nothing. A tap opens it in the preview panel's Screen tab, or full size
// in a new tab where no panel is on the page.
import { openPictureInPreview } from "@/components/fleet-preview-panel";
import { imageSrc } from "@/lib/api";
import { useAuthedUrl } from "@/lib/authed-url";
import { ft, useFleetLocale } from "@/lib/fleet-i18n";
import { useScope } from "@/lib/session";

export function FleetChatImage({ url }: { url: string }) {
  useFleetLocale();
  const scope = useScope();
  const { url: loaded } = useAuthedUrl(imageSrc(url, scope));
  if (loaded === null) return null;
  return (
    <div className="px-5 py-1" data-slot="fleet-chat-image">
      <a
        href={loaded}
        onClick={(event) => openPictureInPreview(event, url)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block cursor-zoom-in"
      >
        <img
          src={loaded}
          alt={ft("fleet.chat.imageAlt")}
          className="max-h-80 w-auto max-w-full rounded border object-contain shadow-xs"
          loading="lazy"
        />
      </a>
    </div>
  );
}
