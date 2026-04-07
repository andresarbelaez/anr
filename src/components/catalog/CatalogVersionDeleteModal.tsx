"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Called when user confirms; parent runs delete and closes the modal on success. */
  onConfirm: () => void | Promise<void>;
  songTitle: string;
  versionLabel: string;
  busy?: boolean;
};

export function CatalogVersionDeleteModal({
  open,
  onClose,
  onConfirm,
  songTitle,
  versionLabel,
  busy = false,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[2500] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="catalog-version-delete-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label="Close dialog"
        disabled={busy}
        onClick={() => {
          if (!busy) onClose();
        }}
      />
      <div
        className={cn(
          "relative z-10 w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-950 p-6 shadow-xl"
        )}
      >
        <h2
          id="catalog-version-delete-title"
          className="text-lg font-semibold text-white"
        >
          Delete &ldquo;{songTitle}&rdquo;, &ldquo;{versionLabel}&rdquo;?
        </h2>

        <div className="mt-8 flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            loading={busy}
            onClick={() => void onConfirm()}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
