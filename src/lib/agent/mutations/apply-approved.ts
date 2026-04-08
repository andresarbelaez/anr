import type { SupabaseClient } from "@supabase/supabase-js";
import {
  agentCalendarOccurrenceStub,
  applyCalendarOccurrenceDelete,
  applyCalendarOccurrenceSave,
  mergeCalendarPatchOntoMaster,
} from "@/lib/calendar/calendar-event-mutations";
import type { CalendarEvent, RecurringEditScope } from "@/lib/supabase/types";
import { CATALOG_MP3_BUCKET } from "@/lib/utils/catalog-mp3";
import { buildGuestListenUrl } from "@/lib/utils/public-app-url";
import { parseCrmRolesFromUnknown } from "@/lib/crm/crm-roles";
import {
  asUuid,
  copyAgentAttachmentToCatalogMp3,
  parseExistingCatalogMp3Path,
} from "./helpers";

export type ApplyMutationResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export async function applyApprovedMutation(
  supabase: SupabaseClient,
  toolName: string,
  args: Record<string, unknown>,
  userId: string
): Promise<ApplyMutationResult> {
  switch (toolName) {
    case "update_release": {
      const releaseId = asUuid(args.release_id);
      if (!releaseId) return { ok: false, message: "Invalid release_id" };
      const patch: Record<string, unknown> = {};
      if (typeof args.title === "string") patch.title = args.title.trim();
      if (typeof args.release_date === "string")
        patch.release_date = args.release_date.trim() || null;
      if (typeof args.type === "string" && ["single", "ep", "album"].includes(args.type))
        patch.type = args.type;
      if (args.genre !== undefined)
        patch.genre = typeof args.genre === "string" ? args.genre.trim() || null : null;
      if (args.description !== undefined)
        patch.description =
          typeof args.description === "string" ? args.description : null;
      if (Object.keys(patch).length === 0)
        return { ok: false, message: "No fields to update" };
      const { error } = await supabase
        .from("releases")
        .update(patch)
        .eq("id", releaseId);
      if (error) return { ok: false, message: error.message };
      return { ok: true, message: "Release updated." };
    }
    case "delete_draft_release": {
      const releaseId = asUuid(args.release_id);
      if (!releaseId) return { ok: false, message: "Invalid release_id" };
      const { data: rel, error: selErr } = await supabase
        .from("releases")
        .select("id,status")
        .eq("id", releaseId)
        .maybeSingle();
      if (selErr) return { ok: false, message: selErr.message };
      if (!rel) return { ok: false, message: "Release not found." };
      if (rel.status !== "draft") {
        return {
          ok: false,
          message: `Only draft releases can be deleted (current status: ${rel.status}).`,
        };
      }
      const { error } = await supabase.from("releases").delete().eq("id", releaseId);
      if (error) return { ok: false, message: error.message };
      return { ok: true, message: "Draft release deleted." };
    }
    case "create_release": {
      const title =
        typeof args.title === "string" && args.title.trim()
          ? args.title.trim()
          : "";
      if (!title) return { ok: false, message: "Title is required" };
      const type =
        args.type === "ep" || args.type === "album" || args.type === "single"
          ? args.type
          : "single";
      const row: Record<string, unknown> = {
        user_id: userId,
        title,
        type,
        status: "draft",
        genre:
          args.genre === null || args.genre === undefined
            ? null
            : typeof args.genre === "string"
              ? args.genre.trim() || null
              : null,
        description:
          args.description === null || args.description === undefined
            ? null
            : typeof args.description === "string"
              ? args.description
              : null,
        release_date:
          args.release_date === null || args.release_date === undefined
            ? null
            : typeof args.release_date === "string"
              ? args.release_date.trim() || null
              : null,
      };
      const { data: created, error } = await supabase
        .from("releases")
        .insert(row)
        .select("id")
        .single();
      if (error) return { ok: false, message: error.message };
      const hint = created?.id ? ` (id ${String(created.id).slice(0, 8)}…)` : "";
      return { ok: true, message: `Draft release created${hint}.` };
    }
    case "create_catalog_song": {
      const title =
        typeof args.title === "string" && args.title.trim()
          ? args.title.trim()
          : "";
      if (!title) return { ok: false, message: "Title is required" };
      let releaseId: string | null = null;
      if (args.release_id !== undefined && args.release_id !== null) {
        if (typeof args.release_id !== "string" || !args.release_id.trim()) {
          releaseId = null;
        } else {
          releaseId = asUuid(args.release_id);
          if (!releaseId) return { ok: false, message: "Invalid release_id" };
        }
      }
      const { data: created, error } = await supabase
        .from("catalog_songs")
        .insert({
          user_id: userId,
          title,
          release_id: releaseId,
        })
        .select("id")
        .single();
      if (error) return { ok: false, message: error.message };
      const hint = created?.id ? ` (id ${String(created.id).slice(0, 8)}…)` : "";
      return { ok: true, message: `Library song created${hint}.` };
    }
    case "create_catalog_song_version": {
      const songId = asUuid(args.song_id);
      if (!songId) return { ok: false, message: "Invalid song_id" };
      const displayName =
        typeof args.file_name === "string" && args.file_name.trim()
          ? args.file_name.trim()
          : "";
      if (!displayName) return { ok: false, message: "file_name required" };
      let storagePath: string;
      if (
        typeof args.agent_attachment_path === "string" &&
        args.agent_attachment_path.trim()
      ) {
        const copied = await copyAgentAttachmentToCatalogMp3(
          supabase,
          userId,
          songId,
          args.agent_attachment_path,
          displayName
        );
        if (!copied.ok) return { ok: false, message: copied.message };
        storagePath = copied.storagePath;
      } else if (
        typeof args.existing_catalog_mp3_path === "string" &&
        args.existing_catalog_mp3_path.trim()
      ) {
        const parsed = parseExistingCatalogMp3Path(
          userId,
          songId,
          args.existing_catalog_mp3_path
        );
        if (!parsed.ok) return { ok: false, message: parsed.message };
        const probe = await supabase.storage
          .from(CATALOG_MP3_BUCKET)
          .download(parsed.path);
        if (probe.error || !probe.data) {
          return {
            ok: false,
            message: "existing_catalog_mp3_path not found in catalog_mp3.",
          };
        }
        storagePath = parsed.path;
      } else {
        return {
          ok: false,
          message: "Provide agent_attachment_path or existing_catalog_mp3_path",
        };
      }
      const label =
        args.label === null || args.label === undefined
          ? null
          : typeof args.label === "string"
            ? args.label.trim() || null
            : null;
      const { data: ver, error: insErr } = await supabase
        .from("catalog_song_versions")
        .insert({
          catalog_song_id: songId,
          label,
          storage_path: storagePath,
          file_name: displayName,
        })
        .select("id")
        .single();
      if (insErr) {
        await supabase.storage.from(CATALOG_MP3_BUCKET).remove([storagePath]);
        return { ok: false, message: insErr.message };
      }
      const vh = ver?.id ? ` (version ${String(ver.id).slice(0, 8)}…)` : "";
      return { ok: true, message: `Library MP3 version added${vh}.` };
    }
    case "update_catalog_song_version": {
      const versionId = asUuid(args.version_id);
      if (!versionId) return { ok: false, message: "Invalid version_id" };
      const patch: Record<string, unknown> = {};
      if (args.label !== undefined) {
        patch.label =
          typeof args.label === "string" ? args.label.trim() || null : null;
      }
      if (args.file_name !== undefined) {
        patch.file_name =
          typeof args.file_name === "string" ? args.file_name.trim() : null;
      }
      if (Object.keys(patch).length === 0)
        return { ok: false, message: "No fields to update" };
      const { error } = await supabase
        .from("catalog_song_versions")
        .update(patch)
        .eq("id", versionId);
      if (error) return { ok: false, message: error.message };
      return { ok: true, message: "Library version updated." };
    }
    case "delete_catalog_song_version": {
      const versionId = asUuid(args.version_id);
      if (!versionId) return { ok: false, message: "Invalid version_id" };
      const { data: ver, error: vErr } = await supabase
        .from("catalog_song_versions")
        .select("storage_path")
        .eq("id", versionId)
        .maybeSingle();
      if (vErr) return { ok: false, message: vErr.message };
      if (!ver?.storage_path)
        return { ok: false, message: "Version not found." };
      await supabase.storage
        .from(CATALOG_MP3_BUCKET)
        .remove([ver.storage_path as string]);
      const { error } = await supabase
        .from("catalog_song_versions")
        .delete()
        .eq("id", versionId);
      if (error) return { ok: false, message: error.message };
      return { ok: true, message: "Library version removed." };
    }
    case "create_feedback_link": {
      const versionId = asUuid(args.version_id);
      if (!versionId) return { ok: false, message: "Invalid version_id" };
      const { data: dup } = await supabase
        .from("feedback_version_links")
        .select("id")
        .eq("catalog_song_version_id", versionId)
        .maybeSingle();
      if (dup) {
        return {
          ok: false,
          message:
            "This version already has a feedback link. Use set_feedback_link_enabled with its link_id, or list_feedback_links.",
        };
      }
      const { data: link, error } = await supabase
        .from("feedback_version_links")
        .insert({ catalog_song_version_id: versionId })
        .select("id, token")
        .single();
      if (error) return { ok: false, message: error.message };
      const fullToken = link?.token ? String(link.token) : "";
      const guestUrl = buildGuestListenUrl(fullToken);
      return {
        ok: true,
        message: guestUrl
          ? `Feedback link created. Guest listen URL: ${guestUrl}`
          : "Feedback link created.",
      };
    }
    case "update_catalog_song": {
      const songId = asUuid(args.song_id);
      if (!songId) return { ok: false, message: "Invalid song_id" };
      const patch: Record<string, unknown> = {};
      if (typeof args.title === "string") patch.title = args.title.trim();
      if (args.unlink_from_release === true) patch.release_id = null;
      else if (args.release_id !== undefined) {
        const rid = asUuid(args.release_id);
        if (!rid) return { ok: false, message: "Invalid release_id" };
        patch.release_id = rid;
      }
      if (Object.keys(patch).length === 0)
        return { ok: false, message: "No fields to update" };
      const { error } = await supabase
        .from("catalog_songs")
        .update(patch)
        .eq("id", songId);
      if (error) return { ok: false, message: error.message };
      return { ok: true, message: "Library song updated." };
    }
    case "delete_catalog_song": {
      const songId = asUuid(args.song_id);
      if (!songId) return { ok: false, message: "Invalid song_id" };
      const { data: versions, error: vErr } = await supabase
        .from("catalog_song_versions")
        .select("storage_path")
        .eq("catalog_song_id", songId);
      if (vErr) return { ok: false, message: vErr.message };
      const paths = (versions ?? [])
        .map((v) =>
          v &&
          typeof (v as { storage_path?: unknown }).storage_path === "string"
            ? String((v as { storage_path: string }).storage_path).trim()
            : ""
        )
        .filter(Boolean);
      if (paths.length > 0) {
        const { error: rmErr } = await supabase.storage
          .from(CATALOG_MP3_BUCKET)
          .remove(paths);
        if (rmErr) return { ok: false, message: rmErr.message };
      }
      const { error } = await supabase.from("catalog_songs").delete().eq("id", songId);
      if (error) return { ok: false, message: error.message };
      return { ok: true, message: "Library song deleted." };
    }
    case "set_feedback_link_enabled": {
      const linkId = asUuid(args.link_id);
      if (!linkId) return { ok: false, message: "Invalid link_id" };
      if (typeof args.enabled !== "boolean")
        return { ok: false, message: "Invalid enabled flag" };
      const { error } = await supabase
        .from("feedback_version_links")
        .update({ enabled: args.enabled })
        .eq("id", linkId);
      if (error) return { ok: false, message: error.message };
      return {
        ok: true,
        message: args.enabled ? "Feedback link enabled." : "Feedback link disabled.",
      };
    }
    case "create_crm_contact": {
      const name =
        typeof args.name === "string" && args.name.trim()
          ? args.name.trim()
          : null;
      if (!name) return { ok: false, message: "Name is required" };
      const row: Record<string, unknown> = {
        user_id: userId,
        name,
        email:
          args.email === null || args.email === undefined
            ? null
            : typeof args.email === "string"
              ? args.email.trim() || null
              : null,
        instagram:
          args.instagram === null || args.instagram === undefined
            ? null
            : typeof args.instagram === "string"
              ? args.instagram.trim() || null
              : null,
        tiktok:
          args.tiktok === null || args.tiktok === undefined
            ? null
            : typeof args.tiktok === "string"
              ? args.tiktok.trim() || null
              : null,
        website:
          args.website === null || args.website === undefined
            ? null
            : typeof args.website === "string"
              ? args.website.trim() || null
              : null,
        roles: parseCrmRolesFromUnknown(
          args.roles !== undefined ? args.roles : args.role
        ),
        notes:
          args.notes === null || args.notes === undefined
            ? null
            : typeof args.notes === "string"
              ? args.notes
              : null,
        last_contacted_at:
          args.last_contacted_at === null ||
          args.last_contacted_at === undefined
            ? null
            : typeof args.last_contacted_at === "string"
              ? args.last_contacted_at.trim() || null
              : null,
        status:
          typeof args.status === "string" && args.status.trim()
            ? args.status.trim()
            : "active",
      };
      const { data: created, error } = await supabase
        .from("crm_contacts")
        .insert(row)
        .select("id")
        .single();
      if (error) return { ok: false, message: error.message };
      const idHint = created?.id
        ? ` (id ${String(created.id).slice(0, 8)}…)`
        : "";
      return { ok: true, message: `Contact created${idHint}.` };
    }
    case "update_crm_contact": {
      const contactId = asUuid(args.contact_id);
      if (!contactId) return { ok: false, message: "Invalid contact_id" };
      const patch: Record<string, unknown> = {};
      for (const k of [
        "name",
        "email",
        "instagram",
        "tiktok",
        "website",
        "notes",
        "status",
        "last_contacted_at",
      ] as const) {
        if (args[k] !== undefined) patch[k] = args[k];
      }
      if (args.roles !== undefined) {
        patch.roles = parseCrmRolesFromUnknown(args.roles);
      } else if (args.role !== undefined) {
        patch.roles = parseCrmRolesFromUnknown(args.role);
      }
      if (Object.keys(patch).length === 0)
        return { ok: false, message: "No fields to update" };
      const { error } = await supabase
        .from("crm_contacts")
        .update(patch)
        .eq("id", contactId);
      if (error) return { ok: false, message: error.message };
      return { ok: true, message: "Contact updated." };
    }
    case "delete_crm_contact": {
      const contactId = asUuid(args.contact_id);
      if (!contactId) return { ok: false, message: "Invalid contact_id" };
      const { error } = await supabase.from("crm_contacts").delete().eq("id", contactId);
      if (error) return { ok: false, message: error.message };
      return { ok: true, message: "Contact deleted." };
    }
    case "create_calendar_event": {
      const payload: Record<string, unknown> = {
        user_id: userId,
        title: args.title,
        start_at: args.start_at,
      };
      if (args.end_at !== undefined) payload.end_at = args.end_at;
      if (args.all_day !== undefined) payload.all_day = args.all_day;
      if (args.description !== undefined) payload.description = args.description;
      if (args.color !== undefined) payload.color = args.color;
      if (args.location !== undefined) payload.location = args.location;
      if (args.link !== undefined) payload.link = args.link;
      if (args.recurrence !== undefined) payload.recurrence = args.recurrence;
      const { error } = await supabase.from("calendar_events").insert(payload);
      if (error) return { ok: false, message: error.message };
      return { ok: true, message: `Calendar event "${args.title as string}" created.` };
    }
    case "update_calendar_event": {
      const eventId = asUuid(args.event_id);
      if (!eventId) return { ok: false, message: "Invalid event_id" };
      const scope = args.scope as string;
      const occDate = typeof args.occurrence_date === "string" ? args.occurrence_date : null;

      const { data: master, error: masterErr } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("id", eventId)
        .maybeSingle();
      if (masterErr || !master) return { ok: false, message: masterErr?.message ?? "Event not found" };

      const patch: Record<string, unknown> = {};
      if (args.title !== undefined) patch.title = args.title;
      if (args.start_at !== undefined) patch.start_at = args.start_at;
      if (args.end_at !== undefined) patch.end_at = args.end_at;
      if (args.all_day !== undefined) patch.all_day = args.all_day;
      if (args.description !== undefined) patch.description = args.description;
      if (args.color !== undefined) patch.color = args.color;
      if (args.location !== undefined) patch.location = args.location;
      if (args.link !== undefined) patch.link = args.link;
      if (args.recurrence !== undefined) patch.recurrence = args.recurrence;

      if (!scope || scope === "all") {
        const { error } = await supabase.from("calendar_events").update(patch).eq("id", eventId);
        if (error) return { ok: false, message: error.message };
      } else if ((scope === "this" || scope === "following") && occDate) {
        const payload = mergeCalendarPatchOntoMaster(
          master as CalendarEvent,
          patch,
          userId
        );
        const startOverride =
          typeof args.start_at === "string" ? args.start_at : undefined;
        const occurrence = agentCalendarOccurrenceStub(
          master as CalendarEvent,
          occDate,
          startOverride
        );
        const r = await applyCalendarOccurrenceSave(supabase, {
          masterEvent: master as CalendarEvent,
          occurrence,
          payload,
          scope: scope as RecurringEditScope,
        });
        if (r.error) return { ok: false, message: r.error.message };
      } else {
        return {
          ok: false,
          message:
            "Recurring update requires scope (this|following|all) and occurrence_date when not updating the full series.",
        };
      }
      return { ok: true, message: "Calendar event updated." };
    }
    case "delete_calendar_event": {
      const eventId = asUuid(args.event_id);
      if (!eventId) return { ok: false, message: "Invalid event_id" };
      const scope = args.scope as string;
      const occDate = typeof args.occurrence_date === "string" ? args.occurrence_date : null;

      const { data: master, error: masterErr } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("id", eventId)
        .maybeSingle();
      if (masterErr || !master) return { ok: false, message: masterErr?.message ?? "Event not found" };

      if (!scope || scope === "all") {
        const { error } = await supabase.from("calendar_events").delete().eq("id", eventId);
        if (error) return { ok: false, message: error.message };
      } else if ((scope === "this" || scope === "following") && occDate) {
        const occurrence = agentCalendarOccurrenceStub(
          master as CalendarEvent,
          occDate,
          typeof args.start_at === "string" ? args.start_at : undefined
        );
        const r = await applyCalendarOccurrenceDelete(supabase, {
          masterEvent: master as CalendarEvent,
          occurrence,
          scope: scope as RecurringEditScope,
        });
        if (r.error) return { ok: false, message: r.error.message };
      } else {
        return {
          ok: false,
          message:
            "Recurring delete requires scope (this|following|all) and occurrence_date when not deleting the full series.",
        };
      }
      return { ok: true, message: "Calendar event deleted." };
    }
    default:
      return { ok: false, message: `Unknown tool: ${toolName}` };
  }
}
