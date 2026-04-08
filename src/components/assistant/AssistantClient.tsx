"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Loader2, Paperclip, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { AgentAttachmentRef } from "@/lib/supabase/types";
import {
  drainAgentSseStream,
  type AgentSsePayload,
} from "@/lib/agent/agent-sse";
import { AssistantMarkdown } from "./assistant-markdown";
import {
  MutationProposalList,
  type MutationProposalRow,
} from "./MutationProposalList";

type MsgRow = {
  id: string;
  role: string;
  content: string | null;
  attachments: unknown;
  created_at: string;
};

function isContinuityHandoff(m: MsgRow): boolean {
  return (
    m.role === "user" &&
    typeof m.content === "string" &&
    m.content.startsWith("## Continuity (earlier messages")
  );
}

function rowFromApi(r: Record<string, unknown>): MsgRow | null {
  const id = r.id;
  const role = r.role;
  if (typeof id !== "string" || typeof role !== "string") return null;
  return {
    id,
    role,
    content: typeof r.content === "string" ? r.content : null,
    attachments: r.attachments ?? [],
    created_at:
      typeof r.created_at === "string"
        ? r.created_at
        : new Date().toISOString(),
  };
}

export function AssistantClient({
  className,
  conversationLoadingFallback,
}: {
  className?: string;
  /** When set (e.g. studio micro-app), replaces the default spinner while the thread loads. */
  conversationLoadingFallback?: ReactNode;
} = {}) {
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MsgRow[]>([]);
  const [input, setInput] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [streaming, setStreaming] = useState("");
  const [toolStatus, setToolStatus] = useState<string | null>(null);
  const [loadingConversation, setLoadingConversation] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingProposals, setPendingProposals] = useState<MutationProposalRow[]>(
    []
  );
  const [confirming, setConfirming] = useState<{
    id: string;
    action: "approve" | "reject";
  } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingOptimisticId = useRef<string | null>(null);

  const loadConversation = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!silent) setLoadingConversation(true);
    setError(null);
    try {
      const res = await fetch("/api/agent/conversation");
      const json = (await res.json()) as {
        activeThreadId?: string;
        messages?: Record<string, unknown>[];
        pendingProposals?: MutationProposalRow[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Failed to load conversation");
      setActiveThreadId(json.activeThreadId ?? null);
      const rows = (json.messages ?? [])
        .map(rowFromApi)
        .filter((m): m is MsgRow => m !== null);
      setMessages(rows);
      setPendingProposals(
        Array.isArray(json.pendingProposals) ? json.pendingProposals : []
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load conversation");
    } finally {
      if (!silent) setLoadingConversation(false);
    }
  }, []);

  const finalizeAgentTurn = useCallback(async () => {
    setToolStatus(null);
    pendingOptimisticId.current = null;
    setStreaming("");
    setSending(false);
    await loadConversation({ silent: true });
  }, [loadConversation]);

  const handleAgentSsePayload = useCallback((payload: AgentSsePayload) => {
    if (payload.type === "session_rotated" && payload.activeThreadId) {
      setActiveThreadId(payload.activeThreadId);
      return;
    }
    if (payload.type === "user_message" && payload.id) {
      const localId = pendingOptimisticId.current;
      if (localId) {
        const realId = payload.id;
        setMessages((prev) => {
          const i = prev.findIndex((m) => m.id === localId);
          if (i < 0) return prev;
          const next = [...prev];
          next[i] = { ...next[i], id: realId };
          return next;
        });
        pendingOptimisticId.current = null;
      } else {
        setMessages((prev) => {
          if (prev.some((m) => m.id === payload.id)) return prev;
          const c =
            typeof payload.content === "string" ? payload.content : null;
          return [
            ...prev,
            {
              id: payload.id!,
              role: "user",
              content: c,
              attachments: [],
              created_at: new Date().toISOString(),
            },
          ];
        });
      }
    } else if (payload.type === "delta" && payload.text) {
      setStreaming((s) => s + payload.text);
    } else if (payload.type === "tool_start" && payload.name) {
      setToolStatus(`Using tool: ${payload.name}…`);
    } else if (payload.type === "tool_end") {
      setToolStatus(null);
    } else if (payload.type === "error" && payload.message) {
      setError(payload.message);
    } else if (
      payload.type === "mutation_proposal" &&
      payload.proposalId &&
      payload.summary
    ) {
      setPendingProposals((prev) => {
        if (prev.some((p) => p.id === payload.proposalId)) return prev;
        return [
          ...prev,
          {
            id: payload.proposalId!,
            tool_name: payload.toolName ?? "mutation",
            summary: payload.summary!,
            created_at: new Date().toISOString(),
          },
        ];
      });
    }
  }, []);

  const resumeAfterMutationApprove = useCallback(
    async (outcomeMessage: string) => {
      setSending(true);
      setError(null);
      setStreaming("");
      setToolStatus(null);
      try {
        const res = await fetch("/api/agent/conversation/continue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ outcomeMessage }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(
            typeof j.error === "string" ? j.error : `HTTP ${res.status}`
          );
        }
        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");
        await drainAgentSseStream(reader, handleAgentSsePayload);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Continue failed");
      } finally {
        await finalizeAgentTurn();
      }
    },
    [handleAgentSsePayload, finalizeAgentTurn]
  );

  useEffect(() => {
    void loadConversation();
  }, [loadConversation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming, toolStatus]);

  const confirmProposal = async (
    proposalId: string,
    action: "approve" | "reject"
  ) => {
    setConfirming({ id: proposalId, action });
    setError(null);
    try {
      const res = await fetch("/api/agent/mutations/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId, action }),
      });
      const json = (await res.json()) as {
        error?: string;
        ok?: boolean;
        message?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      setConfirming(null);
      await loadConversation({ silent: true });
      if (
        action === "approve" &&
        typeof json.message === "string" &&
        json.message.length > 0
      ) {
        await resumeAfterMutationApprove(json.message);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Confirmation failed");
    } finally {
      setConfirming(null);
    }
  };

  const uploadFile = async (file: File): Promise<AgentAttachmentRef> => {
    const form = new FormData();
    form.set("file", file);
    const res = await fetch("/api/agent/attachments", {
      method: "POST",
      body: form,
    });
    const json = (await res.json()) as {
      attachment?: AgentAttachmentRef;
      error?: string;
    };
    if (!res.ok) throw new Error(json.error ?? "Upload failed");
    if (!json.attachment) throw new Error("Upload failed");
    return json.attachment;
  };

  const send = async () => {
    if (!activeThreadId || sending) return;
    const text = input.trim();
    if (!text && pendingFiles.length === 0) return;

    setSending(true);
    setError(null);
    setStreaming("");
    setToolStatus(null);
    setInput("");

    const files = [...pendingFiles];
    setPendingFiles([]);

    const attachments: AgentAttachmentRef[] = [];
    try {
      for (const f of files) {
        attachments.push(await uploadFile(f));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setSending(false);
      return;
    }

    const optimisticId = `local-${Date.now()}`;
    pendingOptimisticId.current = optimisticId;
    setMessages((prev) => [
      ...prev,
      {
        id: optimisticId,
        role: "user",
        content: text || null,
        attachments: attachments.map((a) => ({
          path: a.path,
          mimeType: a.mimeType,
          kind: a.kind,
          name: a.name,
        })),
        created_at: new Date().toISOString(),
      },
    ]);

    try {
      const res = await fetch("/api/agent/conversation/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, attachments }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(
          typeof j.error === "string" ? j.error : `HTTP ${res.status}`
        );
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      await drainAgentSseStream(reader, handleAgentSsePayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
      const dropId = pendingOptimisticId.current;
      if (dropId) {
        setMessages((prev) => prev.filter((m) => m.id !== dropId));
        pendingOptimisticId.current = null;
      }
    } finally {
      await finalizeAgentTurn();
    }
  };

  const visibleMessages = messages.filter(
    (m) => m.role !== "tool" && !isContinuityHandoff(m)
  );

  return (
    <div className={className ?? "flex h-[calc(100vh-8rem)] max-h-[820px]"}>
      <div className="flex min-w-0 flex-1 flex-col rounded-lg border border-neutral-800 bg-neutral-950/50">
        <header className="border-b border-neutral-800 px-4 py-3">
          <h1 className="text-lg font-semibold text-white">Assistant</h1>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 font-reading">
          {loadingConversation ? (
            conversationLoadingFallback ? (
              <div className="flex min-h-[min(45vh,380px)] w-full min-w-0 flex-1 flex-col">
                {conversationLoadingFallback}
              </div>
            ) : (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
              </div>
            )
          ) : (
            <div className="flex flex-1 flex-col space-y-4">
              {!activeThreadId && (
                <p className="text-sm text-neutral-500">
                  Could not open your assistant conversation.
                </p>
              )}
              {visibleMessages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "flex",
                    m.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2 text-sm",
                      m.role === "user"
                        ? "bg-white text-black"
                        : "border border-neutral-800 bg-neutral-900 text-neutral-100"
                    )}
                  >
                    {m.role === "assistant" ? (
                      m.content ? (
                        <AssistantMarkdown source={m.content} />
                      ) : (
                        <p className="text-neutral-500">—</p>
                      )
                    ) : (
                      <p className="whitespace-pre-wrap">{m.content || "—"}</p>
                    )}
                    {m.role === "user" &&
                      Array.isArray(m.attachments) &&
                      m.attachments.length > 0 && (
                        <p className="mt-1 text-xs opacity-70">
                          {(m.attachments as { name?: string }[])
                            .map((a) => a.name || "file")
                            .join(", ")}
                        </p>
                      )}
                  </div>
                </div>
              ))}
              {toolStatus && (
                <p className="text-center text-xs text-neutral-500">
                  {toolStatus}
                </p>
              )}
              {streaming && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-neutral-100">
                    <AssistantMarkdown source={streaming} />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {error && (
          <p className="border-t border-red-900/40 bg-red-950/20 px-4 py-2 text-sm text-red-200">
            {error}
          </p>
        )}

        <div className="border-t border-neutral-800 p-3">
          {activeThreadId && (
            <MutationProposalList
              proposals={pendingProposals}
              confirming={confirming}
              sending={sending}
              onApprove={(id) => void confirmProposal(id, "approve")}
              onReject={(id) => void confirmProposal(id, "reject")}
            />
          )}
          {pendingFiles.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {pendingFiles.map((f) => (
                <span
                  key={f.name + f.size}
                  className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-300"
                >
                  {f.name}
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif,.csv,audio/mpeg,audio/wav,.mp3,.wav"
              className="hidden"
              onChange={(e) => {
                const list = e.target.files;
                if (list) setPendingFiles((p) => [...p, ...Array.from(list)]);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0"
              disabled={!activeThreadId || sending}
              onClick={() => fileRef.current?.click()}
              aria-label="Attach file"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder={
                activeThreadId
                  ? "Message… (Shift+Enter for newline)"
                  : "Loading…"
              }
              disabled={!activeThreadId || sending}
              rows={2}
              className="min-h-[44px] flex-1 resize-none rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 font-reading text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
            <Button
              type="button"
              className="shrink-0 self-end"
              disabled={
                !activeThreadId ||
                sending ||
                (!input.trim() && !pendingFiles.length)
              }
              loading={sending}
              onClick={() => void send()}
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
