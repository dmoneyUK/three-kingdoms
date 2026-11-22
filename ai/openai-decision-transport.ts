import type { BotObservation } from "./bot-observation";
import { BotPolicyError, type BotPolicy } from "./decision-router";

type InjectedFetch = (url: string, request: RequestInit) => Promise<Response>;
type ResponseRecord = Record<string, unknown>;

function asRecord(value: unknown): ResponseRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as ResponseRecord : null;
}

/**
 * Offline adapter. The caller must inject a transport explicitly. There is
 * no default global fetch, API credential, or live provisioning.
 */
export function createOpenAIMockDecisionPolicy(options: {
  enabled?: string;
  model: string;
  fetch: InjectedFetch;
  maxOutputTokens?: number;
}): BotPolicy {
  return async (observation: BotObservation, signal: AbortSignal) => {
    if (options.enabled !== "true") throw new BotPolicyError("unsupported");
    const maxOutputTokens = options.maxOutputTokens ?? 160;
    if (!/^[a-z0-9][a-z0-9_.:-]{0,99}$/i.test(options.model) || !Number.isSafeInteger(maxOutputTokens)
      || maxOutputTokens < 16 || maxOutputTokens > 512 || !observation.choices.length || signal.aborted) {
      throw new BotPolicyError("invalid");
    }
    const allowedIds = observation.choices.map(({ id }) => id);
    const response = await options.fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal,
      body: JSON.stringify({
        model: options.model,
        store: false,
        max_output_tokens: maxOutputTokens,
        instructions: "Select exactly one supplied legal candidate. Do not invent actions.",
        input: JSON.stringify(observation),
        text: { format: { type: "json_schema", name: "bot_decision", strict: true, schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            observationVersion: { type: "integer", enum: [2] },
            decisionId: { type: "string", enum: [observation.decisionId] },
            selectedCandidateId: { type: "string", enum: allowedIds },
            reason: { type: "string" },
          },
          required: ["observationVersion", "decisionId", "selectedCandidateId", "reason"],
        } } },
      }),
    });
    if (response.status === 429) throw new BotPolicyError("rate_limited");
    if (response.status >= 500) throw new BotPolicyError("server_error");
    if (!response.ok) throw new BotPolicyError("invalid");
    const result = asRecord(await response.json().catch(() => null));
    if (result?.status === "incomplete") throw new BotPolicyError("incomplete");
    if (result?.status !== "completed" || !Array.isArray(result.output)) throw new BotPolicyError("invalid");
    const text: string[] = [];
    for (const entry of result.output) {
      const message = asRecord(entry);
      if (message?.type !== "message" || !Array.isArray(message.content)) continue;
      if (message.status !== undefined && message.status !== "completed") throw new BotPolicyError("incomplete");
      for (const item of message.content) {
        const content = asRecord(item);
        if (content?.type === "refusal") throw new BotPolicyError("refusal");
        if (content?.type === "output_text" && typeof content.text === "string") text.push(content.text);
      }
    }
    if (text.length !== 1 || text[0].length > 4096) throw new BotPolicyError("invalid");
    let selection: ResponseRecord | null;
    try { selection = asRecord(JSON.parse(text[0])); }
    catch { throw new BotPolicyError("invalid"); }
    if (!selection || selection.observationVersion !== 2 || selection.decisionId !== observation.decisionId
      || typeof selection.selectedCandidateId !== "string" || !allowedIds.includes(selection.selectedCandidateId)) {
      throw new BotPolicyError("invalid");
    }
    return selection;
  };
}
