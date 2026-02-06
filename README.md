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

## Getting Started

### Prerequisites

- Node.js >= 18
- npm

### Installation

```bash
git clone https://github.com/anasdox/factly.git
cd factly
cd apps/backend && npm install
cd ../frontend && npm install
```

### Running

Start the backend and frontend in separate terminals:

```bash
# Terminal 1 - Backend
cd apps/backend
npm start
```

```bash
# Terminal 2 - Frontend
cd apps/frontend
npm start
```

The frontend opens on `http://localhost:3000`. The backend API listens on `http://localhost:3002`.

### Running Tests

```bash
cd tests/acceptance
npm install
npm test
```

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
