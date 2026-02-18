# Conversational Chat on Discovery — Technical Specification

- **x-tsid:** TS-ConversationalChat
- **x-fsid-links:**
  - FS-ChatWidgetToggle
  - FS-ChatWidgetHiddenWithoutDiscovery
  - FS-ChatWidgetDraggable
  - FS-ChatAtMentionAutocomplete
  - FS-ChatAtMentionSelect
  - FS-ChatAtMentionContext
  - FS-ChatClickItemToReference
  - FS-ChatAtMentionInResponse
  - FS-SendMessage
  - FS-StreamingResponse
  - FS-SendMessageDisabledDuringResponse
  - FS-AskQuestionAboutDiscovery
  - FS-AskForGapAnalysis
  - FS-AskForSummary
  - FS-ChatAddItem
  - FS-ChatAddItemConfirm
  - FS-ChatAddItemEdit
  - FS-ChatAddItemCancel
  - FS-ChatDeleteItem
  - FS-ChatDeleteItemConfirm
  - FS-ChatDeleteItemCancel
  - FS-ChatEditItem
  - FS-ChatEditItemApply
  - FS-ChatEditItemModify
  - FS-ChatEditItemCancel
  - FS-ChatProactiveSuggestions
  - FS-ChatSuggestMissingConnections
  - FS-ChatHistoryPersisted
  - FS-ChatHistorySavedWithDiscovery
  - FS-ChatHistoryClearedOnNewDiscovery
  - FS-ChatFullContextBelowThreshold
  - FS-ChatSummarizedContextAboveThreshold
  - FS-ChatErrorDisplay
  - FS-ChatActionErrorRollback
  - FS-ChatStreamingInterruption

## Overview

Add a conversational chat feature allowing the analyst to interact with Factly via natural language about the current Discovery. The backend exposes a new SSE streaming endpoint that receives chat messages with Discovery context, calls the LLM with tool definitions, and streams the response back. The frontend adds a floating chat widget with @mention support, confirmation cards for pipeline actions, and persistent chat history.

## Architecture

```
┌─────────────────────────┐
│   Frontend (React)      │
│                         │
│  ChatWidget             │
│   ├── ChatButton        │   POST /chat/message
│   ├── ChatPanel         │──────────────────────►┌──────────────────────┐
│   │   ├── MessageList   │                       │  Backend (Express)   │
│   │   ├── ChatInput     │◄─────────────────────-│                      │
│   │   │   └── @mention  │   SSE stream          │  POST /chat/message  │
│   │   └── ActionCards   │   (tokens + tool      │   ├── Build context  │
│   └── ChatHistory       │    calls)              │   ├── Call LLM       │
│                         │                       │   │   with tools     │
└─────────────────────────┘                       │   └── Stream SSE     │
                                                  └──────────────────────┘
```

## Data Model Changes (types.ts)

### New types

```typescript
type ChatMessageRole = 'user' | 'assistant';

type ChatToolCall = {
  tool: 'add_item' | 'delete_item' | 'edit_item';
  params: Record<string, unknown>;
  status: 'pending' | 'confirmed' | 'cancelled' | 'applied' | 'error';
};

type ChatMessage = {
  id: string;             // UUID v4
  role: ChatMessageRole;
  content: string;        // Text content (may contain item references as [ID])
  tool_calls?: ChatToolCall[];
  created_at: string;     // ISO timestamp
  references?: string[];  // Item IDs referenced via @mention
};
```

### Extended DiscoveryData

```typescript
type DiscoveryData = {
  // ... existing fields ...
  chat_history?: ChatMessage[];  // Optional, backward-compatible
};
```

## Backend

### New endpoint: POST /chat/message (SSE streaming)

This endpoint receives a chat message, builds the Discovery context, calls the LLM with tool definitions, and streams the response back as SSE events.

**Request body:**
```json
{
  "message": "string (required, non-empty)",
  "chat_history": [
    {
      "role": "user | assistant",
      "content": "string",
      "tool_calls": [{ "tool": "string", "params": {}, "status": "string" }]
    }
  ],
  "discovery_context": {
    "goal": "string",
    "title": "string",
    "inputs": [{ "input_id": "string", "type": "string", "title": "string", "text": "string" }],
    "facts": [{ "fact_id": "string", "text": "string", "related_inputs": ["string"], "status": "string" }],
    "insights": [{ "insight_id": "string", "text": "string", "related_facts": ["string"], "status": "string" }],
    "recommendations": [{ "recommendation_id": "string", "text": "string", "related_insights": ["string"], "status": "string" }],
    "outputs": [{ "output_id": "string", "text": "string", "type": "string", "related_recommendations": ["string"], "status": "string" }]
  },
  "referenced_items": [
    { "id": "string", "type": "input | fact | insight | recommendation | output", "text": "string" }
  ]
}
```

**Response: SSE stream (text/event-stream)**

Event types:
```
event: token
data: {"text": "partial text"}

event: tool_call
data: {"tool": "add_item", "params": {"entity_type": "fact", "text": "...", "related_inputs": ["I-1"]}}

event: done
data: {"message_id": "uuid"}

event: error
data: {"error": "error message"}
```

**Error responses (non-streaming):**
- 400: Missing or invalid fields → `{ "error": "..." }`
- 503: LLM provider not configured → `{ "error": "Chat service not configured" }`

### Context building strategy

The backend builds the LLM context based on the Discovery size:

**Threshold:** configurable via `CHAT_CONTEXT_THRESHOLD` env var (default: 50 total items across all columns).

**Below threshold (full context):**
- All items from all columns are included with full text, IDs, relationships, and status.
- Format: structured JSON injected into the system prompt.

**Above threshold (summarized context):**
- Summary includes: item counts per column, discovery goal/title, key themes extracted from item texts (first 200 chars each), relationship overview (orphan count, chain depth stats).
- Referenced items (via @mention) are always included in full detail regardless of threshold.

### LLM tool definitions

The LLM is called with the following tool definitions (Anthropic tool_use format):

```json
[
  {
    "name": "add_item",
    "description": "Add a new item to the Discovery pipeline. Always use this tool when the analyst asks to add a fact, insight, recommendation, or output. Propose the item with pre-filled fields for the analyst to confirm.",
    "input_schema": {
      "type": "object",
      "required": ["entity_type", "text"],
      "properties": {
        "entity_type": {
          "type": "string",
          "enum": ["fact", "insight", "recommendation", "output"],
          "description": "The type of entity to add"
        },
        "text": {
          "type": "string",
          "description": "The content text for the new item"
        },
        "related_ids": {
          "type": "array",
          "items": { "type": "string" },
          "description": "IDs of related upstream items (e.g., input IDs for a fact, fact IDs for an insight)"
        },
        "output_type": {
          "type": "string",
          "enum": ["report", "presentation", "action_plan", "brief"],
          "description": "Required only when entity_type is 'output'"
        }
      }
    }
  },
  {
    "name": "delete_item",
    "description": "Delete an item from the Discovery pipeline. Always use this tool when the analyst asks to remove an item. Show the item details and downstream impact for confirmation.",
    "input_schema": {
      "type": "object",
      "required": ["entity_type", "item_id"],
      "properties": {
        "entity_type": {
          "type": "string",
          "enum": ["input", "fact", "insight", "recommendation", "output"],
          "description": "The type of entity to delete"
        },
        "item_id": {
          "type": "string",
          "description": "The ID of the item to delete"
        }
      }
    }
  },
  {
    "name": "edit_item",
    "description": "Edit an existing item in the Discovery pipeline. Always use this tool when the analyst asks to modify an item's text. Show a before/after comparison for confirmation.",
    "input_schema": {
      "type": "object",
      "required": ["entity_type", "item_id", "new_text"],
      "properties": {
        "entity_type": {
          "type": "string",
          "enum": ["input", "fact", "insight", "recommendation", "output"],
          "description": "The type of entity to edit"
        },
        "item_id": {
          "type": "string",
          "description": "The ID of the item to edit"
        },
        "new_text": {
          "type": "string",
          "description": "The proposed new text for the item"
        }
      }
    }
  }
]
```

### LLM system prompt

```
You are Factly, an AI research assistant helping an analyst work on a Discovery session.

The Discovery pipeline follows this chain: Input → Fact → Insight → Recommendation → Output.

Your role:
- Answer questions about the Discovery using the provided context.
- When the analyst asks to add, delete, or edit items, use the appropriate tool.
- Proactively identify gaps, missing connections, and suggest improvements when asked.
- Always reference items by their IDs (e.g., F-1, I-1, N-1, R-1, O-1).
- Be concise and precise. Use the analyst's language.

Current Discovery:
Title: {title}
Goal: {goal}

{context}
```

### Streaming implementation

The backend uses the Anthropic SDK streaming API (`client.messages.stream()`) or equivalent for OpenAI (`stream: true`).

**Anthropic streaming flow:**
1. Open SSE response with headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`.
2. Call `client.messages.stream({ ..., tools, stream: true })`.
3. On `content_block_delta` with `text_delta`: emit `event: token` with the delta text.
4. On `content_block_start` with `tool_use`: accumulate tool input.
5. On `content_block_stop` for `tool_use`: emit `event: tool_call` with the complete tool call.
6. On `message_stop`: emit `event: done`.
7. On error: emit `event: error` and close the stream.

**OpenAI streaming flow:**
1. Same SSE response headers.
2. Call `client.chat.completions.create({ ..., tools, stream: true })`.
3. On `delta.content`: emit `event: token`.
4. On `delta.tool_calls`: accumulate tool call arguments.
5. On `finish_reason: 'tool_calls'`: emit `event: tool_call` for each accumulated tool call.
6. On `finish_reason: 'stop'`: emit `event: done`.
7. On error: emit `event: error` and close the stream.

### LLMProvider interface extension

```typescript
// New method added to LLMProvider interface
chatStream(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  tools: ToolDefinition[],
  onToken: (text: string) => void,
  onToolCall: (tool: string, params: Record<string, unknown>) => void,
): Promise<void>;
```

Each provider (Anthropic, OpenAI, OpenAI-Compatible) implements this method using their respective streaming APIs.

### Chat prompt builder

New file: `apps/backend/src/llm/chat-prompts.ts`

```typescript
export function buildChatSystemPrompt(
  title: string,
  goal: string,
  context: DiscoveryContext,
  totalItems: number,
  threshold: number,
): string;

export function buildFullContext(context: DiscoveryContext): string;
export function buildSummarizedContext(context: DiscoveryContext): string;

export const CHAT_TOOLS: ToolDefinition[];
```

## Frontend

### New component: ChatWidget

**File:** `apps/frontend/src/components/ChatWidget.tsx`

**Structure:**
```
ChatWidget
├── ChatButton          (floating FAB, bottom-right)
├── ChatPanel           (floating panel above button)
│   ├── ChatHeader      (title, drag handle, close button)
│   ├── MessageList     (scrollable message area)
│   │   ├── UserMessage
│   │   ├── AssistantMessage
│   │   └── ActionCard  (add/delete/edit confirmation)
│   └── ChatInput       (text input with @mention + send button)
└── AtMentionDropdown   (autocomplete for @references)
```

### ChatButton

- Fixed position: `bottom: 24px; right: 24px`.
- Circular button with chat icon (faComments).
- Hidden when `data` is null (no discovery loaded).
- Toggles `ChatPanel` visibility on click.
- Badge with unread count when panel is closed and new assistant messages arrive.

### ChatPanel

- Floating panel: `width: 400px; height: 500px` (resizable via CSS).
- Position: above the ChatButton, `bottom: 80px; right: 24px`.
- Draggable via the header bar (mouse drag events on header element).
- Maintains position in component state; clamped to viewport bounds.
- z-index above all other components but below modals.

### ChatInput

- Text input field with placeholder "Ask Factly about your discovery...".
- Send button (faPaperPlane icon), enabled only when input is non-empty and no response is streaming.
- Submit on Enter key press (Shift+Enter for newline).
- Disabled state: input field and send button disabled while streaming.

### @mention autocomplete (AtMentionDropdown)

**Trigger:** typing `@` character in the ChatInput.

**Dropdown content:**
- Grouped by column: Inputs, Facts, Insights, Recommendations, Outputs.
- Each entry: `{ID} — {truncated text (50 chars)}`.
- Keyboard navigation: arrow keys to move, Enter to select, Escape to close.
- Filtered by text typed after `@` (e.g., `@F-` filters to facts).

**Selection:**
- Replaces the `@...` text with a styled inline tag: `<span class="chat-mention" data-id="{id}">{ID}</span>`.
- Internally tracked in `references` array for the message.

**Ctrl/Cmd+Click on pipeline item:**
- When the chat widget is open and the analyst Ctrl/Cmd+clicks an item in the pipeline grid, the item's ID is appended to the chat input as a mention tag.
- The chat input is focused.

### MessageList

- Auto-scrolls to bottom on new messages.
- User messages: right-aligned, blue background.
- Assistant messages: left-aligned, gray background, supports Markdown rendering (react-markdown).
- Item references in assistant responses rendered as clickable tags.
- Clicking a reference tag dispatches a custom event that the pipeline grid listens to, highlighting the referenced item.

### ActionCard (confirmation cards)

Three variants based on tool call type:

**AddItemCard:**
- Shows: entity type, proposed text, proposed relationships.
- Actions: "Confirm" (green), "Edit" (blue), "Cancel" (gray).
- Edit mode: fields become editable inputs.
- On confirm: calls `setData` to add the item to the appropriate array with a generated UUID, triggers dedup check and impact propagation via existing utilities.

**DeleteItemCard:**
- Shows: entity type, item ID, item text (truncated), downstream impact count (computed via `getRelatedEntities` from `lib.ts`).
- Actions: "Confirm deletion" (red), "Cancel" (gray).
- On confirm: removes item from data, triggers staleness propagation via existing `propagateImpact` with `'archived'` mode.

**EditItemCard:**
- Shows: entity type, item ID, "Before" text, "After" text (diff-style, side by side or inline).
- Actions: "Apply" (green), "Edit" (blue), "Cancel" (gray).
- Edit mode: "After" field becomes editable.
- On confirm: updates item text via `createNewVersion` from `lib.ts`, triggers staleness propagation via `propagateImpact`.

**Card states:**
- `pending`: Actions visible, awaiting analyst decision.
- `applied`: Grayed out with green checkmark, "Applied" label.
- `cancelled`: Grayed out with "Cancelled" label.
- `error`: Red border with error message, actions re-enabled for retry.

### SSE consumption for chat streaming

**New hook: `useChatStream`**

```typescript
function useChatStream() {
  // Returns:
  //   sendMessage(text: string, references: string[]): void
  //   isStreaming: boolean
  //   streamingContent: string
  //   toolCalls: ChatToolCall[]
}
```

**Implementation:**
1. On `sendMessage`: POST to `/chat/message` with `Accept: text/event-stream`.
2. Use `fetch` with `response.body.getReader()` to read the SSE stream (not `EventSource`, since we need POST).
3. Parse SSE events manually (split by `\n\n`, extract `event:` and `data:` fields).
4. On `event: token`: append `data.text` to `streamingContent`.
5. On `event: tool_call`: add to `toolCalls` array and render the appropriate ActionCard.
6. On `event: done`: finalize the message, reset streaming state.
7. On `event: error`: display error in chat, reset streaming state.

### Chat history persistence

- `chat_history` is stored in the `DiscoveryData` object.
- On each message exchange (user + assistant), append to `data.chat_history`.
- Persisted to localStorage via the existing `setData` flow.
- Included in JSON export/import (backward-compatible: missing field defaults to `[]`).
- Cleared when creating a new Discovery (`chat_history: []`).
- On widget open: load messages from `data.chat_history`.

### Integration with App.tsx

- `ChatWidget` is rendered in `App.tsx` alongside existing components.
- Props: `data`, `setData`, `backendAvailable`.
- The widget accesses the full Discovery state via `data` and applies modifications via `setData`.

## Configuration

New environment variables in `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `CHAT_CONTEXT_THRESHOLD` | `50` | Total item count above which the Discovery context is summarized |
| `LLM_TEMP_CHAT` | `0.4` | LLM temperature for chat responses |
| `LLM_CHAT_MAX_TOKENS` | `4096` | Max tokens for chat LLM response |

## Dependencies

**Backend — no new npm packages required:**
- Anthropic SDK already supports `messages.stream()` with tools.
- OpenAI SDK already supports streaming with tool calls.
- Express already supports SSE responses.

**Frontend — no new npm packages required:**
- `react-markdown` already available for Markdown rendering.
- Native `fetch` + `ReadableStream` for SSE consumption (no EventSource needed for POST).
- Drag events handled with native mouse events.

## Sequence Diagrams

### Chat message with text response

```
Analyst          Frontend           Backend            LLM
  │                 │                  │                 │
  ├─ Type message ─►│                  │                 │
  │                 ├─ POST /chat/msg ►│                 │
  │                 │  (SSE stream)    ├─ stream() ─────►│
  │                 │                  │◄── token ───────┤
  │                 │◄── event:token ──┤                 │
  │◄── show token ──┤                  │◄── token ───────┤
  │                 │◄── event:token ──┤                 │
  │◄── show token ──┤                  │◄── stop ────────┤
  │                 │◄── event:done ───┤                 │
  │◄── finalize ────┤                  │                 │
```

### Chat message with tool call (add item)

```
Analyst          Frontend           Backend            LLM
  │                 │                  │                 │
  ├─ "Add fact..." ►│                  │                 │
  │                 ├─ POST /chat/msg ►│                 │
  │                 │                  ├─ stream() ─────►│
  │                 │                  │◄── text tokens ─┤
  │                 │◄── event:token ──┤                 │
  │                 │                  │◄── tool_use ────┤
  │                 │◄── event:tool ───┤  (add_item)     │
  │◄── show card ───┤                  │◄── stop ────────┤
  │                 │◄── event:done ───┤                 │
  │                 │                  │                 │
  ├─ Click Confirm ►│                  │                 │
  │                 ├─ setData() ──────┤                 │
  │◄── item added ──┤                  │                 │
```
