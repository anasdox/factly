# Implementation Plan

## Context
- Planning scope (program/release): M18 — Conversational Chat on Discovery
- Roadmap links: M18 (Conversational Chat on Discovery)
- Planning horizon: Single release cycle
- Scope summary: Floating chat widget with @mention support, streaming LLM responses via SSE, tool calling for pipeline modifications (add/delete/edit) with analyst confirmation, persistent chat history
- Assumptions: M1–M17 delivered; existing LLM provider infrastructure reused; Anthropic SDK supports streaming with tools; no new npm packages required

## Global feature sequencing
| Order | Feature | Outcome | Depends on | FSIDs | TSIDs | Acceptance tests | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Data model: ChatMessage types | DiscoveryData extended with chat_history, ChatMessage type defined | — | FS-ChatHistoryPersisted, FS-ChatHistorySavedWithDiscovery, FS-ChatHistoryClearedOnNewDiscovery | TS-ConversationalChat | conversational-chat.test.ts | — | Planned |
| 2 | Backend: chat prompt builder | System prompt, context builder (full/summarized), tool definitions | — | FS-ChatFullContextBelowThreshold, FS-ChatSummarizedContextAboveThreshold, FS-ChatAtMentionContext | TS-ConversationalChat | conversational-chat.test.ts | — | Planned |
| 3 | Backend: LLMProvider chatStream method | New chatStream() on provider interface + Anthropic/OpenAI implementations with streaming | 2 | FS-StreamingResponse, FS-ChatStreamingInterruption | TS-ConversationalChat | conversational-chat.test.ts | — | Planned |
| 4 | Backend: POST /chat/message endpoint | Express route with SSE response, request validation, context building, LLM streaming | 2, 3 | FS-SendMessage, FS-StreamingResponse, FS-ChatErrorDisplay, FS-ChatAddItem, FS-ChatDeleteItem, FS-ChatEditItem | TS-ChatMessage | conversational-chat.test.ts | — | Planned |
| 5 | Frontend: useChatStream hook | fetch + ReadableStream SSE consumer, token/tool_call/done/error event handling | — | FS-SendMessage, FS-StreamingResponse, FS-SendMessageDisabledDuringResponse, FS-ChatStreamingInterruption | TS-ConversationalChat | conversational-chat.test.ts | — | Planned |
| 6 | Frontend: ChatWidget shell | ChatButton (FAB), ChatPanel (floating, draggable), ChatHeader, MessageList, ChatInput | — | FS-ChatWidgetToggle, FS-ChatWidgetHiddenWithoutDiscovery, FS-ChatWidgetDraggable | TS-ConversationalChat | conversational-chat.test.ts | — | Planned |
| 7 | Frontend: @mention autocomplete | AtMentionDropdown triggered by @, grouped items, keyboard nav, Ctrl+Click from pipeline | 6 | FS-ChatAtMentionAutocomplete, FS-ChatAtMentionSelect, FS-ChatClickItemToReference, FS-ChatAtMentionInResponse | TS-ConversationalChat | conversational-chat.test.ts | — | Planned |
| 8 | Frontend: ActionCards (add/delete/edit) | Confirmation cards for tool calls with confirm/edit/cancel actions, pipeline state mutation | 5, 6 | FS-ChatAddItem, FS-ChatAddItemConfirm, FS-ChatAddItemEdit, FS-ChatAddItemCancel, FS-ChatDeleteItem, FS-ChatDeleteItemConfirm, FS-ChatDeleteItemCancel, FS-ChatEditItem, FS-ChatEditItemApply, FS-ChatEditItemModify, FS-ChatEditItemCancel, FS-ChatActionErrorRollback | TS-ConversationalChat | conversational-chat.test.ts | — | Planned |
| 9 | Frontend: chat history persistence | Store/load chat_history in DiscoveryData, export/import, clear on new discovery | 1, 6 | FS-ChatHistoryPersisted, FS-ChatHistorySavedWithDiscovery, FS-ChatHistoryClearedOnNewDiscovery | TS-ConversationalChat | conversational-chat.test.ts | — | Planned |
| 10 | Integration: end-to-end wiring | Connect ChatWidget to App.tsx, wire useChatStream to backend, @mention to ActionCards pipeline | 4, 5, 6, 7, 8, 9 | FS-AskQuestionAboutDiscovery, FS-AskForGapAnalysis, FS-AskForSummary, FS-ChatProactiveSuggestions, FS-ChatSuggestMissingConnections | TS-ConversationalChat | conversational-chat.test.ts | — | Planned |

## Cross-feature dependencies and blockers
| Dependency | Upstream | Downstream | Impact if late | Mitigation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| ChatMessage types | Slice 1 (types.ts) | Slices 5, 6, 8, 9 (hook, widget, cards, persistence) | Blocks all frontend chat components | Deliver first, zero risk | — | Open |
| Chat prompt builder | Slice 2 (chat-prompts.ts) | Slices 3, 4 (provider method, endpoint) | Blocks backend streaming | Deliver alongside provider method | — | Open |
| LLM chatStream method | Slice 3 (providers) | Slice 4 (endpoint) | Blocks the endpoint | Can mock for frontend development | — | Open |
| Backend endpoint | Slice 4 | Slice 10 (integration) | Frontend can develop against mock data | Define SSE event contract early | — | Open |
| Existing pipeline utilities | lib.ts (createNewVersion, propagateImpact) | Slice 8 (ActionCards) | ActionCards reuse existing logic | Already delivered in M14/M15 | — | Resolved |

## Critical path and milestones
- Critical path: S1-Types → S2-Prompts → S3-Provider → S4-Endpoint → S10-Integration
- Parallel track: S5-Hook + S6-Widget + S7-Mention + S8-ActionCards (can develop with mocks)
- Milestone: M18 Complete
  - Target date: —
  - Exit criteria: All acceptance tests pass, chat widget functional with streaming, all action types (add/delete/edit) confirmed working, chat history persists across sessions

## Validation checkpoints
- [ ] Functional specs validated for planned slices
- [ ] Technical specs validated for planned slices
- [ ] Acceptance tests validated for planned slices
- [ ] Implementation done for current milestone
- [ ] CI green (all acceptance tests pass, TypeScript clean)
- [ ] Refactoring validated (acceptance + full tests green)
- [ ] Demo prepared and validated by UoR

## Risks and trade-offs
- Risk: Streaming with tool calls requires different handling per LLM provider
  - Trigger: Anthropic uses content_block events, OpenAI uses delta.tool_calls
  - Response: Abstract in chatStream() method; implement Anthropic first (primary provider)
- Risk: Large Discovery context exceeds LLM token limits
  - Trigger: Discoveries with >100 items even with summarization
  - Response: Configurable threshold (CHAT_CONTEXT_THRESHOLD), @mentioned items always in full, rest summarized
- Risk: SSE streaming via POST requires manual parsing (no native EventSource)
  - Trigger: Browser EventSource only supports GET
  - Response: Use fetch + ReadableStream with manual SSE parsing; well-tested pattern
- Risk: Chat-driven modifications could conflict with ongoing collaborative sessions
  - Trigger: Two analysts in same room, one uses chat to modify items
  - Response: Standard room broadcast applies; chat modifications go through setData like all other edits
- Risk: Tool call JSON accumulation during streaming may be incomplete
  - Trigger: Network interruption during tool call streaming
  - Response: Only emit tool_call event after complete accumulation; display error on interruption

## Open questions
- None currently

## Change log
- 2026-02-18:
  - Change: New plan created for M18 (replacing M14+M15 plan)
  - Reason: M14+M15 delivered and validated; starting M18 Conversational Chat
