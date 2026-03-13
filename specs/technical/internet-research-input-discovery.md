# Internet Research for Input Discovery — Technical Specification

- **x-tsid:** TS-InternetResearchInputDiscovery
- **x-fsid-links:**
  - FS-ResearchButtonVisibleInInputColumn
  - FS-ResearchButtonDisabledWithoutGoal
  - FS-ResearchButtonDisabledWithoutBackend
  - FS-TriggerResearchSendsGoal
  - FS-ResearchReturnsUpToTenSuggestions
  - FS-SuggestionDisplaysTitle
  - FS-SuggestionDisplaysSummary
  - FS-SuggestionDisplaysSourceUrl
  - FS-SuggestionDisplaysRelevanceJustification
  - FS-AcceptSuggestionAddsInput
  - FS-RejectSuggestionRemovesIt
  - FS-EditSuggestionBeforeAccepting
  - FS-AcceptMultipleSuggestions
  - FS-DismissAllSuggestions
  - FS-ResearchErrorDisplaysMessage
  - FS-ResearchNoResultsDisplaysMessage
  - FS-ResearchPageFetchPartialFailure
  - FS-ReResearchAllowed

## Overview

Add a backend endpoint `POST /research` that takes a discovery goal, searches the Internet via a Web Search API (Brave Search), fetches and extracts content from result pages, then uses the LLM to filter and structure results by relevance. Add a "Research" button in the Inputs column that triggers this flow and displays suggestions for the analyst to accept, edit, or reject.

## Backend

### Search Provider Abstraction

New module: `apps/backend/src/search/provider.ts`

```typescript
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchProvider {
  search(query: string, count: number): Promise<SearchResult[]>;
}
```

Factory function `createSearchProvider()` reads `SEARCH_PROVIDER` and `SEARCH_API_KEY` from env. Initially supports `brave` only.

### Brave Search Provider

New module: `apps/backend/src/search/brave-provider.ts`

- Calls `GET https://api.search.brave.com/res/v1/web/search` with `q` and `count` params.
- Header: `X-Subscription-Token: <SEARCH_API_KEY>`.
- Returns up to 20 raw results (title, url, snippet).

### Page Content Extraction

New module: `apps/backend/src/search/page-fetcher.ts`

- Fetches each URL with a 10s timeout per page.
- Parses HTML with `cheerio` (already a dependency).
- Extracts main text content (strips nav, scripts, styles, footers).
- Truncates extracted text to 5000 characters per page.
- Returns `{ url, title, content }` or `null` on failure.
- Fetches pages in parallel with `Promise.allSettled`.

### LLM Research Prompt

New additions in `apps/backend/src/llm/prompts.ts`:

```typescript
export const RESEARCH_SYSTEM_PROMPT = `You are a research assistant...`;

export interface ResearchSuggestion {
  title: string;
  summary: string;
  url: string;
  justification: string;
}

export function buildResearchUserContent(
  goal: string,
  pages: { url: string; title: string; content: string }[],
): string;

export function parseResearchSuggestions(raw: string): ResearchSuggestion[];
```

The system prompt instructs the LLM to:
1. Evaluate each page's relevance to the discovery goal.
2. Extract key points relevant to the goal from each relevant page.
3. Return a JSON array of up to 10 suggestions, ordered by relevance.
4. Each suggestion: `{ title, summary, url, justification }`.
5. Discard pages that are not relevant.

### LLM Provider Method

Add `research()` to `LLMProvider` interface:

```typescript
research(
  goal: string,
  pages: { url: string; title: string; content: string }[],
): Promise<ResearchSuggestion[]>;
```

Temperature: 0.3 (mostly factual extraction, slight flexibility for summarization).
Configurable via `LLM_TEMP_RESEARCH` env var.
Max tokens: 4096 (10 suggestions with summaries need space).

### New Endpoint: POST /research

**Request body:**
```json
{
  "goal": "string (required, non-empty)"
}
```

**Flow:**
1. Validate request (goal required, non-empty string).
2. Check search provider configured (`SEARCH_PROVIDER` + `SEARCH_API_KEY`), else return 503.
3. Check LLM provider configured, else return 503.
4. LLM generates 2-3 search queries from the goal (to broaden coverage).
5. Search provider executes queries (up to 20 raw results total, deduplicated by URL).
6. Page fetcher extracts content from each URL in parallel.
7. Filter out failed fetches (keep track for partial failure notice).
8. LLM processes pages: filter by relevance, extract summaries, produce up to 10 suggestions.
9. Return response with suggestions and fetch failure count.

**Response (200):**
```json
{
  "suggestions": [
    {
      "title": "Page title",
      "summary": "Key points extracted from the page relevant to the goal...",
      "url": "https://example.com/article",
      "justification": "This source provides data on..."
    }
  ],
  "fetch_failures": 2
}
```

**Error responses:**
- 400: Missing or empty goal.
- 502: Search API error or LLM error.
- 503: Search provider or LLM not configured.

**Timeouts:**
- Search API: 15s.
- Page fetch: 10s per page (parallel).
- LLM processing: 60s.
- Total endpoint timeout: 90s.

### Nginx Proxy

Add `/research` location to `apps/frontend/nginx.conf.template`:
```nginx
location /research {
    proxy_pass ${BACKEND_URL}/research;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_read_timeout 120s;
}
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SEARCH_PROVIDER` | Yes (for M21) | — | Search provider name (`brave`) |
| `SEARCH_API_KEY` | Yes (for M21) | — | API key for the search provider |
| `LLM_TEMP_RESEARCH` | No | `0.3` | LLM temperature for research extraction |

## Frontend

### Research Button (InputList.tsx or InputColumn header)

- "Research" button visible in Inputs column header when `backendAvailable` is true and `searchAvailable` is true.
- Disabled when `goal` is empty (tooltip: "Set a discovery goal first").
- On click: calls `POST /research` with `{ goal }`.
- Shows loading spinner during request.

### Research Suggestions Panel (new component: ResearchSuggestions.tsx)

- Displayed below the Inputs column header after research completes.
- Each suggestion card shows:
  - **Title** (bold)
  - **Summary** (extracted content, multi-line)
  - **Source URL** (clickable link, opens in new tab)
  - **Justification** (italic, explains relevance)
  - **Accept** button (adds as input)
  - **Edit** button (opens inline edit before accept)
  - **Reject** button (removes from list)
- Partial failure notice: "N sources could not be accessed" if `fetch_failures > 0`.
- "Dismiss all" button to close the panel.
- Empty state: "No relevant sources found for this goal."

### Backend Status Check

Add `searchAvailable` to the status check mechanism:
- Frontend calls `GET /status` — backend includes `searchAvailable: true/false` based on whether `SEARCH_PROVIDER` and `SEARCH_API_KEY` are configured.
- Research button visibility depends on both `backendAvailable` and `searchAvailable`.

### Accept Flow

When analyst clicks "Accept" on a suggestion:
1. Create a new input with:
   - `type: "web"`
   - `title`: suggestion title
   - `text`: suggestion summary
   - `url`: suggestion source URL
2. Add to the inputs array in discovery state.
3. Remove the suggestion from the panel.

### Edit Flow

When analyst clicks "Edit":
1. Suggestion card switches to edit mode (title and summary become editable textareas).
2. "Save & Accept" replaces the Accept button.
3. On save: creates input with edited content, preserving the original URL.
