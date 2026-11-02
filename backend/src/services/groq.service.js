import groq from '../config/groq.js';
import axios from 'axios';

const ILLUSTRATION_PROMPT_SYSTEM = `You output exactly ONE line: a concise English image-generation prompt for a children's book style illustration.
Rules: no gore, horror, weapons, or adult themes; no real people's names; no text or letters in the scene; warm colors; clear focal subject and setting inspired by the student's story and the teacher's setup.
Maximum 60 words. Output only the prompt line, no quotes or explanation.`;

function truncatePrompt(s, maxLen = 400) {
  const t = (s || '').trim().replace(/^["']|["']$/g, '').split('\n')[0];
  return t.length > maxLen ? t.slice(0, maxLen) : t;
}

/**
 * Builds a single safe image prompt from student writing + teacher context (+ optional teacher reference image).
 */
export const buildIllustrationImagePrompt = async ({
  studentText,
  teacherIdeaText,
  teacherImageUrl,
  ageLevel = 8,
}) => {
  const userTextBlock = `Teacher setup and writing directions:\n${teacherIdeaText || '(none)'}\n\nStudent story (age ~${ageLevel}):\n${studentText}`;

  try {
    if (teacherImageUrl) {
      const imageResponse = await axios.get(teacherImageUrl, { responseType: 'arraybuffer', timeout: 20000 });
      const base64Image = Buffer.from(imageResponse.data, 'binary').toString('base64');
      const mimeType = imageResponse.headers['content-type'] || 'image/jpeg';

      const response = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: ILLUSTRATION_PROMPT_SYSTEM },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `${userTextBlock}\n\nUse the teacher's reference image only as visual style and mood hints. Combine with the student's story for one illustration prompt.`,
              },
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${base64Image}` },
              },
            ],
          },
        ],
        model: process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct',
        max_tokens: 200,
        temperature: 0.35,
      });
      return truncatePrompt(response.choices[0].message.content);
    }

    const response = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: ILLUSTRATION_PROMPT_SYSTEM },
        { role: 'user', content: userTextBlock },
      ],
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      max_tokens: 200,
      temperature: 0.35,
    });
    return truncatePrompt(response.choices[0].message.content);
  } catch (err) {
    console.error('buildIllustrationImagePrompt:', err.message);
    return truncatePrompt(
      `Whimsical children's book illustration of: ${(teacherIdeaText || 'adventure').slice(0, 120)}. Scene based on a young student's creative story. Bright, friendly, no text.`
    );
  }
};

export const generateStoryIdea = async (prompt, ageLevel = 8) => {
  try {
    const response = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: `You are a creative story assistant for ${ageLevel}-year-old students. Keep language simple, engaging, and appropriate.` },
        { role: 'user', content: prompt }
      ],
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      temperature: 0.7,
      max_tokens: 300,
    });
    return response.choices[0].message.content;
  } catch (err) {
    console.error('Groq Text Error:', err.message);
    throw new Error('AI was unable to generate a story idea right now.');
  }
};

export const generateHint = async (storyText, ageLevel = 8) => {
  try {
    const response = await groq.chat.completions.create({
      messages: [
        { 
          role: 'system', 
          content: `You are a helpful writing coach for a ${ageLevel}-year-old student. 
          The student is stuck. Look at their story text and give a SHORT (2 sentence) hint on what could happen next. 
          Focus on characters, setting, or a new small action. No spoilers!` 
        },
        { role: 'user', content: `Here is my story so far: "${storyText}"` }
      ],
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      temperature: 0.8,
      max_tokens: 150,
    });
    return response.choices[0].message.content;
  } catch (err) {
    return "Maybe a new character walks in, or a sudden noise surprises everyone?";
  }
};

/**
 * Optional opt-in continuation: one paragraph the student may edit or remove.
 * Distinct from hints (coach suggestions) — this is draft prose appended only when the student asks.
 */
export const expandStudentStorySnippet = async ({
  storySoFar,
  teacherSetup = '',
  ageLevel = 8,
}) => {
  const body = (storySoFar || '').trim().slice(-8000);
  if (body.length < 20) {
    throw new Error('Story text is too short to continue.');
  }
  try {
    const response = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You help a ${ageLevel}-year-old student continue their own creative story.
Write exactly ONE short paragraph (3–6 sentences) that naturally follows their last sentences.
Match characters and voice. Kid-safe, no horror or adult themes. No meta lines ("Here is…"), no title.
Output only the new paragraph, not a recap of what they already wrote.`,
        },
        {
          role: 'user',
          content: `Teacher setup and directions:\n${teacherSetup || '(none)'}\n\nMy story so far:\n${body}\n\nWrite the next paragraph as if I am still the author.`,
        },
      ],
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      temperature: 0.72,
      max_tokens: 400,
    });
    const out = (response.choices[0].message.content || '').trim();
    if (!out) throw new Error('Empty continuation.');
    return out;
  } catch (err) {
    console.error('expandStudentStorySnippet:', err.message);
    if (err.message === 'Empty continuation.' || err.message === 'Story text is too short to continue.') throw err;
    throw new Error('Could not add an AI paragraph right now. Try again in a moment.');
  }
};

export const evaluateStory = async (storyText, rubric, ageLevel = 8) => {
  try {
    const prompt = `
      Evaluate this story written by a ${ageLevel}-year-old student.
      Story Text: "${storyText}"
      
      Return a JSON object with the following structure:
      {
        "score": number (0-100),
        "rubricBreakdown": {
          "creativity": number (0-100),
          "grammar": number (0-100),
          "structure": number (0-100),
          "vocabulary": number (0-100)
        },
        "strengths": [string, string],
        "improvements": [string, string],
        "overallFeedback": string (encouraging and constructive)
      }
      
      Only return the JSON object.
    `;

    const response = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      response_format: { type: 'json_object' },
    });
    
    return JSON.parse(response.choices[0].message.content);
  } catch (err) {
    console.error('Groq Eval Error:', err.message);
    // Simple fallback
    return {
      score: 70,
      rubricBreakdown: { creativity: 70, grammar: 70, structure: 70, vocabulary: 70 },
      strengths: ["Great start!", "Good effort"],
      improvements: ["Try adding more details", "Check your punctuation"],
      overallFeedback: "Great job writing your story! Keep practicing to get even better."
    };
  }
};

const classSummaryFallback = {
  classSummary: 'Insights are temporarily unavailable. Check back after more submissions are in.',
  commonWeaknesses: [],
  suggestions: [],
};

export const generateClassSummaryJson = async (combinedStudentText) => {
  const prompt = `You are an experienced writing teacher. Read these student story excerpts (separated by ---). Return JSON only.

Excerpts:
${combinedStudentText}

Return a JSON object with exactly these keys:
- "classSummary": string, 2-3 sentences for the teacher
- "commonWeaknesses": array of 2-5 short strings (patterns in grammar, vocabulary, or structure)
- "suggestions": array of 2-4 short strings (concrete class activities or teaching moves)

Only return the JSON object, no markdown.`;

  try {
    const response = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      response_format: { type: 'json_object' },
      temperature: 0.5,
      max_tokens: 600,
    });

    const raw = response.choices[0].message.content;
    const parsed = JSON.parse(raw);
    return {
      classSummary: typeof parsed.classSummary === 'string' ? parsed.classSummary : classSummaryFallback.classSummary,
      commonWeaknesses: Array.isArray(parsed.commonWeaknesses) ? parsed.commonWeaknesses : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    };
  } catch (err) {
    console.error('Groq class summary error:', err.message);
    return { ...classSummaryFallback };
  }
};
