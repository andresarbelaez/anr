/**
 * LLM endpoint: any OpenAI-compatible `/v1/chat/completions` (OpenAI, vLLM, Ollama bridge, etc.).
 * Swap providers by changing env — app code stays the same.
 */
export function getAgentLlmConfig():
  | { ok: true; baseUrl: string; apiKey: string; model: string }
  | { ok: false; reason: string } {
  const apiKey = process.env.AGENT_LLM_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      reason:
        "Assistant LLM is not configured. Set AGENT_LLM_API_KEY (and optionally AGENT_LLM_BASE_URL, AGENT_LLM_MODEL).",
    };
  }
  const baseUrl = (
    process.env.AGENT_LLM_BASE_URL || "https://api.openai.com/v1"
  ).replace(/\/$/, "");
  const model = process.env.AGENT_LLM_MODEL || "gpt-4o-mini";
  return { ok: true, baseUrl, apiKey, model };
}
