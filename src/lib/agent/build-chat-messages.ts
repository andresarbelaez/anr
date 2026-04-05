import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgentAttachmentRef, AgentMessage } from "@/lib/supabase/types";
import type { ChatContentPart, ChatMessage } from "@/lib/agent/llm-openai-compatible";
import type { OpenAIToolCall } from "@/lib/agent/llm-openai-compatible";

const MAX_CSV_CHARS = 12_000;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

async function userMessageForLlm(
  supabase: SupabaseClient,
  row: AgentMessage,
  expandAttachments: boolean
): Promise<ChatMessage> {
  const text = row.content?.trim() || "";
  const atts = row.attachments ?? [];
  if (!expandAttachments || atts.length === 0) {
    return { role: "user", content: text || "(empty message)" };
  }

  const parts: ChatContentPart[] = [
    { type: "text", text: text || "(see attachments)" },
  ];

  for (const a of atts) {
    if (a.kind === "image") {
      const { data, error } = await supabase.storage
        .from("agent_attachments")
        .download(a.path);
      if (error || !data) continue;
      const buf = new Uint8Array(await data.arrayBuffer());
      const slice = buf.byteLength > MAX_IMAGE_BYTES ? buf.slice(0, MAX_IMAGE_BYTES) : buf;
      const b64 = Buffer.from(slice).toString("base64");
      const mime = a.mimeType || "image/jpeg";
      parts.push({
        type: "image_url",
        image_url: { url: `data:${mime};base64,${b64}` },
      });
    } else if (a.kind === "csv") {
      const { data, error } = await supabase.storage
        .from("agent_attachments")
        .download(a.path);
      if (error || !data) continue;
      const snippet = (await data.text()).slice(0, MAX_CSV_CHARS);
      const head = parts[0];
      const base = head.type === "text" ? head.text : "";
      parts[0] = {
        type: "text",
        text: `${base}\n\n--- CSV: ${a.name || "file"} (truncated) ---\n${snippet}`,
      };
    } else if (a.kind === "audio") {
      const head = parts[0];
      const base = head.type === "text" ? head.text : "";
      parts[0] = {
        type: "text",
        text: `${base}\n\n[Attached audio: ${a.name || "file"} — use storage path \`${a.path}\` as agent_attachment_path when queuing a library MP3 version (MP3 only).]`,
      };
    }
  }

  if (parts.length === 1 && parts[0].type === "text") {
    return { role: "user", content: parts[0].text };
  }
  return { role: "user", content: parts };
}

export async function buildChatMessagesForLlm(
  supabase: SupabaseClient,
  systemPrompt: string,
  rows: AgentMessage[]
): Promise<ChatMessage[]> {
  const out: ChatMessage[] = [{ role: "system", content: systemPrompt }];
  const lastUserIdx = (() => {
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i].role === "user") return i;
    }
    return -1;
  })();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.role === "user") {
      out.push(
        await userMessageForLlm(
          supabase,
          row,
          i === lastUserIdx
        )
      );
    } else if (row.role === "assistant") {
      const tc = row.tool_calls as OpenAIToolCall[] | null | undefined;
      const msg: ChatMessage = {
        role: "assistant",
        content: row.content || null,
      };
      if (tc && Array.isArray(tc) && tc.length > 0) {
        (msg as { tool_calls?: OpenAIToolCall[] }).tool_calls = tc;
      }
      out.push(msg);
    } else if (row.role === "tool") {
      out.push({
        role: "tool",
        tool_call_id: row.tool_call_id || "",
        content: row.content || "{}",
      });
    }
  }

  return out;
}

export function normalizeAttachments(raw: unknown): AgentAttachmentRef[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (x): x is AgentAttachmentRef =>
      typeof x === "object" &&
      x !== null &&
      typeof (x as AgentAttachmentRef).path === "string" &&
      typeof (x as AgentAttachmentRef).mimeType === "string" &&
      ["image", "audio", "csv"].includes((x as AgentAttachmentRef).kind)
  );
}
