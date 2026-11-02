import groq from '../config/groq.js';
import axios from 'axios';

/**
 * Fetches an image from a URL, converts it to base64, 
 * and sends it to Groq Llama 4 Scout for narrative analysis.
 */
export const analyzeImageAndContinue = async (imageUrl, ageLevel = 8) => {
  try {
    // 1. Download image and convert to base64
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const base64Image = Buffer.from(imageResponse.data, 'binary').toString('base64');
    const mimeType = imageResponse.headers['content-type'] || 'image/jpeg';

    // 2. Call Groq Vision (Llama 4 Scout)
    const response = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: [
            { 
              type: 'text', 
              text: `You are a story-telling AI for ${ageLevel}-year-old students. 
              Look at this image provided by the teacher and write a simple, 
              exciting opening paragraph (3-4 sentences) that continues the story 
              based on what you see in the image.` 
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      model: process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct',
      max_tokens: 300,
    });

    return response.choices[0].message.content;
  } catch (err) {
    console.error('Vision AI Error:', err.message);
    throw new Error('AI was unable to "see" the image right now. Please try writing your own opening!');
  }
};
