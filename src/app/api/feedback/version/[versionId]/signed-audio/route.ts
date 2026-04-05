import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  FEEDBACK_AUDIO_SIGN_SEC,
  signCatalogMp3Path,
} from "@/lib/feedback/public-session";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  context: { params: Promise<{ versionId: string }> }
) {
  try {
    const { versionId } = await context.params;
    if (!UUID_RE.test(versionId)) {
      return NextResponse.json(
        { error: "Invalid version id." },
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

    const { data: row, error } = await supabase
      .from("catalog_song_versions")
      .select("storage_path")
      .eq("id", versionId)
      .maybeSingle();

    if (error || !row?.storage_path) {
      return NextResponse.json({ error: "Version not found." }, { status: 404 });
    }

    const signedUrl = await signCatalogMp3Path(row.storage_path);
    if (!signedUrl) {
      return NextResponse.json(
        { error: "Could not prepare audio." },
        { status: 503 }
      );
    }

    return NextResponse.json({
      signedUrl,
      expiresInSec: FEEDBACK_AUDIO_SIGN_SEC,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Could not prepare audio." },
      { status: 503 }
    );
  }
}
