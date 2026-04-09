"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, UserPlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { CRM_STATUS_OPTIONS } from "@/lib/crm-status";
import type { CatalogSong, Release } from "@/lib/supabase/types";
import {
  CrmAddCollaborationControls,
  type CrmCollabTarget,
} from "@/components/crm/CrmAddCollaborationControls";
import {
  CRM_CONTACT_WIZARD_STEPS,
  CrmContactWizardStepper,
  crmLabelOptional,
  crmLabelRequired,
} from "@/components/crm/crm-contact-wizard-ui";
import { CrmRoleField } from "@/components/crm/CrmRoleField";
import { cn } from "@/lib/utils/cn";

type PendingCollab = {
  tempId: string;
  kind: "release" | "catalog";
  targetId: string;
  displayTitle: string;
  note: string | null;
};

export type CrmNewContactFormProps = {
  showTitle?: boolean;
  onSuccess: (contactId: string) => void | Promise<void>;
  onCancel: () => void;
  /** Fires when a save request starts / ends (for modal backdrop guard). */
  onBusyChange?: (busy: boolean) => void;
};

export function CrmNewContactForm({
  showTitle = true,
  onSuccess,
  onCancel,
  onBusyChange,
}: CrmNewContactFormProps) {
  const embedded = !showTitle;
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameStepError, setNameStepError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [website, setWebsite] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [lastContacted, setLastContacted] = useState("");
  const [status, setStatus] = useState("active");

  const [releases, setReleases] = useState<Release[]>([]);
  const [catalogSongs, setCatalogSongs] = useState<CatalogSong[]>([]);
  const [picklistsLoading, setPicklistsLoading] = useState(true);

  const [collabSelection, setCollabSelection] = useState<CrmCollabTarget | null>(
    null
  );
  const [linkNote, setLinkNote] = useState("");
  const [pendingCollabs, setPendingCollabs] = useState<PendingCollab[]>([]);

  const loadPicklists = useCallback(async () => {
    setPicklistsLoading(true);
    const supabase = createClient();
    const [{ data: rels }, { data: songs }] = await Promise.all([
      supabase.from("releases").select("*").order("created_at", { ascending: false }),
      supabase.from("catalog_songs").select("*").order("title"),
    ]);
    setReleases((rels as Release[]) || []);
    setCatalogSongs((songs as CatalogSong[]) || []);
    setPicklistsLoading(false);
  }, []);

  useEffect(() => {
    void loadPicklists();
  }, [loadPicklists]);

  const canNext = (): boolean => {
    if (step === 0) return name.trim().length > 0;
    return true;
  };

  const handleNext = () => {
    if (step === 0) {
      if (!name.trim()) {
        setNameStepError("Name is required.");
        return;
      }
      setNameStepError(null);
    }
    setStep((s) => Math.min(s + 1, CRM_CONTACT_WIZARD_STEPS.length - 1));
  };

  const handleAddPendingCollab = () => {
    if (!collabSelection) return;
    setPendingCollabs((prev) => [
      ...prev,
      {
        tempId: crypto.randomUUID(),
        kind: collabSelection.kind,
        targetId: collabSelection.id,
        displayTitle: collabSelection.label,
        note: linkNote.trim() || null,
      },
    ]);
    setCollabSelection(null);
    setLinkNote("");
  };

  const runCreate = async () => {
    if (!name.trim()) {
      setError("Name is required.");
      setStep(0);
      setNameStepError("Name is required.");
      return;
    }
    setSaving(true);
    onBusyChange?.(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not signed in.");
      setSaving(false);
      onBusyChange?.(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("crm_contacts")
      .insert({
        user_id: user.id,
        name: name.trim(),
        email: email.trim() || null,
        instagram: instagram.trim() || null,
        tiktok: tiktok.trim() || null,
        website: website.trim() || null,
        roles,
        notes: notes.trim() || null,
        last_contacted_at: lastContacted || null,
        status,
      })
      .select("id")
      .single();

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      onBusyChange?.(false);
      return;
    }

    const contactId = data.id as string;
    const failed: string[] = [];

    for (const p of pendingCollabs) {
      const row =
        p.kind === "release"
          ? {
              contact_id: contactId,
              release_id: p.targetId,
              note: p.note,
            }
          : {
              contact_id: contactId,
              catalog_song_id: p.targetId,
              note: p.note,
            };
      const { error: cErr } = await supabase
        .from("crm_contact_collaborations")
        .insert(row);
      if (cErr) {
        failed.push(`${p.displayTitle}: ${cErr.message}`);
      }
    }

    if (failed.length) {
      window.alert(
        `Contact created. Some collaboration links could not be saved:\n\n${failed.join("\n")}\n\nYou can add or fix them on the contact page.`
      );
    }

    try {
      await onSuccess(contactId);
    } finally {
      setSaving(false);
      onBusyChange?.(false);
    }
  };

  const handleSubmitClick = () => {
    void runCreate();
  };

  /** Allow Enter on non-final steps from inputs without submitting the whole flow incorrectly. */
  const onFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (step < CRM_CONTACT_WIZARD_STEPS.length - 1) handleNext();
    else void runCreate();
  };

  return (
    <div className={showTitle ? undefined : "w-full min-w-0"}>
      {showTitle && (
        <h1 className="text-2xl font-bold text-white">New contact</h1>
      )}

      <CrmContactWizardStepper
        step={step}
        onGoToStep={setStep}
        embedded={embedded}
      />

      <form
        onSubmit={onFormSubmit}
        className={cn(
          "space-y-4",
          showTitle ? "max-w-xl" : "w-full min-w-0 max-w-none"
        )}
      >
        {error && (
          <p className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}

        {step === 0 && (
          <>
            <Input
              id="crm-new-contact-name"
              label={crmLabelRequired("Name")}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameStepError) setNameStepError(null);
              }}
              error={nameStepError ?? undefined}
              required
            />
            <Input
              id="crm-new-contact-email"
              label={crmLabelOptional("Email")}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <CrmRoleField
              id="crm-new-contact-role"
              label={crmLabelOptional("Roles")}
              value={roles}
              onChange={setRoles}
            />
            <Select
              id="crm-new-contact-status"
              label={crmLabelOptional("Status")}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={CRM_STATUS_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
            />
            <Input
              id="crm-new-contact-last-contacted"
              label={crmLabelOptional("Last contacted")}
              type="date"
              value={lastContacted}
              onChange={(e) => setLastContacted(e.target.value)}
            />
            <Textarea
              id="crm-new-contact-notes"
              label={crmLabelOptional("Notes")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Free-form notes…"
            />
          </>
        )}

        {step === 1 && (
          <>
            <Input
              id="crm-new-contact-instagram"
              label={crmLabelOptional("Instagram")}
              placeholder="@handle or URL"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
            />
            <Input
              id="crm-new-contact-tiktok"
              label={crmLabelOptional("TikTok")}
              placeholder="@handle or URL"
              value={tiktok}
              onChange={(e) => setTiktok(e.target.value)}
            />
            <Input
              id="crm-new-contact-website"
              label={crmLabelOptional("Website / other link")}
              placeholder="https://…"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </>
        )}

        {step === 2 && (
          <section className="border-t border-neutral-800 pt-6">
            <h2 className="text-sm font-medium text-white">
              Collaborations
              <span className="ml-1 whitespace-nowrap text-xs font-normal text-neutral-500">
                (optional)
              </span>
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Search releases and library songs in one list. Add multiple links
              (same title is fine with different context).
            </p>

            {pendingCollabs.length > 0 && (
              <ul className="mt-4 space-y-2">
                {pendingCollabs.map((p) => (
                  <li
                    key={p.tempId}
                    className="flex items-center justify-between gap-2 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200"
                  >
                    <span className="min-w-0 truncate">
                      <span className="text-neutral-500">
                        {p.kind === "release" ? "Release" : "Library"}:{" "}
                      </span>
                      {p.displayTitle}
                      {p.note ? (
                        <span className="text-neutral-500"> — {p.note}</span>
                      ) : null}
                    </span>
                    <button
                      type="button"
                      className="shrink-0 rounded p-1 text-neutral-500 hover:bg-neutral-800 hover:text-white"
                      aria-label="Remove collaboration"
                      onClick={() =>
                        setPendingCollabs((prev) =>
                          prev.filter((x) => x.tempId !== p.tempId)
                        )
                      }
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div
              className={cn(
                "mt-4 min-w-0",
                showTitle ? "max-w-2xl" : "w-full max-w-none"
              )}
            >
              <CrmAddCollaborationControls
                releases={releases}
                catalogSongs={catalogSongs}
                selection={collabSelection}
                onSelectionChange={setCollabSelection}
                linkNote={linkNote}
                onLinkNoteChange={setLinkNote}
                onAdd={handleAddPendingCollab}
                adding={false}
                picklistsLoading={picklistsLoading}
              />
            </div>
          </section>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep((s) => Math.max(s - 1, 0))}
              disabled={step === 0 || saving}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>

          {step < CRM_CONTACT_WIZARD_STEPS.length - 1 ? (
            <Button
              type="button"
              variant="studioMicroappPrimary"
              onClick={handleNext}
              disabled={!canNext() || saving}
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmitClick}
              loading={saving}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Create contact
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
