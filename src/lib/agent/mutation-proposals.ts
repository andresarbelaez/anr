import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CATALOG_MP3_BUCKET, safeStorageFileName } from "@/lib/utils/catalog-mp3";
import { buildGuestListenUrl } from "@/lib/utils/public-app-url";

export type ToolExecutionResult = {
  content: string;
  proposal?: { id: string; summary: string; toolName: string };
};

const MUTATION_NAMES = new Set([
  "update_release",
  "delete_draft_release",
  "create_release",
  "create_catalog_song",
  "update_catalog_song",
  "delete_catalog_song",
  "create_catalog_song_version",
  "update_catalog_song_version",
  "delete_catalog_song_version",
  "create_feedback_link",
  "set_feedback_link_enabled",
  "create_crm_contact",
  "update_crm_contact",
  "delete_crm_contact",
]);

export function isMutationTool(name: string): boolean {
  return MUTATION_NAMES.has(name);
}

function parseArgs(argsJson: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(argsJson || "{}");
    if (v && typeof v === "object" && !Array.isArray(v)) {
      return v as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

function asUuid(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
  ) {
    return null;
  }
  return s;
}

function asNonEmptyString(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

function asOptionalString(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  return v;
}

function asBool(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  return undefined;
}

function buildUpdateReleaseSummary(
  releaseId: string,
  a: Record<string, unknown>
): string {
  const parts: string[] = [`Update release ${releaseId.slice(0, 8)}…`];
  if (asNonEmptyString(a.title)) parts.push(`title → "${asNonEmptyString(a.title)}"`);
  if (asNonEmptyString(a.release_date))
    parts.push(`release date → ${asNonEmptyString(a.release_date)}`);
  if (asNonEmptyString(a.type)) parts.push(`type → ${asNonEmptyString(a.type)}`);
  if (asOptionalString(a.genre) !== undefined)
    parts.push(`genre → ${asNonEmptyString(a.genre) || "(clear)"}`);
  if (asOptionalString(a.description) !== undefined)
    parts.push("description updated");
  return parts.join(" ");
}

function stripStoragePath(p: string): string {
  return p.replace(/^\/+/, "").trim();
}

function isSafeRelPath(p: string): boolean {
  return !p.includes("..") && !p.startsWith("/");
}

async function copyAgentAttachmentToCatalogMp3(
  supabase: SupabaseClient,
  userId: string,
  songId: string,
  agentPathRaw: string,
  displayFileName: string
): Promise<{ ok: true; storagePath: string } | { ok: false; message: string }> {
  const agentPath = stripStoragePath(agentPathRaw);
  if (!isSafeRelPath(agentPath) || !agentPath.startsWith(`${userId}/`)) {
    return {
      ok: false,
      message: "agent_attachment_path must be your attachment path (starts with your user id).",
    };
  }
  const { data: blob, error: dErr } = await supabase.storage
    .from("agent_attachments")
    .download(agentPath);
  if (dErr || !blob) {
    return { ok: false, message: dErr?.message ?? "Could not read attachment." };
  }
  const nameLower = displayFileName.trim().toLowerCase();
  if (!nameLower.endsWith(".mp3")) {
    return {
      ok: false,
      message: "Library versions must use .mp3 (catalog_mp3 bucket).",
    };
  }
  const buf = await blob.arrayBuffer();
  if (buf.byteLength > 50 * 1024 * 1024) {
    return { ok: false, message: "File exceeds 50MB limit." };
  }
  const objectName = `${randomUUID()}-${safeStorageFileName(displayFileName)}`;
  const storagePath = `${userId}/${songId}/${objectName}`;
  const { error: uErr } = await supabase.storage
    .from(CATALOG_MP3_BUCKET)
    .upload(storagePath, buf, {
      contentType: "audio/mpeg",
      upsert: false,
    });
  if (uErr) return { ok: false, message: uErr.message };
  return { ok: true, storagePath };
}

function parseExistingCatalogMp3Path(
  userId: string,
  songId: string,
  pathRaw: string
): { ok: true; path: string } | { ok: false; message: string } {
  const path = stripStoragePath(pathRaw);
  if (!isSafeRelPath(path)) {
    return { ok: false, message: "Invalid catalog_mp3 path." };
  }
  const prefix = `${userId}/${songId}/`;
  if (!path.startsWith(prefix)) {
    return {
      ok: false,
      message:
        "existing_catalog_mp3_path must start with {your_user_id}/{song_id}/",
    };
  }
  return { ok: true, path };
}

export async function runMutationToolAndMaybeQueue(
  supabase: SupabaseClient,
  ctx: { userId: string; threadId: string },
  name: string,
  argsJson: string
): Promise<ToolExecutionResult> {
  const args = parseArgs(argsJson);
  if (!args) {
    return { content: JSON.stringify({ error: "Invalid tool arguments JSON" }) };
  }

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
            error: "create_catalog_song_version: file_name required (.mp3)",
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
      summary = `Add MP3 version "${fileName}" to song ${songId.slice(0, 8)}…`;
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
      summary = `Delete library MP3 version ${versionId.slice(0, 8)}…`;
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
      if (asOptionalString(args.role) !== undefined) {
        cleanArgs.role = asOptionalString(args.role)?.trim() || null;
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
      summary = `Create CRM contact "${name}"`;
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
      if (asOptionalString(args.role) !== undefined)
        patch.role = asOptionalString(args.role)?.trim() || null;
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
      summary = `Update CRM contact ${contactId.slice(0, 8)}… (${Object.keys(patch).join(", ")})`;
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
      summary = `Delete CRM contact ${contactId.slice(0, 8)}…`;
      break;
    }
    default:
      return { content: JSON.stringify({ error: `Unknown mutation tool: ${name}` }) };
  }

  const { data: row, error } = await supabase
    .from("agent_mutation_proposals")
    .insert({
      user_id: ctx.userId,
      thread_id: ctx.threadId,
      tool_name: name,
      args: cleanArgs,
      summary,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !row) {
    return {
      content: JSON.stringify({
        error: error?.message ?? "Could not queue mutation for confirmation",
      }),
    };
  }

  const proposalId = row.id as string;
  return {
    content: JSON.stringify({
      status: "pending_confirmation",
      proposalId,
      summary,
      instruction:
        "The user must tap Approve or Reject in the assistant panel before this runs.",
    }),
    proposal: { id: proposalId, summary, toolName: name },
  };
}

async function applyApprovedMutation(
  supabase: SupabaseClient,
  toolName: string,
  args: Record<string, unknown>,
  userId: string
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
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
        role:
          args.role === null || args.role === undefined
            ? null
            : typeof args.role === "string"
              ? args.role.trim() || null
              : null,
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
      return { ok: true, message: `CRM contact created${idHint}.` };
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
        "role",
        "notes",
        "status",
        "last_contacted_at",
      ] as const) {
        if (args[k] !== undefined) patch[k] = args[k];
      }
      if (Object.keys(patch).length === 0)
        return { ok: false, message: "No fields to update" };
      const { error } = await supabase
        .from("crm_contacts")
        .update(patch)
        .eq("id", contactId);
      if (error) return { ok: false, message: error.message };
      return { ok: true, message: "CRM contact updated." };
    }
    case "delete_crm_contact": {
      const contactId = asUuid(args.contact_id);
      if (!contactId) return { ok: false, message: "Invalid contact_id" };
      const { error } = await supabase.from("crm_contacts").delete().eq("id", contactId);
      if (error) return { ok: false, message: error.message };
      return { ok: true, message: "CRM contact deleted." };
    }
    default:
      return { ok: false, message: `Unknown tool: ${toolName}` };
  }
}

export async function resolveMutationProposal(
  supabase: SupabaseClient,
  userId: string,
  proposalId: string,
  action: "approve" | "reject"
): Promise<{ ok: boolean; error?: string; message?: string }> {
  const { data: proposal, error: loadErr } = await supabase
    .from("agent_mutation_proposals")
    .select("id, user_id, status, tool_name, args")
    .eq("id", proposalId)
    .maybeSingle();

  if (loadErr || !proposal) {
    return { ok: false, error: loadErr?.message ?? "Proposal not found" };
  }
  if (proposal.user_id !== userId) {
    return { ok: false, error: "Forbidden" };
  }
  if (proposal.status !== "pending") {
    return { ok: false, error: "This proposal was already handled." };
  }

  const now = new Date().toISOString();

  if (action === "reject") {
    const { error } = await supabase
      .from("agent_mutation_proposals")
      .update({ status: "rejected", resolved_at: now, result_message: "Rejected by user" })
      .eq("id", proposalId)
      .eq("user_id", userId);
    if (error) return { ok: false, error: error.message };
    return { ok: true, message: "Rejected." };
  }

  const args = proposal.args as Record<string, unknown>;
  const result = await applyApprovedMutation(
    supabase,
    proposal.tool_name as string,
    args,
    userId
  );

  if (!result.ok) {
    await supabase
      .from("agent_mutation_proposals")
      .update({
        status: "failed",
        resolved_at: now,
        result_message: result.message,
      })
      .eq("id", proposalId)
      .eq("user_id", userId);
    return { ok: false, error: result.message };
  }

  const { error: upErr } = await supabase
    .from("agent_mutation_proposals")
    .update({
      status: "executed",
      resolved_at: now,
      result_message: result.message,
    })
    .eq("id", proposalId)
    .eq("user_id", userId);

  if (upErr) return { ok: false, error: upErr.message };
  return { ok: true, message: result.message };
}
