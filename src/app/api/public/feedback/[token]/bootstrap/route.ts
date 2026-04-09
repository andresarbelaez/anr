import { NextResponse } from "next/server";
import { gatePublicListenRequest } from "@/lib/feedback/public-feedback-listen-guard";
import {
  FEEDBACK_AUDIO_SIGN_SEC,
  signCatalogMp3Path,
} from "@/lib/feedback/public-session";

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const gated = await gatePublicListenRequest(request, token, "boot");
    if (!gated.ok) return gated.response;

    const { admin, songTitle, versionLabel, artistName, storagePath } =
      gated.data;
    const audioUrl = await signCatalogMp3Path(storagePath, admin);
    if (!audioUrl) {
      return NextResponse.json(
        { error: "Could not prepare audio." },
        { status: 503 }
      );
    }

    return NextResponse.json({
      songTitle,
      versionLabel,
      artistName,
      audioUrl,
      audioUrlExpiresInSec: FEEDBACK_AUDIO_SIGN_SEC,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Could not load playback session." },
      { status: 503 }
    );
  }
}
