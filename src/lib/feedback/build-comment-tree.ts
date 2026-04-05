import type { PublicFeedbackRootJson } from "@/lib/feedback/types";

export type FeedbackCommentRow = {
  id: string;
  body: string;
  seconds_into_track: number | null;
  display_name: string | null;
  parent_id: string | null;
  created_at: string;
};

export function buildCommentTree(
  rows: FeedbackCommentRow[]
): PublicFeedbackRootJson[] {
  const roots = rows.filter((r) => r.parent_id === null);
  const byParent = new Map<string, FeedbackCommentRow[]>();
  for (const r of rows) {
    if (r.parent_id === null) continue;
    const list = byParent.get(r.parent_id) ?? [];
    list.push(r);
    byParent.set(r.parent_id, list);
  }

  roots.sort((a, b) => {
    const sa = a.seconds_into_track ?? 0;
    const sb = b.seconds_into_track ?? 0;
    if (sa !== sb) return sa - sb;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  return roots.map((root) => {
    const replies = (byParent.get(root.id) ?? []).sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    return {
      id: root.id,
      body: root.body,
      displayName: root.display_name,
      createdAt: root.created_at,
      secondsIntoTrack: root.seconds_into_track ?? 0,
      replies: replies.map((r) => ({
        id: r.id,
        body: r.body,
        displayName: r.display_name,
        createdAt: r.created_at,
      })),
    };
  });
}
