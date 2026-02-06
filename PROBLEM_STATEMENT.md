# Problem Statement

## Problem

Analysts conducting discovery sessions experience a lack of structured tooling for extracting actionable outputs from heterogeneous inputs, which causes loss of traceability between raw sources and final recommendations, and prevents real-time collaborative analysis.

## Current Flow

1. An analyst gathers inputs (documents, web pages, media) relevant to a discovery goal.
2. The analyst manually extracts facts from these inputs.
3. Facts are interpreted into insights.
4. Insights are synthesized into recommendations.
5. Recommendations produce actionable outputs.

Each step depends on the previous one, forming a linear pipeline: **Input → Fact → Insight → Recommendation → Output**.

## Failure Points

- Relationships between entities (e.g., which facts come from which inputs) are lost in manual processes.
- There is no visual traceability from an output back to its originating inputs.
- Collaborative sessions lack real-time synchronization: multiple analysts cannot work on the same discovery simultaneously.
- Data is not persisted between sessions unless manually exported/imported as JSON files.

## Success Outcomes

- An analyst can create a discovery session, add inputs, and build the full pipeline (Facts, Insights, Recommendations, Outputs) with explicit relationships preserved at every step.
- Any entity can be visually traced forward (to its dependents) and backward (to its sources) in a single view.
- Multiple analysts can join a live session and see each other's changes in real time.
- Discovery data is persisted server-side and retrievable by session ID.

## Non-Goals

- AI-assisted extraction of facts or insights from inputs (no automated analysis).
- User authentication or access control.
- Version history or undo/redo of entity changes.
- Support for non-browser clients (mobile apps, desktop apps).

## Scope Boundaries

| In Scope | Out of Scope |
|----------|-------------|
| CRUD operations on all 5 entity types (Input, Fact, Insight, Recommendation, Output) | Rich text editing or formatting within entities |
| Visual relationship graph between entities | Graph layout algorithms (current layout is column-based) |
| Real-time collaborative sessions via SSE | Conflict resolution for concurrent edits |
| JSON import/export of discovery data | Integration with external data sources or APIs |
| Server-side room-based session management | Multi-room participation for a single user |
