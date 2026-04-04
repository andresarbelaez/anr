import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDistributionAdapter } from "@/lib/distribution";
import type { Release, Track } from "@/lib/supabase/types";

export async function POST(request: Request) {
  try {
    const { releaseId } = await request.json();

    if (!releaseId) {
      return NextResponse.json(
        { error: "releaseId is required" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: release } = await supabase
      .from("releases")
      .select("*")
      .eq("id", releaseId)
      .eq("user_id", user.id)
      .single();

    if (!release) {
      return NextResponse.json(
        { error: "Release not found" },
        { status: 404 }
      );
    }

    const { data: tracks } = await supabase
      .from("tracks")
      .select("*")
      .eq("release_id", releaseId)
      .order("track_number");

    const adapter = getDistributionAdapter();
    const result = await adapter.submitRelease(
      release as Release,
      (tracks as Track[]) || []
    );

    if (result.success) {
      await supabase
        .from("releases")
        .update({ status: "submitted" })
        .eq("id", releaseId);

      return NextResponse.json({
        success: true,
        externalId: result.externalId,
      });
    }

    return NextResponse.json(
      { success: false, error: result.error },
      { status: 422 }
    );
  } catch (err) {
    console.error("Distribution error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
