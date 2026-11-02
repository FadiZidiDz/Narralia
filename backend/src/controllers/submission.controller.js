import Submission from '../models/Submission.model.js';
import Feedback from '../models/Feedback.model.js';
import * as groqService from '../services/groq.service.js';
import { persistStudentIllustration } from '../services/illustrationStorage.service.js';

export const getMySubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({ studentId: req.user.id })
      .populate('storyId', 'title')
      .populate('storyPartId', 'title order')
      .sort({ updatedAt: -1 });
    res.json({ submissions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getSubmissionById = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('studentId', 'name')
      .populate('storyId', 'title')
      .populate('storyPartId', 'title order text writingPrompt imageUrl');
    res.json({ submission });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.find({ submissionId: req.params.id })
      .populate('teacherId', 'name');
    res.json({ feedback });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Auto-save text as draft
 */
export const saveText = async (req, res) => {
  const { submissionId, text } = req.body;
  try {
    const sub = await Submission.findOneAndUpdate(
      { _id: submissionId, studentId: req.user.id },
      { writtenText: text, updatedAt: Date.now() },
      { new: true, upsert: false }
    );
    res.json({ submission: sub });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Finalize and Evaluate
 */
export const submitStory = async (req, res) => {
  const { submissionId } = req.body;
  try {
    const sub = await Submission.findOne({ _id: submissionId, studentId: req.user.id });
    if (!sub) return res.status(404).json({ error: 'Submission not found' });

    // AI Evaluation
    const evaluation = await groqService.evaluateStory(sub.writtenText, {}, req.user.ageLevel);
    
    sub.status = 'submitted';
    sub.essaiResult = evaluation;
    await sub.save();

    res.json({ submission: sub });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Create or get a submission for a specific story part
 */
export const startSubmission = async (req, res) => {
  const { storyId, storyPartId } = req.body;
  try {
    let sub = await Submission.findOne({ 
      studentId: req.user.id, 
      storyId, 
      storyPartId 
    });

    if (!sub) {
      sub = await Submission.create({
        studentId: req.user.id,
        storyId,
        storyPartId
      });
    }

    res.status(sub.isNew ? 201 : 200).json({ submission: sub });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const MIN_STORY_CHARS_FOR_ILLUSTRATION = 50;

/**
 * Student: generate illustration from their written text (Cloudinary, Pollinations URL, or local file — see ILLUSTRATION_STORAGE).
 */
export const generateIllustration = async (req, res) => {
  const { id } = req.params;
  const force = req.query.force === '1';
  const overrideText = req.body?.text;

  try {
    const sub = await Submission.findOne({ _id: id, studentId: req.user.id }).populate('storyPartId');
    if (!sub) return res.status(404).json({ error: 'Submission not found' });

    if (typeof overrideText === 'string' && overrideText.trim().length > 0) {
      sub.writtenText = overrideText;
      await sub.save();
    }

    if (!sub.writtenText || sub.writtenText.trim().length < MIN_STORY_CHARS_FOR_ILLUSTRATION) {
      return res.status(400).json({
        error: `Write at least ${MIN_STORY_CHARS_FOR_ILLUSTRATION} characters before generating an illustration.`,
      });
    }

    if (sub.generatedImageUrl && !force) {
      return res.json({ submission: sub, imageUrl: sub.generatedImageUrl });
    }

    const part = sub.storyPartId;
    if (!part) return res.status(400).json({ error: 'Story part missing for this submission.' });

    const teacherIdeaText = [part.text, part.writingPrompt].filter(Boolean).join('\n\n');
    const imagePrompt = await groqService.buildIllustrationImagePrompt({
      studentText: sub.writtenText,
      teacherIdeaText,
      teacherImageUrl: part.imageUrl || null,
      ageLevel: req.user.ageLevel ?? 8,
    });

    const { url: imageUrl } = await persistStudentIllustration(imagePrompt);

    sub.generatedImageUrl = imageUrl;
    await sub.save();

    res.json({ submission: sub, imageUrl });
  } catch (err) {
    console.error('generateIllustration:', err.message);
    const raw = err.message || '';
    const storage = (process.env.ILLUSTRATION_STORAGE || 'pollinations-url').toLowerCase();
    const cloudinaryMisconfig =
      storage === 'cloudinary' &&
      /cloud_name|Invalid cloud_name|api_secret|api_key|401|Cloudinary/i.test(raw);
    const error = cloudinaryMisconfig
      ? 'Cloudinary credentials are wrong or missing. In .env set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET exactly as shown under Product environment credentials in the Cloudinary console (cloud name is not a folder name like "Root"). Restart the backend after saving.'
      : raw || 'Could not generate illustration.';
    res.status(500).json({ error });
  }
};
