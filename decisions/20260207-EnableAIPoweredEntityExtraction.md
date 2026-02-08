# Decision: Enable AI-Powered Entity Extraction

**Date:** 2026-02-07
**Status:** Approved by UoR

## Context
Factly is a structured discovery and analysis platform with a 5-step pipeline: Input → Fact → Insight → Recommendation → Output. Currently, all entity creation across the pipeline is fully manual. The ROADMAP.md explicitly listed "AI-powered analysis or entity extraction" as a project-wide **Non-Goal**.

## Problem
The manual nature of the pipeline limits analyst productivity and scalability. Extracting facts from lengthy text inputs, deriving insights from multiple facts, formulating recommendations, and structuring outputs are time-consuming tasks that could benefit from AI assistance while keeping the analyst in control.

## Options Considered

1. **Keep AI as Non-Goal** — Continue with fully manual pipeline. No architectural change needed, but limits UX improvement potential.
2. **Add AI as optional assist (human-in-the-loop)** — AI proposes entities, analyst validates/edits/rejects. Preserves analyst control and traceability. Requires LLM integration.
3. **Full AI automation** — AI generates the entire pipeline automatically. Reduces analyst role to reviewer only. Risk of losing traceability and domain accuracy.

## Decision
**Option 2: AI as optional assist (human-in-the-loop).**

Remove "AI-powered analysis or entity extraction" from Non-Goals in ROADMAP.md. Add four new milestones (M10–M13) covering the progressive automation of each pipeline step:

- **M10:** Auto Facts Extraction from Text
- **M11:** Auto Insights Extraction
- **M12:** Auto Recommendations Extraction
- **M13:** Auto Outputs Formulation

Each milestone follows the human-in-the-loop pattern: AI proposes, analyst validates.

## Consequences

- **Architecture:** Requires LLM integration (new backend service or API calls). Technical architecture document must be updated.
- **Dependencies:** New external dependency on an LLM provider (API key management, cost, latency).
- **UX:** New UI patterns needed (suggestion cards, accept/reject/edit flows, loading states).
- **Security:** API keys must be managed securely. User data sent to LLM must be considered.
- **Cost:** LLM API calls introduce per-request costs.
- **Risk:** LLM quality varies; hallucinated facts could reduce trust if not properly flagged.

## Related Hypotheses
- H1: AI-assisted extraction will reduce fact creation time by >50% compared to manual entry.
- H2: Human-in-the-loop validation will maintain traceability quality comparable to fully manual entry.

## Affected Features
- M10: Auto Facts Extraction from Text
- M11: Auto Insights Extraction
- M12: Auto Recommendations Extraction
- M13: Auto Outputs Formulation
- GLOBAL_TECHNICAL_ARCHITECTURE.md (must be updated to include LLM integration)
