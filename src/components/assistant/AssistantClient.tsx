"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Paperclip, Plus, Send, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { AgentAttachmentRef } from "@/lib/supabase/types";

const assistantMarkdownClass =
  "max-w-none text-sm leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_h1]:mb-2 [&_h1]:mt-3 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:mt-2 [&_h3]:text-sm [&_h3]:font-medium [&_code]:rounded [&_code]:bg-neutral-950 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_pre]:my-2 [&_pre]:max-h-[min(24rem,70vh)] [&_pre]:overflow-auto [&_pre]:rounded-lg [&_pre]:bg-neutral-950 [&_pre]:p-3 [&_pre]:text-xs [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-neutral-600 [&_blockquote]:pl-3 [&_blockquote]:text-neutral-300 [&_th]:border [&_th]:border-neutral-700 [&_th]:bg-neutral-950 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_td]:border [&_td]:border-neutral-800 [&_td]:px-2 [&_td]:py-1 [&_hr]:my-4 [&_hr]:border-neutral-700 [&_strong]:font-semibold";

function AssistantMarkdown({ source }: { source: string }) {
  return (
    <div className={assistantMarkdownClass}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="my-2 w-full overflow-x-auto">
              <table className="w-full min-w-[12rem] border-collapse border border-neutral-800 text-xs">
                {children}
              </table>
            </div>
          ),
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}

type Thread = {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
};

type MsgRow = {
  id: string;
  role: string;
  content: string | null;
  attachments: unknown;
  created_at: string;
};

type PendingProposal = {
  id: string;
  tool_name: string;
  summary: string;
  created_at: string;
};

type AgentSsePayload = {
  type: string;
  id?: string;
  content?: string;
  text?: string;
  message?: string;
  name?: string;
  proposalId?: string;
  summary?: string;
  toolName?: string;
};

async function drainAgentSseStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onPayload: (payload: AgentSsePayload) => void
): Promise<void> {
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const blocks = buf.split("\n\n");
    buf = blocks.pop() ?? "";
    for (const block of blocks) {
      const line = block.trim();
      if (!line.startsWith("data:")) continue;
      try {
        onPayload(JSON.parse(line.slice(5).trim()) as AgentSsePayload);
      } catch {
        continue;
      }
    }
  }
  const tail = buf.trim();
  if (tail.startsWith("data:")) {
    try {
      onPayload(JSON.parse(tail.slice(5).trim()) as AgentSsePayload);
    } catch {
      /* ignore */
    }
  }
}

export function AssistantClient() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MsgRow[]>([]);
  const [input, setInput] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [streaming, setStreaming] = useState("");
  const [toolStatus, setToolStatus] = useState<string | null>(null);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingProposals, setPendingProposals] = useState<PendingProposal[]>(
    []
  );
  const [confirming, setConfirming] = useState<{
    id: string;
    action: "approve" | "reject";
  } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingOptimisticId = useRef<string | null>(null);

  const autoBootRef = useRef(false);

  const loadThreads = useCallback(async () => {
    setLoadingThreads(true);
    try {
      const res = await fetch("/api/agent/threads");
      const json = (await res.json()) as { threads?: Thread[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to load threads");
      setThreads(json.threads ?? []);
      setThreadId((id) => {
        if (id && json.threads?.some((t) => t.id === id)) return id;
        return json.threads?.[0]?.id ?? null;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load threads");
    } finally {
      setLoadingThreads(false);
    }
  }, []);

  const fetchThreadMessages = useCallback(async (tid: string) => {
    const res = await fetch(`/api/agent/threads/${tid}/messages`);
    const json = (await res.json()) as {
      messages?: MsgRow[];
      error?: string;
    };
    if (!res.ok) {
      throw new Error(json.error ?? "Failed to load messages");
    }
    return json.messages ?? [];
  }, []);

  const loadMessages = useCallback(
    async (tid: string, opts?: { silent?: boolean }) => {
      const silent = opts?.silent === true;
      if (!silent) setLoadingMessages(true);
      setError(null);
      try {
        const rows = await fetchThreadMessages(tid);
        setMessages(rows);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load messages");
      } finally {
        if (!silent) setLoadingMessages(false);
      }
    },
    [fetchThreadMessages]
  );

  const fetchPendingProposals = useCallback(async (tid: string) => {
    try {
      const res = await fetch(`/api/agent/threads/${tid}/mutation-proposals`);
      const json = (await res.json()) as {
        proposals?: PendingProposal[];
        error?: string;
      };
      if (res.ok && Array.isArray(json.proposals)) {
        setPendingProposals(json.proposals);
      } else {
        setPendingProposals([]);
      }
    } catch {
      setPendingProposals([]);
    }
  }, []);

  const finalizeAgentTurn = useCallback(
    async (tid: string | null) => {
      setToolStatus(null);
      pendingOptimisticId.current = null;
      if (tid) {
        try {
          const rows = await fetchThreadMessages(tid);
          setMessages(rows);
          setStreaming("");
        } catch {
          setStreaming("");
        }
        await fetchPendingProposals(tid);
      } else {
        setStreaming("");
      }
      setSending(false);
      await loadThreads();
    },
    [fetchThreadMessages, fetchPendingProposals, loadThreads]
  );

  const handleAgentSsePayload = useCallback((payload: AgentSsePayload) => {
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
    async (tid: string, outcomeMessage: string) => {
      setSending(true);
      setError(null);
      setStreaming("");
      setToolStatus(null);
      try {
        const res = await fetch(`/api/agent/threads/${tid}/continue`, {
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
        await finalizeAgentTurn(tid);
      }
    },
    [handleAgentSsePayload, finalizeAgentTurn]
  );

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (threadId) void loadMessages(threadId);
    else setMessages([]);
  }, [threadId, loadMessages]);

  useEffect(() => {
    if (!threadId) {
      setPendingProposals([]);
      return;
    }
    void fetchPendingProposals(threadId);
  }, [threadId, fetchPendingProposals]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming, toolStatus]);

  const newThread = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/agent/threads", { method: "POST" });
    const json = (await res.json()) as { thread?: Thread; error?: string };
    if (!res.ok) {
      setError(json.error ?? "Could not create thread");
      return;
    }
    if (json.thread) {
      setThreads((t) => [json.thread!, ...t]);
      setThreadId(json.thread.id);
    }
    await loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (loadingThreads || autoBootRef.current || threads.length > 0) return;
    autoBootRef.current = true;
    void newThread();
  }, [loadingThreads, threads.length, newThread]);

  const deleteThread = async (id: string) => {
    if (!confirm("Delete this conversation?")) return;
    const res = await fetch(`/api/agent/threads/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(typeof j.error === "string" ? j.error : "Delete failed");
      return;
    }
    setThreads((t) => t.filter((x) => x.id !== id));
    if (threadId === id) {
      setThreadId(null);
      setMessages([]);
    }
  };

  const confirmProposal = async (
    proposalId: string,
    action: "approve" | "reject"
  ) => {
    setConfirming({ id: proposalId, action });
    setError(null);
    const tid = threadId;
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
      if (tid) {
        await fetchPendingProposals(tid);
        try {
          setMessages(await fetchThreadMessages(tid));
        } catch {
          /* ignore */
        }
      }
      if (
        action === "approve" &&
        tid &&
        typeof json.message === "string" &&
        json.message.length > 0
      ) {
        await resumeAfterMutationApprove(tid, json.message);
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
    if (!threadId || sending) return;
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
      const res = await fetch(`/api/agent/threads/${threadId}/chat`, {
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
      await finalizeAgentTurn(threadId);
    }
  };

  const activeTitle =
    threads.find((t) => t.id === threadId)?.title?.trim() || "Assistant";

  return (
    <div className="flex h-[calc(100vh-8rem)] max-h-[820px] gap-4">
      <aside className="flex w-52 shrink-0 flex-col rounded-lg border border-neutral-800 bg-neutral-950/80">
        <div className="border-b border-neutral-800 p-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="w-full"
            onClick={() => void newThread()}
          >
            <Plus className="mr-1 h-4 w-4" />
            New chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-1">
          {loadingThreads ? (
            <p className="p-2 text-xs text-neutral-500">Loading…</p>
          ) : threads.length === 0 ? (
            <p className="p-2 text-xs text-neutral-500">No chats yet.</p>
          ) : (
            <ul className="space-y-0.5">
              {threads.map((t) => (
                <li key={t.id} className="group flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => setThreadId(t.id)}
                    className={cn(
                      "min-w-0 flex-1 truncate rounded-md px-2 py-2 text-left text-xs transition",
                      t.id === threadId
                        ? "bg-neutral-800 text-white"
                        : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
                    )}
                  >
                    {t.title || "New chat"}
                  </button>
                  <button
                    type="button"
                    aria-label="Delete thread"
                    className="shrink-0 rounded p-1 text-neutral-600 opacity-0 transition hover:bg-neutral-800 hover:text-red-400 group-hover:opacity-100"
                    onClick={() => void deleteThread(t.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col rounded-lg border border-neutral-800 bg-neutral-950/50">
        <header className="border-b border-neutral-800 px-4 py-3">
          <h1 className="text-lg font-semibold text-white">{activeTitle}</h1>
          <p className="text-xs text-neutral-500">
            Lists your data read-only; mutations queue below until you approve.
            Set AGENT_LLM_API_KEY for the model endpoint.
          </p>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {!threadId && !loadingThreads && (
            <p className="text-sm text-neutral-500">
              Create a new chat to get started.
            </p>
          )}
          {loadingMessages && threadId && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
            </div>
          )}
          {messages
            .filter((m) => m.role !== "tool")
            .map((m) => (
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
            <p className="text-center text-xs text-neutral-500">{toolStatus}</p>
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

        {error && (
          <p className="border-t border-red-900/40 bg-red-950/20 px-4 py-2 text-sm text-red-200">
            {error}
          </p>
        )}

        <div className="border-t border-neutral-800 p-3">
          {threadId && pendingProposals.length > 0 && (
            <div className="mb-3 space-y-2">
              <p className="text-xs font-medium text-amber-200/90">
                Pending changes — approve or reject
              </p>
              {pendingProposals.map((p) => (
                <div
                  key={p.id}
                  className="rounded-lg border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-sm"
                >
                  <p className="text-xs text-neutral-500">
                    {p.tool_name.replace(/_/g, " ")}
                  </p>
                  <p className="mt-1 text-neutral-100">{p.summary}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="bg-emerald-700 text-white hover:bg-emerald-600"
                      disabled={confirming !== null || sending}
                      loading={
                        confirming?.id === p.id && confirming?.action === "approve"
                      }
                      onClick={() => void confirmProposal(p.id, "approve")}
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={confirming !== null || sending}
                      loading={
                        confirming?.id === p.id && confirming?.action === "reject"
                      }
                      onClick={() => void confirmProposal(p.id, "reject")}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
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
              disabled={!threadId || sending}
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
                threadId
                  ? "Message… (Shift+Enter for newline)"
                  : "Create a chat first"
              }
              disabled={!threadId || sending}
              rows={2}
              className="min-h-[44px] flex-1 resize-none rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
            <Button
              type="button"
              className="shrink-0 self-end"
              disabled={!threadId || sending || (!input.trim() && !pendingFiles.length)}
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
