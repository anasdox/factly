# Ubiquitous Language

This document defines shared terms used throughout the repository. All specs and tests must use these terms consistently.

## Domain Terms

### Actors
- **Analyst**: A human user who conducts discovery sessions, creates entities, and traces relationships between them.

### Core Entities
- **Discovery**: A session container with a title, goal, date, and five ordered collections (Inputs, Facts, Insights, Recommendations, Outputs). Identified by `discovery_id`.
- **Input**: A source material (document, web page, image, video, audio, PDF, CSV) that serves as raw evidence for a discovery. Identified by `input_id`. Has a `type`, `title`, optional `url`, and optional `text`.
- **Fact**: An observable, verifiable statement extracted from one or more Inputs. Identified by `fact_id`. Linked to Inputs via `related_inputs`.
- **Insight**: An interpretation or conclusion derived from one or more Facts. Identified by `insight_id`. Linked to Facts via `related_facts`.
- **Recommendation**: An actionable suggestion derived from one or more Insights. Identified by `recommendation_id`. Linked to Insights via `related_insights`.
- **Output**: A deliverable or decision resulting from one or more Recommendations. Identified by `output_id`. Linked to Recommendations via `related_recommendations`.

### Pipeline
- **Discovery Pipeline**: The ordered chain Input → Fact → Insight → Recommendation → Output. Each step depends on the previous one through explicit `related_*` references.
- **Forward Traversal**: Following the pipeline from an entity to its dependents (e.g., from an Input to the Facts that reference it, then to their Insights, etc.).
- **Backward Traversal**: Following the pipeline from an entity back to its sources (e.g., from an Output to its Recommendations, then to their Insights, etc.).

### Collaboration
- **Room**: A server-side session identified by a UUID. Holds a copy of the Discovery data and manages SSE connections for real-time collaboration.
- **Event Room**: The user-facing name for starting a collaborative session. Creating an Event Room sends the current Discovery data to the backend and opens an SSE channel.
- **Subscriber**: A client connected to a Room via SSE, identified by a `uuid` and a `username`.

### UI Concepts
- **Discovery Grid**: The 5-column visual layout displaying the pipeline (one column per entity type).
- **Relationship Line**: A visual connector drawn between two related entities across adjacent columns.
- **Highlight**: Visual emphasis applied on hover to an entity and all its related entities (forward and backward), including their relationship lines.

## Process Terms
- **Behavior**: An observable outcome expressed in terms of inputs and outputs.
- **Functional spec**: A description of behavior written in plain language and organized as scenarios with FSIDs.
- **Technical spec**: A design or interface description that supports functional behavior and uses TSIDs with FSID links.
- **Acceptance test**: A black-box test that validates behavior against functional specs.
- **Traceability**: The ability to follow a behavior from problem statement to functional spec, technical spec, and acceptance test.
- **User of Record**: The accountable decision-maker for intent and acceptance criteria.

## Forbidden or Ambiguous Terms
- **Fast**: Use explicit performance thresholds or remove the term.
- **Robust**: Replace with concrete error-handling or recovery expectations.
- **Easy**: Replace with measurable outcomes or user-facing tasks.
- **Secure by default**: Specify trust boundaries, inputs, and handling rules.
- **Session**: Ambiguous. Use **Discovery** for the analytical work unit, **Room** for the collaborative server-side session.
- **Item**: Ambiguous in isolation. Always qualify: Input, Fact, Insight, Recommendation, or Output.
- **Data**: Ambiguous. Use **Discovery data** (the full entity graph) or **Room data** (the server-side copy).
