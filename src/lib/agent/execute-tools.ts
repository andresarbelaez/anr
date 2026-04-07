import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isMutationTool,
  runMutationToolAndMaybeQueue,
  type ToolExecutionResult,
} from "@/lib/agent/mutation-proposals";
import {
  buildCommentTree,
  type FeedbackCommentRow,
} from "@/lib/feedback/build-comment-tree";
import { buildGuestListenUrl } from "@/lib/utils/public-app-url";
import {
  expandAllEvents,
  toDateStr,
  parseDate,
  addDays,
} from "@/lib/utils/calendar-recurrence";
import type { CalendarEvent } from "@/lib/supabase/types";

export type { ToolExecutionResult };

async function executeReadToolInner(
  supabase: SupabaseClient,
  name: string,
  argsJson: string
): Promise<string> {
  try {
    JSON.parse(argsJson || "{}");
  } catch {
    return JSON.stringify({ error: "Invalid JSON in tool arguments" });
  }

  switch (name) {
    case "list_releases": {
      const { data, error } = await supabase
        .from("releases")
        .select("id, title, status, type, updated_at, release_date")
        .order("updated_at", { ascending: false });
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ releases: data ?? [] });
    }
    case "list_catalog_songs": {
      const { data, error } = await supabase
        .from("catalog_songs")
        .select("id, title, updated_at")
        .order("title");
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ songs: data ?? [] });
    }
    case "list_catalog_versions": {
      let raw: { song_id?: string };
      try {
        raw = JSON.parse(argsJson || "{}") as { song_id?: string };
      } catch {
        return JSON.stringify({ error: "Invalid JSON in tool arguments" });
      }
      const songId = typeof raw.song_id === "string" ? raw.song_id.trim() : "";
      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          songId
        )
      ) {
        return JSON.stringify({
          error: "list_catalog_versions: valid song_id (UUID) required",
        });
      }
      const { data, error } = await supabase
        .from("catalog_song_versions")
        .select("id, label, file_name, created_at, catalog_song_id")
        .eq("catalog_song_id", songId)
        .order("created_at", { ascending: false });
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ versions: data ?? [] });
    }
    case "list_crm_contacts": {
      const { data, error } = await supabase
        .from("crm_contacts")
        .select(
          "id, name, email, instagram, tiktok, website, roles, status, updated_at"
        )
        .order("name");
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ contacts: data ?? [] });
    }
    case "list_feedback_links": {
      const { data, error } = await supabase
        .from("feedback_version_links")
        .select(
          `
          id,
          token,
          enabled,
          catalog_song_versions (
            id,
            label,
            file_name,
            catalog_songs ( title )
          )
        `
        )
        .order("created_at", { ascending: false });
      if (error) return JSON.stringify({ error: error.message });
      const rows = (data ?? []).map((row: Record<string, unknown>) => {
        const v = row.catalog_song_versions as
          | {
              id?: string;
              label: string | null;
              file_name: string;
              catalog_songs:
                | { title: string }
                | { title: string }[]
                | null;
            }
          | null
          | undefined;
        const song = v?.catalog_songs;
        const songTitle = Array.isArray(song)
          ? song[0]?.title
          : song?.title;
        const versionLabel =
          v?.label?.trim() || v?.file_name || "Version";
        const tok = String(row.token ?? "");
        const versionId =
          v && typeof v.id === "string" ? v.id : null;
        return {
          guestListenUrl: buildGuestListenUrl(tok),
          linkId: row.id,
          catalogSongVersionId: versionId,
          enabled: row.enabled,
          songTitle: songTitle ?? "Untitled",
          versionLabel,
        };
      });
      return JSON.stringify({ feedbackLinks: rows });
    }
    case "list_calendar_events": {
      let raw: { start_date?: string; end_date?: string };
      try {
        raw = JSON.parse(argsJson || "{}") as { start_date?: string; end_date?: string };
      } catch {
        return JSON.stringify({ error: "Invalid JSON in tool arguments" });
      }
      const todayStr = toDateStr(new Date());
      const startStr = raw.start_date ?? todayStr;
      const endStr =
        raw.end_date ?? toDateStr(addDays(parseDate(startStr), 30));

      const rangeStart = parseDate(startStr);
      const rangeEnd = parseDate(endStr);

      const { data: evtData, error: evtErr } = await supabase
        .from("calendar_events")
        .select("*")
        .gte("start_at", rangeStart.toISOString())
        .lte("start_at", rangeEnd.toISOString());
      if (evtErr) return JSON.stringify({ error: evtErr.message });

      const { data: relData } = await supabase
        .from("releases")
        .select("title, release_date")
        .not("release_date", "is", null);

      const calEvents = (evtData ?? []) as CalendarEvent[];
      const occs = expandAllEvents(calEvents, rangeStart, rangeEnd).map((o) => ({
        masterId: o.masterId,
        occurrenceDate: o.occurrenceDate,
        startAt: o.startAt.toISOString(),
        endAt: o.endAt?.toISOString() ?? null,
        title: o.event.title,
        allDay: o.event.all_day,
        color: o.event.color,
        location: o.event.location,
        link: o.event.link,
        description: o.event.description,
        isRecurring: o.isRecurring,
      }));

      const relOccs = ((relData ?? []) as Array<{ title: string; release_date: string }>)
        .filter((r) => r.release_date >= startStr && r.release_date <= endStr)
        .map((r) => ({
          masterId: null,
          occurrenceDate: r.release_date,
          startAt: r.release_date + "T00:00:00Z",
          endAt: null,
          title: `Release date: ${r.title}`,
          allDay: true,
          isReleaseDate: true,
        }));

      return JSON.stringify({ events: [...occs, ...relOccs], start_date: startStr, end_date: endStr });
    }
    case "get_guest_listen_url": {
      let raw: { catalog_song_version_id?: string };
      try {
        raw = JSON.parse(argsJson || "{}") as {
          catalog_song_version_id?: string;
        };
      } catch {
        return JSON.stringify({ error: "Invalid JSON in tool arguments" });
      }
      const versionId =
        typeof raw.catalog_song_version_id === "string"
          ? raw.catalog_song_version_id.trim()
          : "";
      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          versionId
        )
      ) {
        return JSON.stringify({
          error:
            "get_guest_listen_url: valid catalog_song_version_id (UUID) required",
        });
      }
      const { data: linkRow, error: linkErr } = await supabase
        .from("feedback_version_links")
        .select("id, token, enabled")
        .eq("catalog_song_version_id", versionId)
        .maybeSingle();
      if (linkErr) return JSON.stringify({ error: linkErr.message });
      if (!linkRow || linkRow.token == null || linkRow.token === "") {
        return JSON.stringify({
          catalog_song_version_id: versionId,
          hasLink: false,
          note: "No share row for this version yet. Use create_feedback_link (user must approve in the panel).",
        });
      }
      const token = String(linkRow.token);
      return JSON.stringify({
        catalog_song_version_id: versionId,
        hasLink: true,
        linkId: linkRow.id as string,
        enabled: linkRow.enabled as boolean,
        guestListenUrl: buildGuestListenUrl(token),
      });
    }
    case "list_feedback_comments": {
      let raw: { catalog_song_version_id?: string };
      try {
        raw = JSON.parse(argsJson || "{}") as {
          catalog_song_version_id?: string;
        };
      } catch {
        return JSON.stringify({ error: "Invalid JSON in tool arguments" });
      }
      const versionId =
        typeof raw.catalog_song_version_id === "string"
          ? raw.catalog_song_version_id.trim()
          : "";
      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          versionId
        )
      ) {
        return JSON.stringify({
          error:
            "list_feedback_comments: valid catalog_song_version_id (UUID) required",
        });
      }
      const { data: linkRow, error: linkErr } = await supabase
        .from("feedback_version_links")
        .select("id")
        .eq("catalog_song_version_id", versionId)
        .maybeSingle();
      if (linkErr) return JSON.stringify({ error: linkErr.message });
      if (!linkRow?.id) {
        return JSON.stringify({
          catalog_song_version_id: versionId,
          hasFeedbackLink: false,
          threads: [],
          latestComment: null,
          note: "No feedback link row for this version yet (guests cannot leave comments until a link exists).",
        });
      }
      const linkId = linkRow.id as string;
      const { data: rows, error: cErr } = await supabase
        .from("feedback_comments")
        .select(
          "id, body, seconds_into_track, display_name, parent_id, created_at"
        )
        .eq("feedback_link_id", linkId)
        .order("created_at", { ascending: true });
      if (cErr) return JSON.stringify({ error: cErr.message });
      const list = (rows ?? []) as FeedbackCommentRow[];
      const threads = buildCommentTree(list);
      const latest = [...list].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];
      return JSON.stringify({
        catalog_song_version_id: versionId,
        feedback_link_id: linkId,
        hasFeedbackLink: true,
        commentCount: list.length,
        threads,
        latestComment: latest
          ? {
              id: latest.id,
              body: latest.body,
              created_at: latest.created_at,
              display_name: latest.display_name,
              seconds_into_track: latest.seconds_into_track,
              is_reply: latest.parent_id !== null,
            }
          : null,
      });
    }
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

export async function executeAgentTool(
  supabase: SupabaseClient,
  ctx: { userId: string; threadId: string },
  name: string,
  argsJson: string
): Promise<ToolExecutionResult> {
  if (isMutationTool(name)) {
    return runMutationToolAndMaybeQueue(supabase, ctx, name, argsJson);
  }
  const content = await executeReadToolInner(supabase, name, argsJson);
  return { content };
}
