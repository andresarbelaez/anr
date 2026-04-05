import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const ALLOWED: Record<string, AgentKind> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "image/gif": "image",
  "text/csv": "csv",
  "audio/mpeg": "audio",
  "audio/mp3": "audio",
  "audio/wav": "audio",
  "audio/x-wav": "audio",
  "audio/wave": "audio",
};

type AgentKind = "image" | "audio" | "csv";

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 160) || "file";
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size < 1) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const mime = (file.type || "application/octet-stream").split(";")[0].trim();
  const kind = ALLOWED[mime];
  if (!kind) {
    return NextResponse.json(
      { error: `Unsupported type: ${mime || "unknown"}` },
      { status: 400 }
    );
  }

  const max =
    kind === "image" ? 8 * 1024 * 1024 : kind === "audio" ? 20 * 1024 * 1024 : 4 * 1024 * 1024;
  if (file.size > max) {
    return NextResponse.json({ error: "File too large" }, { status: 400 });
  }

  const name = safeName(file.name || "upload");
  const objectPath = `${user.id}/${crypto.randomUUID()}-${name}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await supabase.storage
    .from("agent_attachments")
    .upload(objectPath, buf, {
      contentType: mime,
      upsert: false,
    });

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const ref = {
    path: objectPath,
    mimeType: mime,
    kind,
    name: file.name || name,
  };

  return NextResponse.json({ attachment: ref });
}
