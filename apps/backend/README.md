 Factly Backend
=============

Factly is a web tool designed for extracting actionable insights from various types of inputs using the FIR approach (Facts => Insights => Recommendations). The backend of Factly is built with Node.js and Express.js, and it utilizes several libraries such as Keyv for data storage and Server-Sent Events for real-time updates.

Getting Started
---------------

To run the Factly backend, make sure you have Node.js installed on your system. Then, follow these steps:

1. Clone this repository to your local machine.
2. Run `npm install` in the project directory to install all dependencies.
3. Copy `.env.example` to `.env` and fill in your configuration (see [LLM Configuration](#llm-configuration) below).
4. Run `npm start` to start the server. The server will listen on port 3002 by default.

LLM Configuration
-----------------

Factly uses an LLM to extract facts, insights, and recommendations. Configure your provider in the `.env` file at the project root (`apps/backend/.env`).

### OpenAI

```env
LLM_PROVIDER=openai
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4o          # optional, defaults to gpt-4o
```

### Anthropic

```env
LLM_PROVIDER=anthropic
LLM_API_KEY=sk-ant-...
LLM_MODEL=claude-sonnet-4-5-20250929   # optional
```

### OpenAI-Compatible (OVHcloud, Ollama, LM Studio, Groq, Together AI, etc.)

Any service that exposes an OpenAI-compatible chat completions endpoint can be used with the `openai-compatible` provider.

```env
LLM_PROVIDER=openai-compatible
LLM_API_KEY=<your-token>
LLM_BASE_URL=https://oai.endpoints.kepler.ai.cloud.ovh.net/v1
LLM_MODEL=gpt-oss-120b    # optional, defaults to gpt-4o
```

| Variable | Required | Description |
|----------|----------|-------------|
| `LLM_PROVIDER` | yes | One of `openai`, `anthropic`, or `openai-compatible` |
| `LLM_API_KEY` | yes | API key / access token for the chosen provider |
| `LLM_BASE_URL` | only for `openai-compatible` | Base URL of the OpenAI-compatible API (e.g. `https://api.groq.com/openai/v1`) |
| `LLM_MODEL` | no | Model identifier to use (each provider has its own default) |

API Endpoints
-------------

- **POST /rooms** - Create a new room with the provided data and store it in the database. Returns the room ID.
- **GET /rooms/:id** - Retrieve the current state of a room by ID from the database.
- **DELETE /rooms/:id** - Stop a room, clear its contents from the database, and remove all subscribers.
- **GET /status** - Get real-time information about the number of connected clients in each active room.

Server-Sent Events Server
-------------------------

The Factly backend includes an implementation for Server-Sent Events (SSE), enabling real-time updates for users connected to a room. To use SSE, follow these steps:

1. Connect to the desired room by visiting `/events/:roomId` in your browser or using an HTTP client that supports Server-Sent Events (e.g., `curl --get "http://localhost:3002/events/<ROOM_ID>"`).
2. Provide a username as a query parameter, for example, `?username=JohnDoe`.
3. The server will establish a Server-Sent Events connection, allowing you to receive real-time updates from the room.

Data Storage
------------

Factly uses Keyv as its primary storage solution, with a Jetpack file system store for persisting data between server restarts. The CRUD operations (create, read, update, and delete) are implemented using Keyv's API.

Running Tests
-------------

To run tests for the Factly backend, execute `npm test` in the project directory.

Contributing
------------

Pull requests are welcome! For major changes, please open an issue first to discuss the proposed modifications.

License
-------

This project is licensed under the MIT License - see the [LICENSE.md](https://github.com/anasdox/factly-backend/blob/main/LICENSE) file for details.