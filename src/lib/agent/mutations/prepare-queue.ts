import { parseCrmRolesFromUnknown } from "@/lib/crm/crm-roles";
import {
  asBool,
  asNonEmptyString,
  asOptionalString,
  asUuid,
  buildUpdateReleaseSummary,
  isSafeRelPath,
  parseExistingCatalogMp3Path,
  stripStoragePath,
} from "./helpers";

export type QueuePrepareError = { content: string };
export type QueuePrepareOk = { cleanArgs: Record<string, unknown>; summary: string };

export function prepareMutationForQueue(
  name: string,
  args: Record<string, unknown>,
  ctx: { userId: string }
): QueuePrepareError | QueuePrepareOk {
  let summary = "";
  const cleanArgs: Record<string, unknown> = {};

  switch (name) {
    case "update_release": {
      const releaseId = asUuid(args.release_id);
      if (!releaseId) {
        return {
          content: JSON.stringify({ error: "update_release: valid release_id required" }),
        };
      }
      const title = asNonEmptyString(args.title);
      const releaseDate = asNonEmptyString(args.release_date);
      const type = asNonEmptyString(args.type);
      const genre = asOptionalString(args.genre);
      const description = asOptionalString(args.description);
      if (
        title === undefined &&
        releaseDate === undefined &&
        type === undefined &&
        genre === undefined &&
        description === undefined
      ) {
        return {
          content: JSON.stringify({
            error:
              "update_release: pass at least one of title, release_date, type, genre, description",
          }),
        };
      }
      if (type && !["single", "ep", "album"].includes(type)) {
        return {
          content: JSON.stringify({ error: "update_release: type must be single, ep, or album" }),
        };
      }
      cleanArgs.release_id = releaseId;
      if (title !== undefined) cleanArgs.title = title;
      if (releaseDate !== undefined) cleanArgs.release_date = releaseDate;
      if (type !== undefined) cleanArgs.type = type;
      if (genre !== undefined) cleanArgs.genre = genre.trim() || null;
      if (description !== undefined) cleanArgs.description = description;
      summary = buildUpdateReleaseSummary(releaseId, cleanArgs);
      break;
    }
    case "delete_draft_release": {
      const releaseId = asUuid(args.release_id);
      if (!releaseId) {
        return {
          content: JSON.stringify({
            error: "delete_draft_release: valid release_id required",
          }),
        };
      }
      cleanArgs.release_id = releaseId;
      summary = `Delete draft release ${releaseId.slice(0, 8)}… (cascades tracks if draft)`;
      break;
    }
    case "create_release": {
      const title = asNonEmptyString(args.title);
      if (!title) {
        return {
          content: JSON.stringify({
            error: "create_release: non-empty title required",
          }),
        };
      }
      const type = asNonEmptyString(args.type) ?? "single";
      if (!["single", "ep", "album"].includes(type)) {
        return {
          content: JSON.stringify({
            error: "create_release: type must be single, ep, or album",
          }),
        };
      }
      cleanArgs.title = title;
      cleanArgs.type = type;
      if (asOptionalString(args.genre) !== undefined) {
        cleanArgs.genre = asNonEmptyString(args.genre)?.trim() || null;
      }
      if (asOptionalString(args.description) !== undefined) {
        cleanArgs.description = asOptionalString(args.description) ?? null;
      }
      if (asOptionalString(args.release_date) !== undefined) {
        const d = asNonEmptyString(args.release_date);
        cleanArgs.release_date = d ?? null;
      }
      summary = `Create draft release "${title}" (${type})`;
      break;
    }
    case "create_catalog_song": {
      const title = asNonEmptyString(args.title);
      if (!title) {
        return {
          content: JSON.stringify({
            error: "create_catalog_song: non-empty title required",
          }),
        };
      }
      cleanArgs.title = title;
      if (args.release_id !== undefined && args.release_id !== null) {
        const rid =
          typeof args.release_id === "string" && args.release_id.trim()
            ? asUuid(args.release_id)
            : null;
        if (typeof args.release_id === "string" && args.release_id.trim() && !rid) {
          return {
            content: JSON.stringify({
              error: "create_catalog_song: invalid release_id",
            }),
          };
        }
        if (rid) cleanArgs.release_id = rid;
      }
      summary = `Create library song "${title}"`;
      if (cleanArgs.release_id) {
        summary += ` (link release ${String(cleanArgs.release_id).slice(0, 8)}…)`;
      }
      break;
    }
    case "update_catalog_song": {
      const songId = asUuid(args.song_id);
      if (!songId) {
        return {
          content: JSON.stringify({
            error: "update_catalog_song: valid song_id required",
          }),
        };
      }
      const title = asNonEmptyString(args.title);
      const releaseId = asUuid(args.release_id);
      const unlink = asBool(args.unlink_from_release) === true;
      if (unlink && releaseId) {
        return {
          content: JSON.stringify({
            error: "update_catalog_song: do not pass both unlink_from_release and release_id",
          }),
        };
      }
      if (title === undefined && releaseId === undefined && !unlink) {
        return {
          content: JSON.stringify({
            error:
              "update_catalog_song: pass title, release_id, and/or unlink_from_release",
          }),
        };
      }
      cleanArgs.song_id = songId;
      if (title !== undefined) cleanArgs.title = title;
      if (unlink) cleanArgs.unlink_from_release = true;
      else if (releaseId !== undefined) cleanArgs.release_id = releaseId;
      summary = `Update library song ${songId.slice(0, 8)}…`;
      if (title) summary += ` title "${title}"`;
      if (unlink) summary += "; unlink from release";
      else if (releaseId) summary += `; link release ${releaseId.slice(0, 8)}…`;
      break;
    }
    case "delete_catalog_song": {
      const songId = asUuid(args.song_id);
      if (!songId) {
        return {
          content: JSON.stringify({
            error: "delete_catalog_song: valid song_id required",
          }),
        };
      }
      cleanArgs.song_id = songId;
      summary = `Permanently delete library song ${songId.slice(0, 8)}… (versions + feedback link)`;
      break;
    }
    case "create_catalog_song_version": {
      const songId = asUuid(args.song_id);
      if (!songId) {
        return {
          content: JSON.stringify({
            error: "create_catalog_song_version: valid song_id required",
          }),
        };
      }
      const fileName = asNonEmptyString(args.file_name);
      if (!fileName) {
        return {
          content: JSON.stringify({
            error:
              "create_catalog_song_version: file_name required (audio extension, e.g. .mp3, .wav, .m4a)",
          }),
        };
      }
      const agentPath = asNonEmptyString(args.agent_attachment_path);
      const existingPath = asNonEmptyString(args.existing_catalog_mp3_path);
      if ((!agentPath && !existingPath) || (agentPath && existingPath)) {
        return {
          content: JSON.stringify({
            error:
              "create_catalog_song_version: pass exactly one of agent_attachment_path or existing_catalog_mp3_path",
          }),
        };
      }
      if (agentPath) {
        const ap = stripStoragePath(agentPath);
        if (
          !isSafeRelPath(ap) ||
          !ap.startsWith(`${ctx.userId}/`)
        ) {
          return {
            content: JSON.stringify({
              error:
                "agent_attachment_path must match your user id (see attachment line in chat).",
            }),
          };
        }
        cleanArgs.agent_attachment_path = ap;
      }
      if (existingPath) {
        const parsed = parseExistingCatalogMp3Path(
          ctx.userId,
          songId,
          existingPath
        );
        if (!parsed.ok) {
          return { content: JSON.stringify({ error: parsed.message }) };
        }
        cleanArgs.existing_catalog_mp3_path = parsed.path;
      }
      cleanArgs.song_id = songId;
      cleanArgs.file_name = fileName;
      if (asOptionalString(args.label) !== undefined) {
        cleanArgs.label = asNonEmptyString(args.label) ?? null;
      }
      summary = `Add audio version "${fileName}" to song ${songId.slice(0, 8)}…`;
      break;
    }
    case "update_catalog_song_version": {
      const versionId = asUuid(args.version_id);
      if (!versionId) {
        return {
          content: JSON.stringify({
            error: "update_catalog_song_version: valid version_id required",
          }),
        };
      }
      const label = asOptionalString(args.label);
      const fn = asOptionalString(args.file_name);
      if (
        label === undefined &&
        fn === undefined
      ) {
        return {
          content: JSON.stringify({
            error:
              "update_catalog_song_version: pass label and/or file_name to change",
          }),
        };
      }
      cleanArgs.version_id = versionId;
      if (label !== undefined) cleanArgs.label = label.trim() || null;
      if (fn !== undefined) cleanArgs.file_name = fn.trim() || null;
      summary = `Update library version ${versionId.slice(0, 8)}…`;
      break;
    }
    case "delete_catalog_song_version": {
      const versionId = asUuid(args.version_id);
      if (!versionId) {
        return {
          content: JSON.stringify({
            error: "delete_catalog_song_version: valid version_id required",
          }),
        };
      }
      cleanArgs.version_id = versionId;
      summary = `Delete library audio version ${versionId.slice(0, 8)}…`;
      break;
    }
    case "create_feedback_link": {
      const versionId = asUuid(args.version_id);
      if (!versionId) {
        return {
          content: JSON.stringify({
            error: "create_feedback_link: valid version_id required",
          }),
        };
      }
      cleanArgs.version_id = versionId;
      summary = `Create feedback/listen link for version ${versionId.slice(0, 8)}…`;
      break;
    }
    case "set_feedback_link_enabled": {
      const linkId = asUuid(args.link_id);
      const enabled = asBool(args.enabled);
      if (!linkId || enabled === undefined) {
        return {
          content: JSON.stringify({
            error: "set_feedback_link_enabled: link_id and enabled boolean required",
          }),
        };
      }
      cleanArgs.link_id = linkId;
      cleanArgs.enabled = enabled;
      summary = `${enabled ? "Enable" : "Disable"} feedback link ${linkId.slice(0, 8)}…`;
      break;
    }
    case "create_crm_contact": {
      const name = asNonEmptyString(args.name);
      if (!name) {
        return {
          content: JSON.stringify({
            error: "create_crm_contact: non-empty name required",
          }),
        };
      }
      cleanArgs.name = name;
      if (asOptionalString(args.email) !== undefined) {
        cleanArgs.email = asOptionalString(args.email)?.trim() || null;
      }
      if (asOptionalString(args.instagram) !== undefined) {
        cleanArgs.instagram = asOptionalString(args.instagram)?.trim() || null;
      }
      if (asOptionalString(args.tiktok) !== undefined) {
        cleanArgs.tiktok = asOptionalString(args.tiktok)?.trim() || null;
      }
      if (asOptionalString(args.website) !== undefined) {
        cleanArgs.website = asOptionalString(args.website)?.trim() || null;
      }
      if (args.roles !== undefined || args.role !== undefined) {
        cleanArgs.roles = parseCrmRolesFromUnknown(
          args.roles !== undefined ? args.roles : args.role
        );
      }
      if (asOptionalString(args.notes) !== undefined) {
        cleanArgs.notes = asOptionalString(args.notes) ?? null;
      }
      if (asOptionalString(args.last_contacted_at) !== undefined) {
        const d = asNonEmptyString(args.last_contacted_at);
        cleanArgs.last_contacted_at = d ?? null;
      }
      if (asOptionalString(args.status) !== undefined) {
        cleanArgs.status = asNonEmptyString(args.status) ?? "active";
      }
      summary = `Create contact "${name}"`;
      break;
    }
    case "update_crm_contact": {
      const contactId = asUuid(args.contact_id);
      if (!contactId) {
        return {
          content: JSON.stringify({
            error: "update_crm_contact: valid contact_id required",
          }),
        };
      }
      const patch: Record<string, unknown> = {};
      if (asOptionalString(args.name) !== undefined)
        patch.name = asNonEmptyString(args.name) ?? "";
      if (asOptionalString(args.email) !== undefined)
        patch.email = asOptionalString(args.email)?.trim() || null;
      if (asOptionalString(args.instagram) !== undefined)
        patch.instagram = asOptionalString(args.instagram)?.trim() || null;
      if (asOptionalString(args.tiktok) !== undefined)
        patch.tiktok = asOptionalString(args.tiktok)?.trim() || null;
      if (asOptionalString(args.website) !== undefined)
        patch.website = asOptionalString(args.website)?.trim() || null;
      if (args.roles !== undefined) {
        patch.roles = parseCrmRolesFromUnknown(args.roles);
      } else if (args.role !== undefined) {
        patch.roles = parseCrmRolesFromUnknown(args.role);
      }
      if (asOptionalString(args.notes) !== undefined)
        patch.notes = asOptionalString(args.notes) ?? null;
      if (asOptionalString(args.last_contacted_at) !== undefined) {
        const d = asNonEmptyString(args.last_contacted_at);
        patch.last_contacted_at = d ?? null;
      }
      if (asOptionalString(args.status) !== undefined)
        patch.status = asNonEmptyString(args.status) ?? "active";
      if (Object.keys(patch).length === 0) {
        return {
          content: JSON.stringify({
            error: "update_crm_contact: pass at least one field to change",
          }),
        };
      }
      cleanArgs.contact_id = contactId;
      Object.assign(cleanArgs, patch);
      summary = `Update contact ${contactId.slice(0, 8)}… (${Object.keys(patch).join(", ")})`;
      break;
    }
    case "delete_crm_contact": {
      const contactId = asUuid(args.contact_id);
      if (!contactId) {
        return {
          content: JSON.stringify({
            error: "delete_crm_contact: valid contact_id required",
          }),
        };
      }
      cleanArgs.contact_id = contactId;
      summary = `Delete contact ${contactId.slice(0, 8)}…`;
      break;
    }
    case "create_calendar_event": {
      const title = asNonEmptyString(args.title);
      const startAt = asNonEmptyString(args.start_at);
      if (!title || !startAt) {
        return { content: JSON.stringify({ error: "create_calendar_event: title and start_at required" }) };
      }
      cleanArgs.title = title;
      cleanArgs.start_at = startAt;
      if (args.end_at !== undefined) cleanArgs.end_at = args.end_at;
      if (typeof args.all_day === "boolean") cleanArgs.all_day = args.all_day;
      if (args.description !== undefined) cleanArgs.description = args.description;
      if (args.color !== undefined) cleanArgs.color = args.color;
      if (args.location !== undefined) cleanArgs.location = args.location;
      if (args.link !== undefined) cleanArgs.link = args.link;
      if (args.recurrence !== undefined) cleanArgs.recurrence = args.recurrence;
      summary = `Create calendar event "${title}"`;
      break;
    }
    case "update_calendar_event": {
      const eventId = asUuid(args.event_id);
      if (!eventId) {
        return { content: JSON.stringify({ error: "update_calendar_event: valid event_id required" }) };
      }
      const scope = args.scope as string;
      if (!["this", "following", "all"].includes(scope)) {
        return { content: JSON.stringify({ error: "update_calendar_event: scope must be 'this', 'following', or 'all'" }) };
      }
      if ((scope === "this" || scope === "following") && !asNonEmptyString(args.occurrence_date)) {
        return { content: JSON.stringify({ error: "update_calendar_event: occurrence_date required for scope 'this' or 'following'" }) };
      }
      cleanArgs.event_id = eventId;
      cleanArgs.scope = scope;
      if (args.occurrence_date) cleanArgs.occurrence_date = args.occurrence_date;
      if (args.title !== undefined) cleanArgs.title = args.title;
      if (args.start_at !== undefined) cleanArgs.start_at = args.start_at;
      if (args.end_at !== undefined) cleanArgs.end_at = args.end_at;
      if (typeof args.all_day === "boolean") cleanArgs.all_day = args.all_day;
      if (args.description !== undefined) cleanArgs.description = args.description;
      if (args.color !== undefined) cleanArgs.color = args.color;
      if (args.location !== undefined) cleanArgs.location = args.location;
      if (args.link !== undefined) cleanArgs.link = args.link;
      if (args.recurrence !== undefined) cleanArgs.recurrence = args.recurrence;
      summary = `Update calendar event ${eventId.slice(0, 8)}… (${scope})`;
      break;
    }
    case "delete_calendar_event": {
      const eventId = asUuid(args.event_id);
      if (!eventId) {
        return { content: JSON.stringify({ error: "delete_calendar_event: valid event_id required" }) };
      }
      const scope = args.scope as string;
      if (!["this", "following", "all"].includes(scope)) {
        return { content: JSON.stringify({ error: "delete_calendar_event: scope must be 'this', 'following', or 'all'" }) };
      }
      cleanArgs.event_id = eventId;
      cleanArgs.scope = scope;
      if (args.occurrence_date) cleanArgs.occurrence_date = args.occurrence_date;
      summary = `Delete calendar event ${eventId.slice(0, 8)}… (${scope})`;
      break;
    }
    default:
      return { content: JSON.stringify({ error: `Unknown mutation tool: ${name}` }) };
  }
  return { cleanArgs, summary };
}
