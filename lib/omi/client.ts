import type { OmiConversation } from "@/lib/types";

const OMI_API_BASE = "https://api.omi.me";

/**
 * Fetch conversations from Omi REST API with pagination.
 */
export async function fetchOmiConversations(
  apiKey: string,
  options: {
    offset?: number;
    limit?: number;
  } = {}
): Promise<OmiConversation[]> {
  const { offset = 0, limit = 50 } = options;

  const url = new URL(`${OMI_API_BASE}/v1/dev/user/conversations`);
  url.searchParams.set("include_transcript", "true");
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("limit", String(limit));

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Omi API error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Fetch all conversations from Omi, paginating until no more results.
 */
export async function fetchAllOmiConversations(
  apiKey: string
): Promise<OmiConversation[]> {
  const all: OmiConversation[] = [];
  let offset = 0;
  const limit = 50;

  while (true) {
    const batch = await fetchOmiConversations(apiKey, { offset, limit });
    if (batch.length === 0) break;
    all.push(...batch);
    if (batch.length < limit) break;
    offset += limit;
  }

  return all;
}
