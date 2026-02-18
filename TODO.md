# TODO

## Intent
Deliver M18: Conversational Chat on Discovery — an analyst can chat with Factly about the current discovery to ask questions, get explanations, and request modifications (add/delete/edit items) with explicit confirmation before any change is applied.

## Preconditions
- M1–M17: Delivered (M16+M17 validated 2026-02-18)
- ROADMAP.md updated with M18

## Tasks
- [x] Problem understanding and blocking questions (4 Q&A: widget style, tool calling, streaming, context strategy)
- [x] Write functional specs for M18 (38 scenarios in conversational-chat.feature)
- [x] UoR validation of functional specs
- [x] Write technical specs for M18 (TS-ConversationalChat + TS-ChatMessage in OpenAPI)
- [x] UoR validation of technical specs
- [x] Create/update IMPLEMENTATION_PLAN.md (10 slices, 5 cross-feature dependencies)
- [x] Write acceptance tests for M18 (45 tests in conversational-chat.test.ts, all passing)
- [x] UoR validation of implementation plan + acceptance tests
- [x] Implement M18 (10 slices: types, prompts, provider, endpoint, hook, widget, @mention, action cards, history, integration)
- [x] All acceptance tests pass (45/45)
- [x] TypeScript compiles cleanly (frontend + backend)
- [x] Refactoring phase (minor: import ordering, generateId placement)
- [ ] Demo and user validation

## Validation
- All acceptance tests pass
- TypeScript compiles cleanly (frontend + backend)

## Done when
- Chat panel accessible from an open discovery session
- Chat is context-aware (sees full discovery state)
- Analyst can ask Factly to add items (with confirmation)
- Analyst can ask Factly to delete items (with dependency warning + confirmation)
- Analyst can ask Factly to edit items (with before/after diff + confirmation)
- Analyst can ask questions about the discovery and get contextual answers
- Factly can proactively propose improvements and next steps
- No modification applied without explicit analyst confirmation
- Chat history persisted per discovery session
- All CI gates green
- User validation complete
