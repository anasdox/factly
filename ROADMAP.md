# Roadmap

## Delivered Features (Existing Code)

### M1: Discovery CRUD (Frontend)
**Status:** Delivered
**Outcome:** An analyst can create, edit, and view a discovery session with title, goal, and date.
- Discovery modal (add/edit mode)
- New discovery creation with confirmation prompt
- Discovery header display (title + goal)

### M2: Entity Pipeline CRUD (Frontend)
**Status:** Delivered
**Outcome:** An analyst can add, edit, and delete entities across the 5-step pipeline with explicit relationships.
- Input CRUD with type classification (text, web, image, video, audio, pdf)
- Fact CRUD with related_inputs selection
- Insight CRUD with related_facts selection
- Recommendation CRUD with related_insights selection
- Output CRUD with related_recommendations selection
- Each entity type has List, Item, and Modal components

### M3: Visual Relationship Graph (Frontend)
**Status:** Delivered
**Outcome:** An analyst can see visual lines connecting related entities across columns, and hover-highlight traces relationships forward and backward.
- 5-column grid layout (Input → Fact → Insight → Recommendation → Output)
- DOM-based line drawing between related entities
- Hover highlight propagation (downstream + upstream traversal)
- Lines recalculated on window resize

### M4: JSON Import/Export (Frontend)
**Status:** Delivered
**Outcome:** An analyst can save a discovery session to a JSON file and reload it later.
- Export to JSON file (download)
- Import from JSON file (file picker)

### M5: Room-Based Session Management (Backend)
**Status:** Partially Delivered
**Outcome:** The backend can create and retrieve rooms, but deletion is buggy and real-time sync is non-functional.
- `POST /rooms` — create room with data
- `GET /rooms/:id` — retrieve room data
- `DELETE /rooms/:id` — stop room (bug: clears ALL rooms)
- `GET /status` — connected client count per room
- SSE endpoint (`GET /events/:roomId`) — connection established, credentials sent
- `POST /rooms/:id/update` — route exists but handler body is commented out

## Identified Bugs

| ID | Description | Location |
|----|-------------|----------|
| BUG-01 | `stopRoom` calls `store.clear()`, deleting ALL rooms instead of only the target room | `apps/backend/src/index.ts:165` |
| BUG-02 | SSE subscribers Set is never initialized for a room; `subscribers.get(roomId)?.add(socket)` is always a no-op | `apps/backend/src/index.ts:115` |
| BUG-03 | `users` Map is declared but never populated; dead structure | `apps/backend/src/index.ts:91` |
| BUG-04 | `POST /rooms/:id/update` handler body is commented out; broadcast never happens | `apps/backend/src/index.ts:75-79` |
| BUG-05 | README states port 3000, code uses port 3002 | `apps/backend/README.md:13` vs `apps/backend/src/index.ts:32` |

## Future Milestones

### M6: Fix Room Lifecycle Bugs
**Outcome:** Room creation, deletion, and SSE subscription work correctly.
- Fix `stopRoom` to delete only the target room (BUG-01)
- Initialize subscribers Set when a room is created (BUG-02)
- Remove or implement `users` Map (BUG-03)
- Uncomment and fix the update broadcast handler (BUG-04)
- Align README with actual port (BUG-05)

### M7: Real-Time Collaborative Sessions
**Outcome:** Multiple analysts joining the same room see each other's changes in real time.
- Backend broadcasts room updates to all connected SSE clients
- Frontend applies received updates to local state
- Conflict-free operation (last-write-wins or similar simple strategy)

### M8: Server-Side Persistence
**Status:** Delivered
**Outcome:** Discovery data survives server restarts.
- Replaced `keyv-file` (random temp path) with `@keyv/sqlite` (deterministic `data/factly.db`)
- Room data retrievable after server restart
- Deleted rooms remain deleted after restart
- Rooms from different server lifecycles coexist

### M9: Input Validation and Error Handling
**Status:** Delivered (Demo validated)
**Outcome:** The backend rejects malformed requests and returns meaningful error responses.
- Schema validation on `POST /rooms` (DiscoveryData: 4 string fields + 5 array fields)
- Schema validation on `POST /rooms/:id/update` (payload, senderUuid, username)
- UUID v4 validation on `:id` parameter for GET, DELETE, and POST /rooms/:id routes
- Global Express error middleware returning structured `{ error: string }` JSON
- Frontend Toast notification component for backend errors
- All fetch calls in Toolbar.tsx check `response.ok` and display errors via toast

### M10: Auto Facts Extraction from Text
**Status:** Delivered (Demo validated 2026-02-07)
**Outcome:** An analyst can trigger AI-assisted extraction of facts from a text input. Proposed facts appear as suggestions that the analyst validates, edits, or rejects before they enter the pipeline.
- Backend endpoint to send input text to LLM and receive structured facts
- LLM integration (provider TBD — Claude API or OpenAI)
- Frontend "Extract Facts" button on text inputs
- Suggestion UI: list of proposed facts with accept/edit/reject actions
- Accepted facts are added to the pipeline with `related_inputs` linked automatically
- Human-in-the-loop: no fact enters the pipeline without analyst validation

### M11: Auto Insights Extraction
**Status:** Delivered (Demo validated 2026-02-07)
**Outcome:** An analyst can trigger AI-assisted derivation of insights from selected facts. Proposed insights appear as suggestions to validate.
- Backend endpoint to send facts to LLM and receive structured insights
- Frontend "Extract Insights" button on fact selection
- Suggestion UI for proposed insights with accept/edit/reject
- Accepted insights link to their source facts automatically

### M12: Auto Recommendations Extraction
**Status:** Delivered (Demo validated 2026-02-07)
**Outcome:** An analyst can trigger AI-assisted formulation of recommendations from selected insights.
- Backend endpoint to send insights to LLM and receive structured recommendations
- Frontend "Extract Recommendations" button on insight selection
- Suggestion UI for proposed recommendations with accept/edit/reject
- Accepted recommendations link to their source insights automatically

### M13: Auto Outputs Formulation
**Status:** Delivered (Demo validated 2026-02-08)
**Outcome:** An analyst can trigger AI-assisted formulation of structured outputs from selected recommendations, with professional Markdown rendering and full traceability.
- Backend endpoint to send recommendations (with full provenance chain) to LLM and receive structured Markdown outputs
- Frontend "Formulate Outputs" button on recommendation selection
- Suggestion UI with Markdown rendering for proposed outputs with accept/edit/reject
- Accepted outputs link to their source recommendations automatically
- Output types: report, presentation, action_plan, brief
- Full traceability: outputs cite recommendations → insights → facts → source excerpts
- Markdown preview modal on output items
- OutputRenderer abstraction for future format extensibility (HTML, PDF, audio)

## Risks and Dependencies

| Risk | Mitigation |
|------|-----------|
| No test coverage on either app | Acceptance tests must be written before any new feature work |
| Frontend state management is purely local; scaling to multiple views or features may be difficult | Evaluate state management approach when adding features beyond M9 |
| No CI/CD pipeline | Set up CI before merging new features to main |
| LLM provider dependency (M10-M13) | Abstract behind a provider interface; support at least two providers |
| LLM API cost per request (M10-M13) | Monitor usage; consider caching repeated extractions |
| LLM hallucination risk (M10-M13) | Human-in-the-loop validation mandatory; no auto-commit to pipeline |
| API key security (M10-M13) | Keys stored server-side only; never exposed to frontend |

## Non-Goals (Project-Wide)

- ~~AI-powered analysis or entity extraction~~ → Moved to Future Milestones (Decision: 20260207-EnableAIPoweredEntityExtraction)
- User authentication and authorization
- Mobile or desktop native clients
- Offline-first or PWA capabilities
- Multi-language / internationalization
