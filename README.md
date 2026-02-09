# factly

A web tool for extracting actionable insights from multiple types of inputs using the FIR approach: **Facts => Insights => Recommendations**.

## Why?

The FIR approach provides a structured method for **extracting unbiased facts related to a problem**, **identifying key insights**, and **formulating actionable recommendations**. It helps navigate complex problems efficiently, ensuring decisions are grounded in evidence and data-driven insights.

factly is a dedicated tool designed to accelerate the execution of the FIR approach, replacing general-purpose tools like Excalidraw that lack the specialized features needed to streamline this process.

## How it works

factly organizes a discovery session as a pipeline of five entity types, each linked to the previous:

```
Inputs --> Facts --> Insights --> Recommendations --> Outputs
```

- **Input**: a source material (document, web page, image, video, audio, PDF, CSV).
- **Fact**: a verifiable statement extracted from one or more Inputs.
- **Insight**: an interpretation derived from one or more Facts.
- **Recommendation**: an actionable suggestion derived from one or more Insights.
- **Output**: a deliverable resulting from one or more Recommendations.

Relationships are explicit and traceable: any Output can be traced back to the Inputs that originated it.

## Architecture

```
apps/
  frontend/   React 18 SPA (TypeScript, CRA)      :3000
  backend/    Express API + SSE (TypeScript)       :3002
```

- **Frontend**: 5-column discovery grid with visual relationship lines, CRUD modals, hover highlighting, JSON import/export, and SSE-based collaborative sessions.
- **Backend**: REST API for room management, Keyv file-based storage, Server-Sent Events for real-time collaboration.

See `GLOBAL_TECHNICAL_ARCHITECTURE.md` for the full architecture description.

## Quick Start

```bash
git clone https://github.com/anasdox/factly.git
cd factly
make install
make start
```

Open http://localhost:3000 to start a discovery session.

### AI-Assisted Extraction (optional)

To enable AI-powered fact/insight/recommendation extraction, create `apps/backend/.env`:

```env
LLM_PROVIDER=anthropic   # or "openai"
LLM_API_KEY=your-api-key
LLM_MODEL=claude-sonnet-4-5-20250929  # optional, provider default used if omitted
```

### Prerequisites

- Node.js >= 18
- npm
- make

### Available Make Targets

| Command | Description |
|---------|-------------|
| `make install` | Install all dependencies (backend, frontend, tests) |
| `make start` | Start backend (background) and frontend |
| `make start-backend` | Start backend in the background |
| `make start-frontend` | Start frontend dev server |
| `make stop-backend` | Stop the background backend process |
| `make restart-backend` | Restart the backend |
| `make test` | Run acceptance tests |
| `make build` | Build backend and frontend for production |
| `make typecheck` | Run TypeScript type checks on both apps |
| `make lint` | Run spec-lint and traceability checks |
| `make logs-backend` | Tail the backend log file |
| `make clean` | Remove all `node_modules` and build artifacts |

## Project Structure

| Path | Purpose |
|------|---------|
| `apps/backend/` | Express API + SSE server |
| `apps/frontend/` | React SPA |
| `specs/functional/` | Gherkin functional specifications |
| `specs/technical/` | OpenAPI / AsyncAPI technical specifications |
| `tests/acceptance/` | Acceptance tests |
| `PROBLEM_STATEMENT.md` | Problem definition |
| `UBIQUITOUS_LANGUAGE.md` | Shared domain vocabulary |
| `GLOBAL_TECHNICAL_ARCHITECTURE.md` | Architecture boundaries |
| `ROADMAP.md` | Delivered features, known issues, future milestones |
| `AGENTS.md` | Operating rules for humans and AI agents |

## Contributing

Contributions are welcome. Fork the repository, create a branch, make your changes, and submit a pull request.

## License

factly is open source software [licensed as MIT](./LICENSE).
