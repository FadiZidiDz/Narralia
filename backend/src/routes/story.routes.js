import express from 'express';
import multer from 'multer';
import { 
  getAllStories, 
  getStoryById, 
  getStoryPart, 
  createStory, 
  updateStory,
  addStoryPart,
  updatePartImage,
  uploadStoryVocabulary,
  deleteStoryVocabulary,
  deleteStory,
} from '../controllers/story.controller.js';
import { protect, restrictTo } from '../middleware/auth.middleware.js';

const router = express.Router();
const upload = multer({ limits: { fileSize: 4 * 1024 * 1024 } }); // 4MB limit
const uploadExcel = multer({ limits: { fileSize: 2 * 1024 * 1024 } }); // 2MB for vocabulary

router.get('/', protect, getAllStories);
router.get('/part/:partId', protect, getStoryPart);
router.get('/:id', protect, getStoryById);

// Teacher only
router.post('/', protect, restrictTo('teacher'), createStory);
router.put('/:id', protect, restrictTo('teacher'), updateStory);
router.delete('/:id', protect, restrictTo('teacher'), deleteStory);
router.post(
  '/:id/vocabulary',
  protect,
  restrictTo('teacher'),
  uploadExcel.single('file'),
  uploadStoryVocabulary
);
router.delete(
  '/:id/vocabulary',
  protect,
  restrictTo('teacher'),
  deleteStoryVocabulary
);
router.put(
  '/:id/parts/:partId/image',
  protect,
  restrictTo('teacher'),
  upload.single('image'),
  updatePartImage
);
router.post('/:id/part', protect, restrictTo('teacher'), upload.single('image'), addStoryPart);

export default router;
