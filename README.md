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

## Deploiement avec Docker Compose

Docker Compose permet de deployer factly en un seul commande. Le frontend est servi par nginx (port 80) qui fait aussi office de reverse-proxy vers le backend. Le backend tourne sur Express avec une base SQLite persistee dans un volume Docker.

### Architecture Docker

```
                    ┌──────────────────────────────┐
                    │      docker-compose.yml       │
                    │                               │
   :80 ────────────►│  frontend (nginx)             │
                    │    - fichiers statiques React  │
                    │    - reverse-proxy /status,    │
                    │      /rooms, /events,          │
                    │      /extract → backend        │
                    │                               │
                    │  backend (node)               │
                    │    - Express sur :3002         │
                    │    - volume SQLite             │
                    └──────────────────────────────┘
```

### Pre-requis

- Docker >= 20.10
- Docker Compose >= 2.0

### Configuration

Avant de lancer, assurez-vous que le fichier `apps/backend/.env` existe avec la configuration LLM :

```env
LLM_PROVIDER=anthropic          # ou "openai", "openai-compatible"
LLM_API_KEY=votre-cle-api
LLM_MODEL=claude-sonnet-4-5-20250929   # optionnel
LLM_BASE_URL=                   # requis uniquement pour "openai-compatible"
```

### Lancement rapide

```bash
# Construire et demarrer les deux services
docker compose up --build

# Ou en arriere-plan
docker compose up --build -d
```

L'application est accessible sur **http://localhost**.

### Commandes utiles

```bash
# Voir les logs en temps reel
docker compose logs -f

# Logs d'un seul service
docker compose logs -f backend
docker compose logs -f frontend

# Arreter les services
docker compose down

# Arreter et supprimer les volumes (reset de la base de donnees)
docker compose down -v

# Reconstruire apres une modification de code
docker compose up --build
```

### Variables d'environnement

| Variable | Service | Defaut | Description |
|----------|---------|--------|-------------|
| `PORT` | backend | `3002` | Port d'ecoute Express |
| `LLM_PROVIDER` | backend (.env) | — | Fournisseur LLM (`anthropic`, `openai`, `openai-compatible`) |
| `LLM_API_KEY` | backend (.env) | — | Cle API du fournisseur LLM |
| `LLM_BASE_URL` | backend (.env) | — | URL de base pour `openai-compatible` |
| `LLM_MODEL` | backend (.env) | — | Nom du modele |
| `REACT_APP_API_URL` | frontend (build) | `http://localhost:3002` | URL de l'API integree dans le bundle JS |
| `BACKEND_URL` | frontend (runtime) | `http://backend:3002` | Cible du reverse-proxy nginx |

### Personnalisation

**Changer le port expose :**

```bash
# Exposer sur le port 8080 au lieu de 80
docker compose up --build -p 8080:80
```

Ou modifier `docker-compose.yml` :

```yaml
frontend:
  ports:
    - "8080:80"
```

**Pointer nginx vers un backend externe :**

```bash
BACKEND_URL=http://mon-serveur:9000 docker compose up frontend
```

### Persistance des donnees

La base de donnees SQLite est stockee dans le volume Docker `backend-data`, monte sur `/app/data` dans le conteneur backend. Les donnees persistent entre les redemarrages. Pour reinitialiser :

```bash
docker compose down -v
```

### Differences entre dev local et Docker

| | Dev local (`make start`) | Docker (`docker compose up`) |
|---|---|---|
| Frontend | Dev server CRA sur `:3000` | nginx sur `:80` |
| Backend | `ts-node` sur `:3002` | `node dist/index.js` sur `:3002` |
| API URL | `http://localhost:3002` (hardcode) | Meme origine via reverse-proxy nginx |
| Base de donnees | `apps/backend/data/factly.db` | Volume Docker `backend-data` |
| Hot reload | Oui | Non (rebuild necessaire) |

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
