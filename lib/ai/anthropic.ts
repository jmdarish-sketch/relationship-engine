import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  }
  return client;
}

// ---------------------------------------------------------------------------
// Model calls
// ---------------------------------------------------------------------------

export async function callHaiku(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  return callModel("claude-haiku-4-5-20251001", systemPrompt, userPrompt, 1024);
}

export async function callSonnet(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  return callModel("claude-sonnet-4-20250514", systemPrompt, userPrompt, 4096);
}

async function callModel(
  model: string,
  system: string,
  user: string,
  maxTokens: number,
  retries = 2
): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await getClient().messages.create({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
      });

      const block = response.content[0];
      return block.type === "text" ? block.text : "";
    } catch (err: unknown) {
      // Retry on rate limits and transient errors
      const status = (err as { status?: number }).status;
      if (attempt < retries && (status === 429 || status === 529 || status === 500)) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded");
}

// ---------------------------------------------------------------------------
// JSON extraction
// ---------------------------------------------------------------------------

/**
 * Extract the first JSON object from a Claude response.
 * Handles markdown code fences and surrounding text.
 */
export function parseStructuredResponse<T>(text: string): T | null {
  // Try the raw text first
  try {
    return JSON.parse(text) as T;
  } catch {
    // ignore
  }

  // Extract between first { and last }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1)) as T;
    } catch {
      // ignore
    }
  }

  return null;
}
