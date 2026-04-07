import { describe, expect, it } from "vitest";
import { buildCommentTree } from "@/lib/feedback/build-comment-tree";

describe("buildCommentTree", () => {
  it("nests replies under roots and sorts roots by seconds_into_track", () => {
    const rows = [
      {
        id: "r2",
        body: "late",
        seconds_into_track: 120,
        display_name: "B",
        parent_id: null,
        created_at: "2026-01-01T00:00:02Z",
      },
      {
        id: "r1",
        body: "early",
        seconds_into_track: 10,
        display_name: "A",
        parent_id: null,
        created_at: "2026-01-01T00:00:01Z",
      },
      {
        id: "c1",
        body: "reply",
        seconds_into_track: null,
        display_name: null,
        parent_id: "r1",
        created_at: "2026-01-01T00:00:03Z",
      },
    ];
    const tree = buildCommentTree(rows);
    expect(tree).toHaveLength(2);
    expect(tree[0].id).toBe("r1");
    expect(tree[0].secondsIntoTrack).toBe(10);
    expect(tree[0].replies).toHaveLength(1);
    expect(tree[0].replies[0].body).toBe("reply");
    expect(tree[1].id).toBe("r2");
  });
});
