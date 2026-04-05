"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CatalogSong, Release } from "@/lib/supabase/types";
import {
  CrmCollaborationTargetPicker,
  type CrmCollabTarget,
} from "@/components/crm/CrmCollaborationTargetPicker";

export type { CrmCollabTarget };

type Props = {
  releases: Release[];
  catalogSongs: CatalogSong[];
  selection: CrmCollabTarget | null;
  onSelectionChange: (next: CrmCollabTarget | null) => void;
  linkNote: string;
  onLinkNoteChange: (note: string) => void;
  onAdd: () => void | Promise<void>;
  adding: boolean;
  picklistsLoading?: boolean;
};

export function CrmAddCollaborationControls({
  releases,
  catalogSongs,
  selection,
  onSelectionChange,
  linkNote,
  onLinkNoteChange,
  onAdd,
  adding,
  picklistsLoading = false,
}: Props) {
  const canAdd = !!selection && !picklistsLoading;

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
      <div className="min-w-0 flex-1 space-y-4">
        <CrmCollaborationTargetPicker
          releases={releases}
          catalogSongs={catalogSongs}
          value={selection}
          onChange={onSelectionChange}
          loading={picklistsLoading}
        />
        <Input
          label="Context (optional)"
          placeholder="e.g. Feb writing camp, mixing pass"
          value={linkNote}
          onChange={(e) => onLinkNoteChange(e.target.value)}
        />
      </div>
      <Button
        type="button"
        variant="secondary"
        className="shrink-0"
        disabled={!canAdd}
        loading={adding}
        onClick={() => void onAdd()}
      >
        Add link
      </Button>
    </div>
  );
}
