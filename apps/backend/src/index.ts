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
import { createProvider, LLMProvider, OutputTraceabilityContext } from './llm/provider';
import { VALID_OUTPUT_TYPES, ExtractedFact } from './llm/prompts';

const VALID_UPDATE_ENTITY_TYPES = ['fact', 'insight', 'recommendation', 'output'];
import { extractTextFromUrl, WebScraperError } from './web-scraper';

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
const port = parseInt(process.env.PORT || '3002', 10);

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

    const { input_text, input_url, goal, input_id } = req.body;
    logger.info(`Extracting facts for input ${input_id}`);

    let text: string;
    if (input_text) {
      text = input_text;
    } else {
      try {
        text = await extractTextFromUrl(input_url);
      } catch (err: any) {
        if (err instanceof WebScraperError) {
          return res.status(err.statusCode).json({ error: err.message });
        }
        return res.status(502).json({ error: 'Failed to fetch URL' });
      }
    }

    let facts: ExtractedFact[];
    try {
      facts = await llmProvider.extractFacts(text, goal);
    } catch (err: any) {
      return handleLLMError(err, res);
    }

    const suggestions = facts.map((f) => ({ text: f.text, source_excerpt: f.source_excerpt }));
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
    const factIds: string[] = facts.map((f: any) => f.fact_id);
    logger.info(`Extracting insights from ${facts.length} facts`);

    let insights: import('./llm/prompts').ExtractedInsight[];
    try {
      insights = await llmProvider.extractInsights(factTexts, goal);
    } catch (err: any) {
      return handleLLMError(err, res);
    }

    if (insights.length === 0) {
      logger.warn(`LLM returned 0 insights for ${facts.length} facts (goal: "${goal}")`);
    }

    const suggestions = insights.map((insight) => ({
      text: insight.text,
      related_fact_ids: insight.source_facts
        .filter((n) => n >= 1 && n <= factIds.length)
        .map((n) => factIds[n - 1]),
    }));
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
    const insightIds: string[] = insights.map((i: any) => i.insight_id);
    logger.info(`Extracting recommendations from ${insights.length} insights`);

    let recommendations: import('./llm/prompts').ExtractedRecommendation[];
    try {
      recommendations = await llmProvider.extractRecommendations(insightTexts, goal);
    } catch (err: any) {
      return handleLLMError(err, res);
    }

    const suggestions = recommendations.map((rec) => ({
      text: rec.text,
      related_insight_ids: rec.source_insights
        .filter((n) => n >= 1 && n <= insightIds.length)
        .map((n) => insightIds[n - 1]),
    }));
    res.json({ suggestions, insight_ids: insightIds });
  } catch (err) {
    next(err);
  }
});

app.post('/extract/outputs', async (req, res, next) => {
  try {
    const validation = validateOutputsFormulationRequest(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    if (!llmProvider) {
      return res.status(503).json({ error: 'Extraction service not configured' });
    }

    const { recommendations, goal, output_type, facts, insights, inputs } = req.body;
    const recTexts = recommendations.map((r: any) => r.text);
    const recIds = recommendations.map((r: any) => r.recommendation_id);
    logger.info(`Formulating ${output_type} outputs from ${recommendations.length} recommendations`);

    const traceabilityContext: OutputTraceabilityContext = {};
    if (Array.isArray(facts) && facts.length > 0) {
      traceabilityContext.facts = facts;
    }
    if (Array.isArray(insights) && insights.length > 0) {
      traceabilityContext.insights = insights;
    }
    if (Array.isArray(inputs) && inputs.length > 0) {
      traceabilityContext.inputs = inputs;
    }

    let outputs: string[];
    try {
      outputs = await llmProvider.formulateOutputs(recTexts, goal, output_type, traceabilityContext);
    } catch (err: any) {
      return handleLLMError(err, res);
    }

    const suggestions = outputs.map((text) => ({ text }));
    res.json({ suggestions, recommendation_ids: recIds });
  } catch (err) {
    next(err);
  }
});

// ── Deduplication endpoints ──

app.post('/dedup/check', async (req, res, next) => {
  try {
    const validation = validateDedupCheckRequest(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    if (!llmProvider) {
      return res.status(503).json({ error: 'Extraction service not configured' });
    }

    const { text, candidates } = req.body;
    logger.info(`Checking duplicates for text against ${candidates.length} candidates`);

    let duplicates;
    try {
      duplicates = await llmProvider.checkDuplicates(text, candidates);
    } catch (err: any) {
      return handleLLMError(err, res);
    }

    res.json({ duplicates });
  } catch (err) {
    next(err);
  }
});

app.post('/dedup/scan', async (req, res, next) => {
  try {
    const validation = validateDedupScanRequest(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    if (!llmProvider) {
      return res.status(503).json({ error: 'Extraction service not configured' });
    }

    const { items } = req.body;
    logger.info(`Scanning ${items.length} items for duplicate groups`);

    let groups;
    try {
      groups = await llmProvider.scanDuplicates(items);
    } catch (err: any) {
      return handleLLMError(err, res);
    }

    res.json({ groups });
  } catch (err) {
    next(err);
  }
});

// ── Impact check endpoint ──

app.post('/check/impact', async (req, res, next) => {
  try {
    const validation = validateImpactCheckRequest(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    if (!llmProvider) {
      return res.status(503).json({ error: 'Extraction service not configured' });
    }

    const { old_text, new_text, children } = req.body;
    logger.info(`Checking impact on ${children.length} children`);

    let impacted;
    try {
      impacted = await llmProvider.checkImpact(old_text, new_text, children);
    } catch (err: any) {
      return handleLLMError(err, res);
    }

    res.json({ impacted });
  } catch (err) {
    next(err);
  }
});

// ── Update proposal endpoint ──

app.post('/propose/update', async (req, res, next) => {
  try {
    const validation = validateProposeUpdateRequest(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    if (!llmProvider) {
      return res.status(503).json({ error: 'Extraction service not configured' });
    }

    const { entity_type, current_text, upstream_change, goal, output_type } = req.body;
    logger.info(`Proposing update for ${entity_type}`);

    let proposal;
    try {
      proposal = await llmProvider.proposeUpdate(
        entity_type,
        current_text,
        upstream_change.old_text,
        upstream_change.new_text,
        upstream_change.entity_type,
        goal,
        output_type,
      );
    } catch (err: any) {
      return handleLLMError(err, res);
    }

    res.json(proposal);
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

  // Disable timeouts and buffering for SSE
  req.setTimeout(0);
  if (res.socket) {
    res.socket.setNoDelay(true);
    res.socket.setTimeout(0);
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*'
  });
  res.flushHeaders();

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

  // Send current room data so the new subscriber is immediately in sync
  const roomData = await loadRoom(roomId);
  if (roomData) {
    res.write(`data: ${JSON.stringify({ type: 'init', payload: roomData })}\n\n`);
  }

  // Heartbeat to keep the connection alive
  const heartbeat = setInterval(() => {
    res.write(`:heartbeat\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
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
    logger.info(`Broadcasting update to ${sockets.size} clients in room: ${roomId} (sender: ${senderUuid})`);
    const message = `data: ${JSON.stringify({ type: 'update', payload })}\n\n`;
    for (const socket of sockets) {
      // Send update to all clients except the one who sent the update
      if (socket.uuid !== senderUuid || !username || socket.username !== username) {
        logger.info(`Sending update to client uuid=${socket.uuid} username=${socket.username}`);
        const ok = socket.write(message);
        if (!ok) {
          logger.warn(`Write buffer full for client uuid=${socket.uuid}`);
        }
      } else {
        logger.debug(`Skipping sender socket uuid=${socket.uuid} username=${socket.username}`);
      }
    }
  } else {
    logger.warn(`No subscribers found for room ${roomId}`);
  }
}

const isRoomValid = (roomId: string): boolean => {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(roomId);
};

// ── Validation helpers ──

type ValidationResult = { valid: boolean; error?: string };

const VALID_RESULT: ValidationResult = { valid: true };

function requireBody(body: any): ValidationResult | null {
  if (!body || typeof body !== 'object' || Object.keys(body).length === 0) {
    return { valid: false, error: 'Body is required' };
  }
  return null;
}

function requireNonEmptyString(body: any, field: string): ValidationResult | null {
  if (typeof body[field] !== 'string' || body[field].length === 0) {
    return { valid: false, error: `Field "${field}" is required and must be a non-empty string` };
  }
  return null;
}

function requireNonEmptyArray(body: any, field: string, minLength = 1): ValidationResult | null {
  if (!Array.isArray(body[field]) || body[field].length < minLength) {
    const suffix = minLength > 1 ? ` with at least ${minLength} elements` : '';
    return { valid: false, error: `Field "${field}" is required and must be a non-empty array${suffix}` };
  }
  return null;
}

function validateArrayItems(items: any[], idField: string, label: string): ValidationResult | null {
  for (const item of items) {
    if (typeof item[idField] !== 'string' || item[idField].length === 0) {
      return { valid: false, error: `Each ${label} must have a non-empty "${idField}" string` };
    }
    if (typeof item.text !== 'string' || item.text.length === 0) {
      return { valid: false, error: `Each ${label} must have a non-empty "text" string` };
    }
  }
  return null;
}

// ── Request validators ──

function validateDiscoveryData(body: any): ValidationResult {
  const bodyErr = requireBody(body);
  if (bodyErr) return bodyErr;
  for (const field of ['discovery_id', 'title', 'goal', 'date']) {
    if (typeof body[field] !== 'string') {
      return { valid: false, error: `Field "${field}" is required and must be a string` };
    }
  }
  for (const field of ['inputs', 'facts', 'insights', 'recommendations', 'outputs']) {
    if (!Array.isArray(body[field])) {
      return { valid: false, error: `Field "${field}" is required and must be an array` };
    }
  }
  return VALID_RESULT;
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

function validateExtractionRequest(body: any): ValidationResult {
  const bodyErr = requireBody(body);
  if (bodyErr) return bodyErr;
  const hasText = typeof body.input_text === 'string' && body.input_text.length > 0;
  const hasUrl = typeof body.input_url === 'string' && body.input_url.length > 0;
  if (!hasText && !hasUrl) {
    return { valid: false, error: 'Either "input_text" or "input_url" must be a non-empty string' };
  }
  return requireNonEmptyString(body, 'goal') || requireNonEmptyString(body, 'input_id') || VALID_RESULT;
}

function validateInsightsExtractionRequest(body: any): ValidationResult {
  const bodyErr = requireBody(body);
  if (bodyErr) return bodyErr;
  const arrErr = requireNonEmptyArray(body, 'facts');
  if (arrErr) return arrErr;
  const itemErr = validateArrayItems(body.facts, 'fact_id', 'fact');
  if (itemErr) return itemErr;
  return requireNonEmptyString(body, 'goal') || VALID_RESULT;
}

function validateRecommendationsExtractionRequest(body: any): ValidationResult {
  const bodyErr = requireBody(body);
  if (bodyErr) return bodyErr;
  const arrErr = requireNonEmptyArray(body, 'insights');
  if (arrErr) return arrErr;
  const itemErr = validateArrayItems(body.insights, 'insight_id', 'insight');
  if (itemErr) return itemErr;
  return requireNonEmptyString(body, 'goal') || VALID_RESULT;
}

function validateOutputsFormulationRequest(body: any): ValidationResult {
  const bodyErr = requireBody(body);
  if (bodyErr) return bodyErr;
  const arrErr = requireNonEmptyArray(body, 'recommendations');
  if (arrErr) return arrErr;
  const itemErr = validateArrayItems(body.recommendations, 'recommendation_id', 'recommendation');
  if (itemErr) return itemErr;
  const goalErr = requireNonEmptyString(body, 'goal');
  if (goalErr) return goalErr;
  if (typeof body.output_type !== 'string' || !VALID_OUTPUT_TYPES.includes(body.output_type)) {
    return { valid: false, error: `Field "output_type" must be one of: ${VALID_OUTPUT_TYPES.join(', ')}` };
  }
  return VALID_RESULT;
}

function validateDedupCheckRequest(body: any): ValidationResult {
  const bodyErr = requireBody(body);
  if (bodyErr) return bodyErr;
  const textErr = requireNonEmptyString(body, 'text');
  if (textErr) return textErr;
  const arrErr = requireNonEmptyArray(body, 'candidates');
  if (arrErr) return arrErr;
  const itemErr = validateArrayItems(body.candidates, 'id', 'candidate');
  if (itemErr) return itemErr;
  return VALID_RESULT;
}

function validateDedupScanRequest(body: any): ValidationResult {
  const bodyErr = requireBody(body);
  if (bodyErr) return bodyErr;
  const arrErr = requireNonEmptyArray(body, 'items', 2);
  if (arrErr) return arrErr;
  const itemErr = validateArrayItems(body.items, 'id', 'item');
  if (itemErr) return itemErr;
  return VALID_RESULT;
}

function validateImpactCheckRequest(body: any): ValidationResult {
  const bodyErr = requireBody(body);
  if (bodyErr) return bodyErr;
  const oldErr = requireNonEmptyString(body, 'old_text');
  if (oldErr) return oldErr;
  const newErr = requireNonEmptyString(body, 'new_text');
  if (newErr) return newErr;
  const arrErr = requireNonEmptyArray(body, 'children');
  if (arrErr) return arrErr;
  const itemErr = validateArrayItems(body.children, 'id', 'child');
  if (itemErr) return itemErr;
  return VALID_RESULT;
}

function validateProposeUpdateRequest(body: any): ValidationResult {
  const bodyErr = requireBody(body);
  if (bodyErr) return bodyErr;
  if (typeof body.entity_type !== 'string' || !VALID_UPDATE_ENTITY_TYPES.includes(body.entity_type)) {
    return { valid: false, error: `Field "entity_type" must be one of: ${VALID_UPDATE_ENTITY_TYPES.join(', ')}` };
  }
  const textErr = requireNonEmptyString(body, 'current_text');
  if (textErr) return textErr;
  if (!body.upstream_change || typeof body.upstream_change !== 'object') {
    return { valid: false, error: 'Field "upstream_change" is required and must be an object' };
  }
  if (typeof body.upstream_change.old_text !== 'string') {
    return { valid: false, error: 'Field "upstream_change.old_text" is required and must be a string' };
  }
  if (typeof body.upstream_change.new_text !== 'string') {
    return { valid: false, error: 'Field "upstream_change.new_text" is required and must be a string' };
  }
  if (typeof body.upstream_change.entity_type !== 'string') {
    return { valid: false, error: 'Field "upstream_change.entity_type" is required and must be a string' };
  }
  const goalErr = requireNonEmptyString(body, 'goal');
  if (goalErr) return goalErr;
  if (body.entity_type === 'output' && typeof body.output_type === 'string' && !VALID_OUTPUT_TYPES.includes(body.output_type)) {
    return { valid: false, error: `Field "output_type" must be one of: ${VALID_OUTPUT_TYPES.join(', ')}` };
  }
  return VALID_RESULT;
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
