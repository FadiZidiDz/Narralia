import Story from '../models/Story.model.js';
import StoryPart from '../models/StoryPart.model.js';
import Submission from '../models/Submission.model.js';
import Feedback from '../models/Feedback.model.js';
import { uploadImage } from '../services/cloudinary.service.js';
import { parseVocabularyExcel } from '../services/excelParser.service.js';

export const getAllStories = async (req, res) => {
  try {
    const stories = await Story.find().sort({ createdAt: -1 });
    res.json({ stories });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getStoryById = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    const parts = await StoryPart.find({ storyId: req.params.id }).sort({ order: 1 });
    res.json({ story, parts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getStoryPart = async (req, res) => {
  try {
    const part = await StoryPart.findById(req.params.partId);
    res.json({ part });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Teacher Route: Create a new story
 */
export const createStory = async (req, res) => {
  try {
    const story = await Story.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json({ story });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const STORY_THEMES = ['adventure', 'fantasy', 'science', 'friendship', 'nature', 'animals'];

/**
 * Teacher: update story metadata (title, description, theme, ageLevel).
 */
export const updateStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    const { title, description, theme, ageLevel } = req.body;

    if (title !== undefined) {
      const trimmed = String(title).trim();
      if (!trimmed) {
        return res.status(400).json({ error: 'Title is required.' });
      }
      story.title = trimmed;
    }

    if (description !== undefined) {
      story.description = String(description).trim();
    }

    if (theme !== undefined) {
      if (!STORY_THEMES.includes(theme)) {
        return res.status(400).json({ error: 'Invalid theme.' });
      }
      story.theme = theme;
    }

    if (ageLevel !== undefined) {
      const age = Number(ageLevel);
      if (!Number.isFinite(age) || age < 5 || age > 18) {
        return res.status(400).json({ error: 'Age level must be between 5 and 18.' });
      }
      story.ageLevel = age;
    }

    await story.save();
    res.json({ story });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Teacher Route: Add a part to a story (with image upload)
 */
export const addStoryPart = async (req, res) => {
  try {
    let imageUrl = '';
    if (req.file) {
      const result = await uploadImage(req.file.buffer);
      imageUrl = result.secure_url;
    }

    const part = await StoryPart.create({
      ...req.body,
      storyId: req.params.id,
      imageUrl
    });
    res.status(201).json({ part });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Teacher: replace image on an existing story part (Cloudinary).
 */
export const updatePartImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    const part = await StoryPart.findOne({
      _id: req.params.partId,
      storyId: req.params.id,
    });
    if (!part) {
      return res.status(404).json({ error: 'Story part not found' });
    }

    const result = await uploadImage(req.file.buffer);
    part.imageUrl = result.secure_url;
    await part.save();

    res.json({ imageUrl: part.imageUrl, part });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const EXCEL_EXTENSIONS = new Set(['.xlsx', '.xls']);

/**
 * Teacher: upload vocabulary Excel for a story (parsed into story.vocabulary).
 */
export const uploadStoryVocabulary = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Excel file is required (.xlsx or .xls).' });
    }

    const ext = (req.file.originalname || '').toLowerCase().match(/\.[^.]+$/)?.[0] || '';
    if (!EXCEL_EXTENSIONS.has(ext)) {
      return res.status(400).json({ error: 'Only .xlsx and .xls files are supported.' });
    }

    const story = await Story.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    const { rows, truncated, message } = parseVocabularyExcel(req.file.buffer);

    story.vocabulary = rows;
    story.vocabularyFileName = req.file.originalname || 'vocabulary.xlsx';
    story.vocabularyUpdatedAt = new Date();
    await story.save();

    res.json({
      story,
      rowCount: rows.length,
      truncated: !!truncated,
      message: message || null,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * Teacher: remove vocabulary from a story.
 */
export const deleteStoryVocabulary = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    story.vocabulary = [];
    story.vocabularyFileName = undefined;
    story.vocabularyUpdatedAt = undefined;
    await story.save();

    res.json({ story });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Teacher: delete a story and its parts, submissions, and feedback.
 */
export const deleteStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    const submissions = await Submission.find({ storyId: req.params.id }).select('_id');
    const submissionIds = submissions.map((s) => s._id);

    if (submissionIds.length > 0) {
      await Feedback.deleteMany({ submissionId: { $in: submissionIds } });
      await Submission.deleteMany({ storyId: req.params.id });
    }

    await StoryPart.deleteMany({ storyId: req.params.id });
    await Story.findByIdAndDelete(req.params.id);

    res.json({ message: 'Story deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
