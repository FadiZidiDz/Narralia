import express from 'express';
import { 
  getMySubmissions, 
  getSubmissionById, 
  getFeedback,
  saveText, 
  submitStory,
  startSubmission,
  generateIllustration,
} from '../controllers/submission.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { writingLimiter, illustrationLimiter } from '../middleware/rateLimiter.middleware.js';

const router = express.Router();

router.get('/my', protect, getMySubmissions);
router.post('/start', protect, startSubmission);
router.post('/save', protect, writingLimiter, saveText);
router.post('/finalize', protect, submitStory);
router.post('/:id/generate-illustration', protect, illustrationLimiter, generateIllustration);
router.get('/:id/feedback', protect, getFeedback);
router.get('/:id', protect, getSubmissionById);

export default router;
