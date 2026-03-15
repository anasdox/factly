import { feedbackRoutes as createFeedbackRoutes } from './feedback-lib';
import { store } from './store';
import { verifyToken } from './auth/jwt';

export const feedbackRoutes = createFeedbackRoutes({
  store,
  getUser: (req) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return null;
    const token = header.slice(7);
    const user = verifyToken(token);
    return user?.username || null;
  },
});
