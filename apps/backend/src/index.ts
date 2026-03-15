import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { Server, ServerResponse } from 'http';
import { Socket } from 'net';
import { v4 as uuid } from 'uuid';
import rateLimit from 'express-rate-limit';
import { generateUsername } from 'friendly-username-generator';
import winston from 'winston';
import { createProvider, LLMProvider, OutputTraceabilityContext } from './llm/provider';
import { createSearchProvider, SearchProvider } from './search/provider';
import { fetchAllPages } from './search/page-fetcher';
import { VALID_OUTPUT_TYPES, ExtractedFact } from './llm/prompts';
import { embeddingCheckDuplicates, embeddingScanDuplicates } from './llm/embeddings';
import { buildChatSystemPrompt, CHAT_TOOLS, DiscoveryContext, ReferencedItem } from './llm/chat-prompts';
import benchmarkRoutes from './benchmark-routes';
import bcrypt from 'bcrypt';
import { findUser } from './auth/user-store';
import { signToken } from './auth/jwt';
import { optionalAuth, requireAuth } from './auth/middleware';
import { store, dbPath } from './store';

const VALID_UPDATE_ENTITY_TYPES = ['fact', 'insight', 'recommendation', 'output'];
import { extractTextFromUrl, WebScraperError } from './web-scraper';

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

const searchProvider: SearchProvider | null = createSearchProvider();
if (searchProvider) {
  logger.info(`Search provider configured: ${process.env.SEARCH_PROVIDER}`);
} else {
  logger.warn('Search provider not configured. Research endpoint will return 503.');
}

const embeddingsModel = process.env.LLM_EMBEDDINGS_MODEL;
const dedupThreshold = parseFloat(process.env.LLM_DEDUP_THRESHOLD || '0.75');
if (embeddingsModel) {
  logger.info(`Embedding-based dedup enabled: model=${embeddingsModel}, threshold=${dedupThreshold}`);
}


const app = express();
const port = parseInt(process.env.PORT || '3002', 10);

// Add middleware
app.use(bodyParser.json({ limit: '5mb' }));
app.use(cors());

// Rate limiting for LLM endpoints (expensive API calls)
const llmLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: parseInt(process.env.RATE_LIMIT_LLM || '20', 10),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests — please wait before retrying' },
});
app.use('/extract', llmLimiter);
app.use('/research', llmLimiter);
app.use('/chat', llmLimiter);
app.use('/reformulate', llmLimiter);
app.use('/propose', llmLimiter);
app.use('/dedup', llmLimiter);
app.use('/check', llmLimiter);

// General rate limiting
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: parseInt(process.env.RATE_LIMIT_GENERAL || '120', 10),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests' },
});
app.use(generalLimiter);

app.use('/benchmark', benchmarkRoutes);

// --- Authentication endpoints ---

app.post('/auth/login', async (req, res, next) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(503).json({ error: 'Authentication not configured (JWT_SECRET missing)' });
    }
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Fields "username" and "password" are required' });
    }
    const user = await findUser(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = signToken(username);
    res.json({ token });
  } catch (err) {
    next(err);
  }
});

app.get('/me/discoveries', requireAuth, async (req, res, next) => {
  try {
    const username = req.user!.username;
    const rows = await getAllStoreRows();
    const discoveries: any[] = [];

    for (const row of rows) {
      try {
        const parsed = JSON.parse(row.value);
        const data = parsed.value; // Keyv wraps in { value, expires }
        if (!data || !data.title) continue;

        const documentKey = row.key.replace('keyv:', '');
        // Skip metadata entries
        if (documentKey.startsWith('meta:')) continue;

        const meta = await store.get(`meta:${documentKey}`);
        const owner = meta?.owner || null;
        const visitedBy: string[] = meta?.visited_by || [];

        let role: string | null = null;
        if (owner === username) role = 'owned';
        else if (visitedBy.includes(username)) role = 'visited';

        if (role) {
          discoveries.push({
            document_id: documentKey,
            title: data.title || '',
            goal: data.goal || '',
            date: data.date || '',
            role,
          });
        }
      } catch {
        // Skip malformed entries
      }
    }

    res.json({ discoveries });
  } catch (err) {
    next(err);
  }
});

// Define API endpoints
app.post('/documents', optionalAuth, async (req, res, next) => {
  try {
    const validation = validateDiscoveryData(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    const documentId = await createDocument(req.body);
    // Store ownership metadata
    const owner = req.user?.username || null;
    await store.set(`meta:${documentId}`, { owner, visited_by: [] });
    logger.info(`Created document with ID: ${documentId}, owner: ${owner || 'anonymous'}`);
    res.send({ documentId });
  } catch (err) {
    next(err);
  }
});

app.get('/documents/:id', optionalAuth, async (req, res, next) => {
  try {
    if (!isDocumentIdValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid document ID format. Must be UUID v4.' });
    }
    const documentId = req.params.id;
    const doc = await getDocument(documentId);

    // Track visit for authenticated non-owners
    if (req.user?.username) {
      const meta = await store.get(`meta:${documentId}`) || { owner: null, visited_by: [] };
      if (meta.owner !== req.user.username && !meta.visited_by.includes(req.user.username)) {
        meta.visited_by.push(req.user.username);
        await store.set(`meta:${documentId}`, meta);
      }
    }

    logger.debug(`Fetched document data for ID: ${documentId}`);
    res.send(doc);
  } catch (err) {
    next(err);
  }
});

app.delete('/documents/:id', optionalAuth, async (req, res, next) => {
  try {
    if (!isDocumentIdValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid document ID format. Must be UUID v4.' });
    }
    const documentId = req.params.id;

    // Enforce deletion authorization when auth system is active
    if (process.env.JWT_SECRET) {
      if (!req.user) {
        return res.status(403).json({ error: 'Authentication required to delete a discovery' });
      }
      const meta = await store.get(`meta:${documentId}`);
      if (meta && meta.owner && meta.owner !== req.user.username) {
        return res.status(403).json({ error: 'Only the owner can delete this discovery' });
      }
    }

    await stopDocument(documentId);
    await store.delete(`meta:${documentId}`);
    logger.info(`Stopped document with ID: ${documentId}`);
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
  if (err.message?.includes('truncated')) {
    return res.status(502).json({ error: 'Response truncated — output too long. Try shortening the source content.' });
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

    const suggestions = facts.map((f) => ({ text: f.text, source_excerpt: f.source_excerpt, weight: f.weight }));
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
    const factTexts = facts.map((f: any) => f.weight != null ? `[weight: ${f.weight}/10] ${f.text}` : f.text);
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
      weight: insight.weight,
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
    const insightTexts = insights.map((i: any) => i.weight != null ? `[weight: ${i.weight}/10] ${i.text}` : i.text);
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
      weight: rec.weight,
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
      if (embeddingsModel && llmProvider.getEmbeddings) {
        logger.info('Using embedding-based dedup check');
        duplicates = await embeddingCheckDuplicates(llmProvider, text, candidates, dedupThreshold);
      } else {
        logger.info('Using LLM-chat dedup check');
        duplicates = await llmProvider.checkDuplicates(text, candidates);
      }
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
      if (embeddingsModel && llmProvider.getEmbeddings) {
        logger.info('Using embedding-based dedup scan');
        groups = await embeddingScanDuplicates(llmProvider, items, dedupThreshold);
      } else {
        logger.info('Using LLM-chat dedup scan');
        groups = await llmProvider.scanDuplicates(items);
      }
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
    logger.info(`[impact-check] old_text: "${old_text.substring(0, 100)}..." → new_text: "${new_text.substring(0, 100)}..."`);

    let impacted;
    try {
      impacted = await llmProvider.checkImpact(old_text, new_text, children);
    } catch (err: any) {
      logger.error(`[impact-check] LLM call failed:`, err);
      return handleLLMError(err, res);
    }

    const impactedCount = impacted.filter((r: any) => r.impacted).length;
    logger.info(`[impact-check] Result: ${impactedCount}/${impacted.length} children impacted`);
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

// ── Reformulation endpoint ──

const VALID_REFORMULATE_ENTITY_TYPES = ['fact', 'insight', 'recommendation'];

app.post('/reformulate', async (req, res, next) => {
  try {
    const validation = validateReformulateRequest(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    if (!llmProvider) {
      return res.status(503).json({ error: 'Reformulation service not configured' });
    }

    const { text, entity_type, goal, related_items } = req.body;
    logger.info(`Reformulating ${entity_type} with ${related_items.length} related items`);

    let suggestions;
    try {
      suggestions = await llmProvider.reformulate(text, entity_type, goal, related_items);
    } catch (err: any) {
      return handleLLMError(err, res);
    }

    res.json({ suggestions });
  } catch (err) {
    next(err);
  }
});

// ── Research endpoint ──

app.post('/research', async (req, res, next) => {
  try {
    const validation = validateResearchRequest(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    if (!searchProvider) {
      return res.status(503).json({ error: 'Search service not configured (missing SEARCH_PROVIDER or SEARCH_API_KEY)' });
    }

    if (!llmProvider) {
      return res.status(503).json({ error: 'LLM service not configured (missing LLM_PROVIDER or LLM_API_KEY)' });
    }

    const { goal } = req.body;
    logger.info(`[research] Starting research for goal: "${goal.substring(0, 100)}"`);

    // Step 1: Generate search queries from goal
    let queries: string[];
    try {
      queries = await llmProvider.generateSearchQueries(goal);
      if (queries.length === 0) {
        queries = [goal];
      }
    } catch (err: any) {
      logger.warn(`[research] Query generation failed, using goal as query: ${err.message}`);
      queries = [goal];
    }
    logger.info(`[research] Generated ${queries.length} search queries: ${JSON.stringify(queries)}`);

    // Step 2: Search the web
    const allUrls = new Set<string>();
    const searchResults: { title: string; url: string }[] = [];
    for (const query of queries) {
      try {
        const results = await searchProvider.search(query, 10);
        for (const result of results) {
          if (!allUrls.has(result.url)) {
            allUrls.add(result.url);
            searchResults.push({ title: result.title, url: result.url });
          }
        }
      } catch (err: any) {
        logger.error(`[research] Search failed for query "${query}": ${err.message}`);
      }
    }

    if (searchResults.length === 0) {
      return res.json({ suggestions: [], fetch_failures: 0 });
    }
    logger.info(`[research] Found ${searchResults.length} unique URLs`);

    // Step 3: Fetch page content
    const urls = searchResults.map(r => r.url);
    const { pages, failures } = await fetchAllPages(urls);
    logger.info(`[research] Fetched ${pages.length} pages, ${failures} failures`);

    if (pages.length === 0) {
      return res.json({ suggestions: [], fetch_failures: failures });
    }

    // Step 4: LLM filters and structures results
    let suggestions;
    try {
      suggestions = await llmProvider.research(goal, pages);
    } catch (err: any) {
      return handleLLMError(err, res);
    }

    logger.info(`[research] LLM returned ${suggestions.length} suggestions`);
    res.json({ suggestions, fetch_failures: failures });
  } catch (err) {
    next(err);
  }
});

app.get('/health', async (_req, res) => {
  try {
    const testKey = `health-check-${Date.now()}`;
    await store.set(testKey, 'ok');
    await store.delete(testKey);
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', error: 'Database unreachable' });
  }
});

app.get('/status', (req, res) => {
  const status: any = Array.from(subscribers.entries()).reduce((prev: any, [documentId, sockets]) => {
    prev[documentId] = sockets.size;
    return prev;
  }, {});
  status.searchAvailable = searchProvider !== null && llmProvider !== null;
  logger.debug(`Requested server status: ${JSON.stringify(status)}`);
  res.send(status);
});

app.post('/documents/:id/update', async (req, res, next) => {
  try {
    const documentId = req.params.id;
    if (!isDocumentIdValid(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID format. Must be UUID v4.' });
    }
    const validation = validateUpdateBody(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    const data = req.body;
    const senderUuid = data.senderUuid;
    const username = data.username;
    const payload = data.payload;

    logger.debug(`Received update for document ${documentId}: ${JSON.stringify({ senderUuid, username, payload })}`);

    await saveDocument(documentId, payload);
    if (senderUuid && subscribers.has(documentId)) {
      logger.info(`Broadcasting update for document ${documentId} from user ${senderUuid}`);
      broadcastUpdate(documentId, payload, senderUuid, username);
    }
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

// ── Chat endpoint (SSE streaming) ──

const chatContextThreshold = parseInt(process.env.CHAT_CONTEXT_THRESHOLD || '50', 10);

app.post('/chat/message', async (req, res, next) => {
  try {
    if (!llmProvider) {
      logger.warn('[chat] LLM provider not configured');
      return res.status(503).json({ error: 'Chat service not configured' });
    }

    const { message, chat_history, discovery_context, referenced_items } = req.body;
    logger.info('[chat] Incoming message', { message: message?.substring(0, 100), historyLength: chat_history?.length, hasContext: !!discovery_context });

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Field "message" is required and must be a non-empty string' });
    }

    if (!discovery_context || typeof discovery_context !== 'object') {
      return res.status(400).json({ error: 'Field "discovery_context" is required and must be an object' });
    }

    if (!discovery_context.goal || !discovery_context.title) {
      return res.status(400).json({ error: 'Fields "discovery_context.goal" and "discovery_context.title" are required' });
    }

    // Set up SSE response headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Build system prompt with discovery context
    const context: DiscoveryContext = {
      title: discovery_context.title,
      goal: discovery_context.goal,
      inputs: discovery_context.inputs || [],
      facts: discovery_context.facts || [],
      insights: discovery_context.insights || [],
      recommendations: discovery_context.recommendations || [],
      outputs: discovery_context.outputs || [],
    };

    const refs: ReferencedItem[] = Array.isArray(referenced_items) ? referenced_items : [];
    const systemPrompt = buildChatSystemPrompt(context, chatContextThreshold, refs);
    logger.debug('[chat] System prompt built', { length: systemPrompt.length, prompt: systemPrompt });

    // Build message history (limit to last N exchanges to keep context focused)
    const maxHistoryMessages = parseInt(process.env.CHAT_MAX_HISTORY || '10', 10);
    const messages: { role: 'user' | 'assistant'; content: string }[] = [];
    if (Array.isArray(chat_history)) {
      const validMessages = chat_history.filter((msg: any) => msg.role && msg.content);
      const trimmed = validMessages.slice(-maxHistoryMessages);
      trimmed.forEach((msg: any) => {
        messages.push({ role: msg.role, content: msg.content });
      });
    }
    messages.push({ role: 'user', content: message });
    logger.info('[chat] Sending to LLM', { messageCount: messages.length, toolCount: CHAT_TOOLS.length });

    const messageId = uuid();
    let tokenCount = 0;
    let toolCallCount = 0;

    // Stream LLM response
    await llmProvider.chatStream(systemPrompt, messages, CHAT_TOOLS, {
      onToken: (text: string) => {
        tokenCount++;
        res.write(`event: token\ndata: ${JSON.stringify({ text })}\n\n`);
      },
      onToolCall: (tool: string, params: Record<string, unknown>) => {
        toolCallCount++;
        logger.info('[chat] Tool call received', { tool, params });
        res.write(`event: tool_call\ndata: ${JSON.stringify({ tool, params })}\n\n`);
      },
      onDone: () => {
        logger.info('[chat] Stream done', { tokenCount, toolCallCount, messageId });
        res.write(`event: done\ndata: ${JSON.stringify({ message_id: messageId })}\n\n`);
        res.end();
      },
      onError: (error: string) => {
        logger.error('[chat] Stream error', { error, tokenCount, toolCallCount });
        res.write(`event: error\ndata: ${JSON.stringify({ error })}\n\n`);
        res.end();
      },
    });
  } catch (err: any) {
    logger.error('[chat] Endpoint error', { error: err?.message, stack: err?.stack });
    // If headers already sent (SSE started), emit error event
    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: err?.message || 'Internal server error' })}\n\n`);
      res.end();
    } else {
      next(err);
    }
  }
});

// Define Server-Sent Events server
interface UserSocket extends Socket {
  uuid?: string;
  username?: string;
  documentId?: string;
}

const subscribers: Map<string, Set<UserSocket>> = new Map();
const users: Map<string, Set<string>> = new Map();

app.get('/events/:documentId', async (req, res) => {
  const documentId = req.params.documentId;

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

  if (!documentId || !isDocumentIdValid(documentId)) {
    logger.error(`Invalid or missing document ID for SSE: ${documentId}`);
    return res.destroy();
  }
  const uuidParam = req.query.uuid;
  const usernameParam = req.query.username;

  const socket = res as any;
  socket.uuid = uuidParam ?? uuid();
  socket.username = usernameParam ?? generateUsername();
  socket.documentId = documentId;

  if (!subscribers.has(documentId)) {
    subscribers.set(documentId, new Set());
  }
  subscribers.get(documentId)!.add(socket);

  if (!users.has(documentId)) {
    users.set(documentId, new Set());
  }
  users.get(documentId)!.add(socket.username!);

  res.write(`data: {"type": "credentials", "uuid": "${socket.uuid}", "username": "${socket.username}"}\n\n`);

  // Send current document data so the new subscriber is immediately in sync
  const docData = await loadDocument(documentId);
  if (docData) {
    res.write(`data: ${JSON.stringify({ type: 'init', payload: docData })}\n\n`);
  }

  // Heartbeat to keep the connection alive
  const heartbeat = setInterval(() => {
    res.write(`:heartbeat\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    logger.debug(`Client with uuid: ${socket.uuid} and username: ${socket.username} disconnected`);
    if (socket.username && socket.documentId) {
      subscribers.get(socket.documentId)?.delete(socket);
      users.get(socket.documentId)?.delete(socket.username);
    }
  });
}); 


// Implement CRUD operations for data storage
async function createDocument(data: any): Promise<string> {
  // Create a new document with the provided data and store it in the database
  const documentId = uuid();
  logger.debug(`Creating document with ID: ${documentId}`);
  if (!data) throw new Error('No data provided');
  await saveDocument(documentId, data);
  logger.debug(`Created document with ID: ${documentId}`);
  return documentId;
}

async function getDocument(id: string): Promise<any> {
  // Retrieve the current state of a document by ID from the database
  const doc = await loadDocument(id);
  logger.debug(`Fetched document data for ID: ${id}`);
  return doc;
}

async function saveDocument(id: string, data: any) {
  await store.set(id, data);
  logger.debug(`Saved document data for ID: ${id}`);
}

async function loadDocument(id: string) {
  logger.debug(`Loaded document data for ID: ${id}`);
  return await store.get(id);
}

async function getAllStoreRows(): Promise<{ key: string; value: string }[]> {
  const sqliteStore = (store as any).opts.store;
  if (sqliteStore && typeof sqliteStore.query === 'function') {
    return sqliteStore.query('SELECT key, value FROM keyv');
  }
  return [];
}

async function stopDocument(id: string) {
  subscribers.delete(id);
  users.delete(id);
  await store.delete(id);
  logger.debug(`Stopped document with ID: ${id}`);
}


function broadcastUpdate(documentId: string, payload: any, senderUuid: string, username?: string) {
  const sockets = subscribers.get(documentId);
  if (sockets) {
    logger.info(`Broadcasting update to clients in document: ${documentId} (sender: ${senderUuid})`);
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
    logger.warn(`No subscribers found for document ${documentId}`);
  }
}

const isDocumentIdValid = (documentId: string): boolean => {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(documentId);
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
  for (const field of ['title', 'goal', 'date']) {
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
  // old_text may be empty for new entity impact checks
  if (typeof body.old_text !== 'string') {
    return { valid: false, error: 'Field "old_text" must be a string' };
  }
  const newErr = requireNonEmptyString(body, 'new_text');
  if (newErr) return newErr;
  const arrErr = requireNonEmptyArray(body, 'children');
  if (arrErr) return arrErr;
  const itemErr = validateArrayItems(body.children, 'id', 'child');
  if (itemErr) return itemErr;
  return VALID_RESULT;
}

function validateReformulateRequest(body: any): ValidationResult {
  const bodyErr = requireBody(body);
  if (bodyErr) return bodyErr;
  const textErr = requireNonEmptyString(body, 'text');
  if (textErr) return textErr;
  if (typeof body.entity_type !== 'string' || !VALID_REFORMULATE_ENTITY_TYPES.includes(body.entity_type)) {
    return { valid: false, error: `Field "entity_type" must be one of: ${VALID_REFORMULATE_ENTITY_TYPES.join(', ')}` };
  }
  const goalErr = requireNonEmptyString(body, 'goal');
  if (goalErr) return goalErr;
  if (!Array.isArray(body.related_items)) {
    return { valid: false, error: 'Field "related_items" is required and must be an array' };
  }
  return VALID_RESULT;
}

function validateResearchRequest(body: any): ValidationResult {
  const bodyErr = requireBody(body);
  if (bodyErr) return bodyErr;
  const goalErr = requireNonEmptyString(body, 'goal');
  if (goalErr) return goalErr;
  if (typeof body.goal === 'string' && body.goal.trim().length === 0) {
    return { valid: false, error: 'Field "goal" must not be empty or whitespace-only' };
  }
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
const server = app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

// Graceful shutdown
function shutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  // Stop accepting new connections
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Close all SSE connections
  for (const [, sockets] of subscribers) {
    for (const socket of sockets) {
      socket.end();
    }
  }
  subscribers.clear();
  users.clear();

  // Force exit after 10s if connections don't close
  setTimeout(() => {
    logger.warn('Forced shutdown after timeout');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
