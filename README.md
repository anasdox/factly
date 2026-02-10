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

## Deployment with Docker Compose

Docker Compose lets you deploy factly with a single command. The frontend is served by nginx (port 80) which also acts as a reverse-proxy to the backend. The backend runs on Express with a SQLite database persisted in a Docker volume.

### Docker Architecture

```
                    ┌──────────────────────────────┐
                    │      docker-compose.yml       │
                    │                               │
   :80 ────────────►│  frontend (nginx)             │
                    │    - React static files        │
                    │    - reverse-proxy /status,    │
                    │      /rooms, /events,          │
                    │      /extract → backend        │
                    │                               │
                    │  backend (node)               │
                    │    - Express on :3002          │
                    │    - SQLite volume             │
                    └──────────────────────────────┘
```

### Prerequisites

- Docker >= 20.10
- Docker Compose >= 2.0

### Configuration

Before starting, make sure the file `apps/backend/.env` exists with the LLM configuration:

```env
LLM_PROVIDER=anthropic          # or "openai", "openai-compatible"
LLM_API_KEY=your-api-key
LLM_MODEL=claude-sonnet-4-5-20250929   # optional
LLM_BASE_URL=                   # required only for "openai-compatible"
```

### Quick Start

```bash
# Build and start both services
docker compose up --build

# Or run in the background
docker compose up --build -d
```

The application is available at **http://localhost**.

### Useful Commands

```bash
# View logs in real time
docker compose logs -f

# Logs for a single service
docker compose logs -f backend
docker compose logs -f frontend

# Stop services
docker compose down

# Stop and remove volumes (reset the database)
docker compose down -v

# Rebuild after a code change
docker compose up --build
```

### Environment Variables

| Variable | Service | Default | Description |
|----------|---------|---------|-------------|
| `PORT` | backend | `3002` | Express listen port |
| `LLM_PROVIDER` | backend (.env) | — | LLM provider (`anthropic`, `openai`, `openai-compatible`) |
| `LLM_API_KEY` | backend (.env) | — | LLM provider API key |
| `LLM_BASE_URL` | backend (.env) | — | Base URL for `openai-compatible` |
| `LLM_MODEL` | backend (.env) | — | Model name |
| `REACT_APP_API_URL` | frontend (build) | `http://localhost:3002` | API URL baked into the JS bundle |
| `BACKEND_URL` | frontend (runtime) | `http://backend:3002` | nginx reverse-proxy target |

### Customization

**Change the exposed port:**

```bash
# Expose on port 8080 instead of 80
docker compose up --build -p 8080:80
```

Or edit `docker-compose.yml`:

```yaml
frontend:
  ports:
    - "8080:80"
```

**Point nginx to an external backend:**

```bash
BACKEND_URL=http://my-server:9000 docker compose up frontend
```

### Data Persistence

The SQLite database is stored in the Docker volume `backend-data`, mounted at `/app/data` inside the backend container. Data persists across restarts. To reset:

```bash
docker compose down -v
```

### Local Dev vs Docker

| | Local dev (`make start`) | Docker (`docker compose up`) |
|---|---|---|
| Frontend | CRA dev server on `:3000` | nginx on `:80` |
| Backend | `ts-node` on `:3002` | `node dist/index.js` on `:3002` |
| API URL | `http://localhost:3002` (hardcoded) | Same origin via nginx reverse-proxy |
| Database | `apps/backend/data/factly.db` | Docker volume `backend-data` |
| Hot reload | Yes | No (rebuild required) |

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
