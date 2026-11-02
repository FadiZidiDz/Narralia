import * as groqService from '../services/groq.service.js';
import * as visionService from '../services/vision.service.js';
import * as ltService from '../services/languageTool.service.js';
import Submission from '../models/Submission.model.js';
import Feedback from '../models/Feedback.model.js';

export const analyzeImage = async (req, res) => {
  const { imageUrl, ageLevel } = req.body;
  try {
    const continuation = await visionService.analyzeImageAndContinue(imageUrl, ageLevel);
    res.json({ continuation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const generateHint = async (req, res) => {
  const { text, ageLevel } = req.body;
  try {
    const hint = await groqService.generateHint(text, ageLevel);
    res.json({ hint });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** Student opt-in: append one AI-written paragraph (editable in the client). */
export const expandStorySnippet = async (req, res) => {
  const { text, teacherSetup, ageLevel } = req.body;
  if (!text || typeof text !== 'string' || text.trim().length < 20) {
    return res.status(400).json({ error: 'Write more of your story before asking for a continuation.' });
  }
  try {
    const snippet = await groqService.expandStudentStorySnippet({
      storySoFar: text,
      teacherSetup: typeof teacherSetup === 'string' ? teacherSetup : '',
      ageLevel: ageLevel != null ? Number(ageLevel) : 8,
    });
    res.json({ snippet });
  } catch (err) {
    const status = err.message?.includes('too short') ? 400 : 500;
    res.status(status).json({ error: err.message });
  }
};

export const checkGrammar = async (req, res) => {
  const { text } = req.body;
  try {
    const matches = await ltService.checkGrammar(text);
    res.json({ matches });
  } catch (err) {
    res.json({ matches: [] }); // Silent fail
  }
};

/**
 * Teacher Route: Get class summary (aggregate insights from all submissions)
 */
export const getClassSummary = async (req, res) => {
  try {
    const submissions = await Submission.find({ status: 'submitted' }).limit(20);
    if (submissions.length === 0) {
      return res.json({
        classSummary: 'No submissions yet to analyze.',
        commonWeaknesses: [],
        suggestions: [],
      });
    }

    const combinedText = submissions.map((s) => s.writtenText || '').join('\n---\n');
    const summary = await groqService.generateClassSummaryJson(combinedText);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: 'Could not generate summary.' });
  }
};

export const saveFeedback = async (req, res) => {
  const { submissionId, comment, score } = req.body;
  try {
    const feedback = await Feedback.create({
      submissionId,
      teacherId: req.user.id,
      comment,
      score
    });

    await Submission.findByIdAndUpdate(submissionId, { status: 'reviewed' });
    res.status(201).json({ feedback });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
