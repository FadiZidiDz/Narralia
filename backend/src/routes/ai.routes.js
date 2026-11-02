import express from 'express';
import { 
  analyzeImage, 
  generateHint, 
  expandStorySnippet,
  checkGrammar, 
  getClassSummary,
  saveFeedback
} from '../controllers/ai.controller.js';
import { protect, restrictTo } from '../middleware/auth.middleware.js';
import { aiLimiter } from '../middleware/rateLimiter.middleware.js';

const router = express.Router();

router.post('/image-analyze', protect, aiLimiter, analyzeImage);
router.post('/hint', protect, aiLimiter, generateHint);
router.post('/expand-snippet', protect, aiLimiter, expandStorySnippet);
router.post('/check-grammar', protect, checkGrammar);

// Teacher only
router.get('/class-summary', protect, restrictTo('teacher'), getClassSummary);
router.post('/feedback', protect, restrictTo('teacher'), saveFeedback);

export default router;
