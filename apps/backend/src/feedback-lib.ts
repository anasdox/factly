import { Router, Request, Response } from 'express';

export interface FeedbackStore {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<any>;
  delete(key: string): Promise<boolean>;
}

export interface FeedbackConfig {
  store: FeedbackStore;
  /** Extract username from request. Return null for anonymous (votes rejected). */
  getUser?: (req: Request) => string | null;
  /** Max total ideas allowed. Default: 500 */
  maxIdeas?: number;
  /** Max ideas per user per day. Default: 5 */
  maxIdeasPerUserPerDay?: number;
}

interface Idea {
  id: string;
  title: string;
  description: string;
  author: string | null;
  votes: string[];
  created_at: string;
}

const INDEX_KEY = 'feedback:index';

async function getIndex(store: FeedbackStore): Promise<string[]> {
  return (await store.get(INDEX_KEY)) || [];
}

async function setIndex(store: FeedbackStore, ids: string[]): Promise<void> {
  await store.set(INDEX_KEY, ids);
}

function ideaKey(id: string): string {
  return `feedback:idea:${id}`;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function feedbackRoutes(config: FeedbackConfig): Router {
  const { store, getUser = () => null, maxIdeas = 500, maxIdeasPerUserPerDay = 5 } = config;
  const router = Router();

  // List all ideas, sorted by vote count (descending)
  router.get('/', async (_req: Request, res: Response) => {
    try {
      const ids = await getIndex(store);
      const ideas: Idea[] = [];
      for (const id of ids) {
        const idea = await store.get(ideaKey(id));
        if (idea) ideas.push(idea);
      }
      ideas.sort((a, b) => b.votes.length - a.votes.length || b.created_at.localeCompare(a.created_at));
      const result = ideas.map(({ votes, ...rest }) => ({
        ...rest,
        vote_count: votes.length,
      }));
      res.json({ ideas: result });
    } catch {
      res.status(500).json({ error: 'Failed to list ideas' });
    }
  });

  // Submit a new idea (authenticated only)
  router.post('/', async (req: Request, res: Response) => {
    try {
      const user = getUser(req);
      if (!user) {
        return res.status(401).json({ error: 'Authentication required to submit feedback' });
      }

      // Global limit
      const ids = await getIndex(store);
      if (ids.length >= maxIdeas) {
        return res.status(429).json({ error: 'Feedback board is full' });
      }

      // Per-user daily limit
      const today = new Date().toISOString().slice(0, 10);
      let todayCount = 0;
      for (const id of ids) {
        const existing = await store.get(ideaKey(id));
        if (existing && existing.author === user && existing.created_at?.startsWith(today)) {
          todayCount++;
        }
      }
      if (todayCount >= maxIdeasPerUserPerDay) {
        return res.status(429).json({ error: `Limit of ${maxIdeasPerUserPerDay} ideas per day reached` });
      }

      const { title, description } = req.body || {};
      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        return res.status(400).json({ error: 'Field "title" is required' });
      }
      if (title.trim().length > 100) {
        return res.status(400).json({ error: 'Title must be 100 characters or less' });
      }
      if (description && typeof description !== 'string') {
        return res.status(400).json({ error: 'Field "description" must be a string' });
      }
      if (description && description.length > 500) {
        return res.status(400).json({ error: 'Description must be 500 characters or less' });
      }

      const id = generateId();
      const idea: Idea = {
        id,
        title: title.trim(),
        description: (description || '').trim(),
        author: user,
        votes: [user],
        created_at: new Date().toISOString(),
      };

      await store.set(ideaKey(id), idea);
      ids.push(id);
      await setIndex(store, ids);

      res.status(201).json({ id, title: idea.title, description: idea.description, vote_count: idea.votes.length });
    } catch {
      res.status(500).json({ error: 'Failed to create idea' });
    }
  });

  // Vote for an idea (toggle)
  router.post('/:id/vote', async (req: Request, res: Response) => {
    try {
      const user = getUser(req);
      if (!user) {
        return res.status(401).json({ error: 'Authentication required to vote' });
      }

      const idea: Idea | undefined = await store.get(ideaKey(req.params.id));
      if (!idea) {
        return res.status(404).json({ error: 'Idea not found' });
      }

      const index = idea.votes.indexOf(user);
      if (index >= 0) {
        idea.votes.splice(index, 1);
      } else {
        idea.votes.push(user);
      }

      await store.set(ideaKey(idea.id), idea);
      res.json({ vote_count: idea.votes.length, voted: index < 0 });
    } catch {
      res.status(500).json({ error: 'Failed to vote' });
    }
  });

  // Delete an idea (author only)
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const user = getUser(req);
      const idea: Idea | undefined = await store.get(ideaKey(req.params.id));
      if (!idea) {
        return res.status(404).json({ error: 'Idea not found' });
      }
      if (idea.author && idea.author !== user) {
        return res.status(403).json({ error: 'Only the author can delete this idea' });
      }

      await store.delete(ideaKey(idea.id));
      const ids = await getIndex(store);
      await setIndex(store, ids.filter(i => i !== idea.id));

      res.sendStatus(204);
    } catch {
      res.status(500).json({ error: 'Failed to delete idea' });
    }
  });

  return router;
}
