import { QUEUED_BUTTON } from "@/components/queued-block";
import { Button } from "@/components/ui/button";
import { ft, useFleetLocale } from "@/lib/fleet-i18n";

/** Dismiss the receipt only; the parent reuses its metadata-only DELETE action. */
export function FleetHeldDismiss({ disabled, onDismiss }: { disabled: boolean; onDismiss: () => void }) {
  useFleetLocale();
  if (import.meta.env.VITE_HERDR_FLEET !== "1") return null;
  return (
    <Button type="button" variant="outline" size="sm" className={QUEUED_BUTTON} disabled={disabled} title={ft("fleet.send.dismissNoticeHint")} onClick={onDismiss}>
      {ft("fleet.send.dismissNotice")}
    </Button>
  );
}
