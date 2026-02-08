import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { Server, ServerResponse } from 'http';
import { Socket } from 'net';
import { v4 as uuid } from 'uuid';
import Keyv from 'keyv';
import KeyvSqlite from '@keyv/sqlite';
import { generateUsername } from 'friendly-username-generator';
import winston from 'winston';
import * as fs from 'fs';
import * as path from 'path';
import { createProvider, LLMProvider } from './llm/provider';

const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'factly.db');

const store = new Keyv({
  store: new KeyvSqlite('sqlite://' + dbPath)
});

store.on('error', (err) => console.error('Keyv connection error:', err));

// Set up Winston logger
const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

logger.info(`Using SQLite store at ${dbPath}`);

const llmProvider: LLMProvider | null = createProvider();
if (llmProvider) {
  logger.info(`LLM provider configured: ${process.env.LLM_PROVIDER}`);
} else {
  logger.warn('LLM provider not configured. Extraction endpoint will return 503.');
}


const app = express();
const port = 3002;

// Add middleware
app.use(bodyParser.json());
app.use(cors());

// Define API endpoints
app.post('/rooms', async (req, res, next) => {
  try {
    const validation = validateDiscoveryData(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    const roomId = await createRoom(req.body);
    logger.info(`Created room with ID: ${roomId}`);
    res.send({ roomId });
  } catch (err) {
    next(err);
  }
});

app.get('/rooms/:id', async (req, res, next) => {
  try {
    if (!isRoomValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid room ID format. Must be UUID v4.' });
    }
    logger.debug(`Fetched room data for ID: ${req.params.id}`);
    const room = await getRoom(req.params.id);
    res.send(room);
  } catch (err) {
    next(err);
  }
});

app.delete('/rooms/:id', async (req, res, next) => {
  try {
    if (!isRoomValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid room ID format. Must be UUID v4.' });
    }
    await stopRoom(req.params.id);
    logger.info(`Stopped room with ID: ${req.params.id}`);
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

function handleLLMError(err: any, res: express.Response) {
  logger.error(`LLM extraction error: ${err.message}`);
  if (err.message?.includes('timeout') || err.code === 'ETIMEDOUT') {
    return res.status(502).json({ error: 'Extraction timed out' });
  }
  if (err instanceof SyntaxError) {
    return res.status(502).json({ error: 'Extraction returned invalid response' });
  }
  return res.status(502).json({ error: 'Extraction service unavailable' });
}

app.post('/extract/facts', async (req, res, next) => {
  try {
    const validation = validateExtractionRequest(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    if (!llmProvider) {
      return res.status(503).json({ error: 'Extraction service not configured' });
    }

    const { input_text, goal, input_id } = req.body;
    logger.info(`Extracting facts for input ${input_id}`);

    let facts: string[];
    try {
      facts = await llmProvider.extractFacts(input_text, goal);
    } catch (err: any) {
      return handleLLMError(err, res);
    }

    const suggestions = facts.map((text) => ({ text }));
    res.json({ suggestions, input_id });
  } catch (err) {
    next(err);
  }
});

app.post('/extract/insights', async (req, res, next) => {
  try {
    const validation = validateInsightsExtractionRequest(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    if (!llmProvider) {
      return res.status(503).json({ error: 'Extraction service not configured' });
    }

    const { facts, goal } = req.body;
    const factTexts = facts.map((f: any) => f.text);
    const factIds = facts.map((f: any) => f.fact_id);
    logger.info(`Extracting insights from ${facts.length} facts`);

    let insights: string[];
    try {
      insights = await llmProvider.extractInsights(factTexts, goal);
    } catch (err: any) {
      return handleLLMError(err, res);
    }

    const suggestions = insights.map((text) => ({ text }));
    res.json({ suggestions, fact_ids: factIds });
  } catch (err) {
    next(err);
  }
});

app.post('/extract/recommendations', async (req, res, next) => {
  try {
    const validation = validateRecommendationsExtractionRequest(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    if (!llmProvider) {
      return res.status(503).json({ error: 'Extraction service not configured' });
    }

    const { insights, goal } = req.body;
    const insightTexts = insights.map((i: any) => i.text);
    const insightIds = insights.map((i: any) => i.insight_id);
    logger.info(`Extracting recommendations from ${insights.length} insights`);

    let recommendations: string[];
    try {
      recommendations = await llmProvider.extractRecommendations(insightTexts, goal);
    } catch (err: any) {
      return handleLLMError(err, res);
    }

    const suggestions = recommendations.map((text) => ({ text }));
    res.json({ suggestions, insight_ids: insightIds });
  } catch (err) {
    next(err);
  }
});

app.get('/status', (req, res) => {
  const status = Array.from(subscribers.entries()).reduce((prev: any, [roomId, sockets]) => {
    prev[roomId] = sockets.size;
    return prev;
  }, {});
  logger.debug(`Requested server status: ${JSON.stringify(status)}`);
  res.send(status);
});

app.post('/rooms/:id/update', async (req, res, next) => {
  try {
    const roomId = req.params.id;
    if (!isRoomValid(roomId)) {
      return res.status(400).json({ error: 'Invalid room ID format. Must be UUID v4.' });
    }
    const validation = validateUpdateBody(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    const data = req.body;
    const senderUuid = data.senderUuid;
    const username = data.username;
    const payload = data.payload;

    logger.debug(`Received update for room ${roomId}: ${JSON.stringify({ senderUuid, username, payload })}`);

    await saveRoom(roomId, payload);
    if (senderUuid && subscribers.has(roomId)) {
      logger.info(`Broadcasting update for room ${roomId} from user ${senderUuid}`);
      broadcastUpdate(roomId, payload, senderUuid, username);
    }
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

// Define Server-Sent Events server
interface UserSocket extends Socket {
  uuid?: string;
  username?: string;
  roomId?: string;
}

const subscribers: Map<string, Set<UserSocket>> = new Map();
const users: Map<string, Set<string>> = new Map();

app.get('/events/:roomId', async (req, res) => {
  const roomId = req.params.roomId;
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  if (!roomId || !isRoomValid(roomId)) {
    logger.error(`Invalid or missing room ID for SSE: ${roomId}`);
    return res.destroy();
  }
  const uuidParam = req.query.uuid;
  const usernameParam = req.query.username;

  const socket = res as any;
  socket.uuid = uuidParam ?? uuid();
  socket.username = usernameParam ?? generateUsername();
  socket.roomId = roomId;

  if (!subscribers.has(roomId)) {
    subscribers.set(roomId, new Set());
  }
  subscribers.get(roomId)!.add(socket);

  if (!users.has(roomId)) {
    users.set(roomId, new Set());
  }
  users.get(roomId)!.add(socket.username!);

  res.write(`data: {"type": "credentials", "uuid": "${socket.uuid}", "username": "${socket.username}"}\n\n`);

  req.on('close', () => {
    logger.debug(`Client with uuid: ${socket.uuid} and username: ${socket.username} disconnected`);
    if (socket.username && socket.roomId) {
      subscribers.get(socket.roomId)?.delete(socket);
      users.get(socket.roomId)?.delete(socket.username);
    }
  });
}); 


// Implement CRUD operations for data storage
async function createRoom(data: any): Promise<string> {
  // Create a new room with the provided data and store it in the database
  const roomId = uuid();
  logger.debug(`Creating room with ID: ${roomId}`);
  if (!data) throw new Error('No data provided');
  await saveRoom(roomId, data);
  logger.debug(`Created room with ID: ${roomId}`);
  return roomId;
}

async function getRoom(id: string): Promise<any> {
  // Retrieve the current state of a room by ID from the database
  const room = await loadRoom(id);
  logger.debug(`Fetched room data for ID: ${id}`);
  return room;
}

async function saveRoom(id: string, data: any) {
  await store.set(id, data);
  logger.debug(`Saved room data for ID: ${id}`);
}

async function loadRoom(id: string) {
  logger.debug(`Loaded room data for ID: ${id}`);
  return await store.get(id);
}

async function stopRoom(id: string) {
  subscribers.delete(id);
  users.delete(id);
  await store.delete(id);
  logger.debug(`Stopped room with ID: ${id}`);
}


function broadcastUpdate(roomId: string, payload: any, senderUuid: string, username?: string) {
  const sockets = subscribers.get(roomId);
  if (sockets) {
    logger.debug(`Broadcasting update to ${sockets.size} clients in room: ${roomId}`);
    for (const socket of sockets) {
      // Send update to all clients except the one who sent the update
      if (socket.uuid !== senderUuid || !username || socket.username !== username) {
        logger.debug(`Sending update to client with uuid: ${socket.uuid} and username: ${socket.username}`);
        socket.write(`data: ${JSON.stringify({ type: 'update', payload })}\n\n`);
      }
    }
  }
}

const isRoomValid = (roomId: string): boolean => {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(roomId);
};

function validateDiscoveryData(body: any): { valid: boolean; error?: string } {
  if (!body || typeof body !== 'object' || Object.keys(body).length === 0) {
    return { valid: false, error: 'Body is required' };
  }
  const stringFields = ['discovery_id', 'title', 'goal', 'date'];
  for (const field of stringFields) {
    if (typeof body[field] !== 'string') {
      return { valid: false, error: `Field "${field}" is required and must be a string` };
    }
  }
  const arrayFields = ['inputs', 'facts', 'insights', 'recommendations', 'outputs'];
  for (const field of arrayFields) {
    if (!Array.isArray(body[field])) {
      return { valid: false, error: `Field "${field}" is required and must be an array` };
    }
  }
  return { valid: true };
}

function validateUpdateBody(body: any): { valid: boolean; error?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Body is required' };
  }
  if (!body.payload || typeof body.payload !== 'object' || Array.isArray(body.payload)) {
    return { valid: false, error: 'Field "payload" is required and must be an object' };
  }
  if (typeof body.senderUuid !== 'string') {
    return { valid: false, error: 'Field "senderUuid" is required and must be a string' };
  }
  if (typeof body.username !== 'string') {
    return { valid: false, error: 'Field "username" is required and must be a string' };
  }
  return { valid: true };
}

function validateExtractionRequest(body: any): { valid: boolean; error?: string } {
  if (!body || typeof body !== 'object' || Object.keys(body).length === 0) {
    return { valid: false, error: 'Body is required' };
  }
  if (typeof body.input_text !== 'string' || body.input_text.length === 0) {
    return { valid: false, error: 'Field "input_text" is required and must be a non-empty string' };
  }
  if (typeof body.goal !== 'string' || body.goal.length === 0) {
    return { valid: false, error: 'Field "goal" is required and must be a non-empty string' };
  }
  if (typeof body.input_id !== 'string' || body.input_id.length === 0) {
    return { valid: false, error: 'Field "input_id" is required and must be a non-empty string' };
  }
  return { valid: true };
}

function validateInsightsExtractionRequest(body: any): { valid: boolean; error?: string } {
  if (!body || typeof body !== 'object' || Object.keys(body).length === 0) {
    return { valid: false, error: 'Body is required' };
  }
  if (!Array.isArray(body.facts) || body.facts.length === 0) {
    return { valid: false, error: 'Field "facts" is required and must be a non-empty array' };
  }
  for (const fact of body.facts) {
    if (typeof fact.fact_id !== 'string' || fact.fact_id.length === 0) {
      return { valid: false, error: 'Each fact must have a non-empty "fact_id" string' };
    }
    if (typeof fact.text !== 'string' || fact.text.length === 0) {
      return { valid: false, error: 'Each fact must have a non-empty "text" string' };
    }
  }
  if (typeof body.goal !== 'string' || body.goal.length === 0) {
    return { valid: false, error: 'Field "goal" is required and must be a non-empty string' };
  }
  return { valid: true };
}

function validateRecommendationsExtractionRequest(body: any): { valid: boolean; error?: string } {
  if (!body || typeof body !== 'object' || Object.keys(body).length === 0) {
    return { valid: false, error: 'Body is required' };
  }
  if (!Array.isArray(body.insights) || body.insights.length === 0) {
    return { valid: false, error: 'Field "insights" is required and must be a non-empty array' };
  }
  for (const insight of body.insights) {
    if (typeof insight.insight_id !== 'string' || insight.insight_id.length === 0) {
      return { valid: false, error: 'Each insight must have a non-empty "insight_id" string' };
    }
    if (typeof insight.text !== 'string' || insight.text.length === 0) {
      return { valid: false, error: 'Each insight must have a non-empty "text" string' };
    }
  }
  if (typeof body.goal !== 'string' || body.goal.length === 0) {
    return { valid: false, error: 'Field "goal" is required and must be a non-empty string' };
  }
  return { valid: true };
}

// Global error middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(`Unhandled error: ${err.message}`);
  res.status(500).json({ error: 'Internal server error' });
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
